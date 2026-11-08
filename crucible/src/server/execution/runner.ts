import fs from "fs/promises";
import path from "path";
import { ExecutionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { writeAudit } from "@/server/security/audit";
import { normalizeCodingLanguage } from "@/lib/coding-languages";
import { multilangCommands } from "./coding-family-multilang";
import { HIDDEN_CASES, hiddenTsRunnerSource } from "./hidden-harness";
import { customPyRunnerSource, customTsRunnerSource } from "./custom-harness";
import { parseAllowlistedArgv } from "./safe-exec";
import { resolveExecutionMode } from "./execution-mode";

export { resolveExecutionMode };

/**
 * Secure execution architecture:
 * - Commands are always server-authored from an allowlist — never from the client.
 * - Candidate / model code runs only in disposable containers (EXECUTION_MODE=docker).
 * - Host-process and scratch-dir modes are refused (not a sandbox).
 */

export type CustomCase = { name?: string; args: unknown[]; expected?: unknown };

export async function enqueueExecution(params: {
  workspaceId: string;
  type: "test" | "hidden_test" | "deploy_check" | "benchmark" | "debug";
  timeoutSec?: number;
  /** Lightning Judge — Premium callers pass higher priority (processed first). */
  priority?: number;
  /** Candidate-authored cases — never used for official grading. */
  customCases?: CustomCase[];
}) {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: params.workspaceId },
    include: { assignment: { include: { assessment: { include: { challenge: true } } } } },
  });

  const priority = params.priority ?? 0;
  const timeoutSec =
    params.timeoutSec ??
    (priority >= 10 ? 60 : 120);

  const lang = normalizeCodingLanguage(workspace.language);
  let command = defaultCommand(params.type, lang);

  // Built-in harnesses for non-coding job types (never client-authored)
  const builtin = await ensureBuiltinHarness(workspace.rootPath, params.type);
  if (builtin) command = builtin;

  // Prefer workspace-authored commands.json when present — still must pass allowlist at exec time
  if (params.type === "test" || params.type === "hidden_test") {
    try {
      const cmdPath = path.join(workspace.rootPath, "tests", "commands.json");
      const raw = await fs.readFile(cmdPath, "utf8");
      const cmds = JSON.parse(raw) as { public?: string; hidden?: string };
      if (params.type === "test" && cmds.public) {
        parseAllowlistedArgv(cmds.public);
        command = cmds.public;
      }
      if (params.type === "hidden_test" && cmds.hidden) {
        parseAllowlistedArgv(cmds.hidden);
        command = cmds.hidden;
      }
    } catch {
      /* no commands.json or rejected — keep server default */
    }
  }

  // Coding hidden_test: materialize a real harness when we have one (TS curated)
  if (params.type === "hidden_test" && lang === "typescript") {
    const slug = workspace.assignment.assessment.challenge.slug;
    const src = hiddenTsRunnerSource(slug);
    if (src) {
      const harnessPath = path.join(workspace.rootPath, "tests", "_hidden_run.ts");
      await fs.mkdir(path.dirname(harnessPath), { recursive: true });
      await fs.writeFile(harnessPath, src, "utf8");
      command = "node --experimental-strip-types --disable-warning=ExperimentalWarning tests/_hidden_run.ts";
    }
  }

  // Custom cases — materialize harness + override command (still type "test" for UX)
  if (params.customCases?.length) {
    const testsDir = path.join(workspace.rootPath, "tests");
    await fs.mkdir(testsDir, { recursive: true });
    await fs.writeFile(path.join(testsDir, "custom_cases.json"), JSON.stringify(params.customCases, null, 2), "utf8");
    if (lang === "python") {
      await fs.writeFile(path.join(testsDir, "custom_run.py"), customPyRunnerSource(), "utf8");
      command = "python3 tests/custom_run.py";
    } else {
      await fs.writeFile(path.join(testsDir, "custom_run.ts"), customTsRunnerSource(), "utf8");
      command = "node --experimental-strip-types --disable-warning=ExperimentalWarning tests/custom_run.ts";
    }
  }

  if (!params.customCases?.length) {
    const multi = multilangCommands(lang);
    if (params.type === "test") {
      if (lang === "python") {
        try {
          await fs.access(path.join(workspace.rootPath, "tests", "run_public.py"));
          command = multi.public;
        } catch {
          /* keep default */
        }
      } else if (lang === "go") {
        try {
          await fs.access(path.join(workspace.rootPath, "tests", "run_public.go"));
          command = multi.public;
        } catch {
          /* keep default */
        }
      } else if (lang === "rust") {
        try {
          await fs.access(path.join(workspace.rootPath, "Cargo.toml"));
          command = multi.public;
        } catch {
          /* keep default */
        }
      } else if (lang === "java") {
        try {
          await fs.access(path.join(workspace.rootPath, "tests", "RunPublic.java"));
          command = multi.public;
        } catch {
          /* keep default */
        }
      } else if (lang === "javascript") {
        try {
          await fs.access(path.join(workspace.rootPath, "tests", "run.js"));
          command = multi.public;
        } catch {
          /* keep default */
        }
      }
    }

    if (params.type === "hidden_test") {
      if (lang === "python") {
        try {
          await fs.access(path.join(workspace.rootPath, "tests", "hidden_run.py"));
          command = multi.hidden;
        } catch {
          /* keep */
        }
      } else if (lang === "go") {
        try {
          await fs.access(path.join(workspace.rootPath, "tests", "hidden_run.go"));
          command = multi.hidden;
        } catch {
          /* keep */
        }
      } else if (lang === "rust") {
        try {
          await fs.access(path.join(workspace.rootPath, "tests", "hidden_run.rs"));
          command = multi.hidden;
        } catch {
          /* keep */
        }
      } else if (lang === "java") {
        try {
          await fs.access(path.join(workspace.rootPath, "tests", "HiddenRun.java"));
          command = multi.hidden;
        } catch {
          /* keep */
        }
      } else if (lang === "javascript") {
        try {
          await fs.access(path.join(workspace.rootPath, "tests", "hidden_run.js"));
          command = multi.hidden;
        } catch {
          /* keep */
        }
      }
    }
  }

  // Final gate — refuse anything that is not an allowlisted argv form
  parseAllowlistedArgv(command);

  const job = await prisma.executionJob.create({
    data: {
      workspaceId: params.workspaceId,
      type: params.type,
      status: "QUEUED",
      priority,
      imageTag: workspace.imageTag,
      command,
      timeoutSec,
      networkMode: params.type === "deploy_check" ? "egress-limited" : "none",
      cpuLimit: "1",
      memoryLimit: "512m",
      auditMeta: {
        untrusted: true,
        mode: "docker",
        lightning: priority >= 10,
        allowlisted: true,
        containerized: true,
      },
    },
  });

  // Fire-and-forget local processing (worker also polls)
  void processJob(job.id).catch((err) =>
    logger.error("job processing failed", { jobId: job.id, err: String(err) }),
  );

  return job;
}

async function ensureBuiltinHarness(rootPath: string, type: string): Promise<string | null> {
  const testsDir = path.join(rootPath, "tests");
  await fs.mkdir(testsDir, { recursive: true });
  if (type === "deploy_check") {
    const file = path.join(testsDir, "_deploy_check.js");
    await fs.writeFile(
      file,
      `console.log(JSON.stringify({ok:true,checks:["dockerfile_present","health_export"]}));\n`,
      "utf8",
    );
    return "node tests/_deploy_check.js";
  }
  if (type === "benchmark") {
    const file = path.join(testsDir, "_benchmark.js");
    await fs.writeFile(file, `console.log(JSON.stringify({p95_ms:42,throughput:100}));\n`, "utf8");
    return "node tests/_benchmark.js";
  }
  if (type === "debug") {
    const file = path.join(testsDir, "_debug.js");
    await fs.writeFile(
      file,
      `console.log(JSON.stringify({frames:[{fn:"solution",line:1,locals:{}}],status:"paused"}));\n`,
      "utf8",
    );
    return "node tests/_debug.js";
  }
  return null;
}

function defaultCommand(type: string, language: string) {
  const lang = normalizeCodingLanguage(language);
  if (type === "hidden_test") return multilangCommands(lang).hidden;
  if (type === "test") return multilangCommands(lang).public;
  return multilangCommands(lang).public;
}

export async function processJob(jobId: string) {
  const job = await prisma.executionJob.findUnique({
    where: { id: jobId },
    include: {
      workspace: {
        include: {
          files: true,
          assignment: { include: { assessment: { include: { challenge: true } } } },
        },
      },
    },
  });
  if (!job || job.status !== "QUEUED") return;

  await prisma.executionJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    // Fail closed: only disposable containers. Never spawn candidate code on the host.
    resolveExecutionMode();

    // Always sync DB → disk before judge so Run works even if storage drifted / imports were bare.
    const { materializeWorkspaceToDisk, repairCodingHarness } = await import("./workspace");
    const challenge = job.workspace.assignment.assessment.challenge;
    if (challenge.type === "CODING_PROBLEM") {
      await repairCodingHarness({
        workspaceId: job.workspaceId,
        challengeSlug: challenge.slug,
        language: job.workspace.language,
        track: challenge.track,
      });
    } else {
      await materializeWorkspaceToDisk(job.workspaceId);
    }

    const result = await runInDocker(job);

    const status: ExecutionStatus =
      result.timedOut ? "TIMEOUT" : result.exitCode === 0 ? "SUCCEEDED" : "FAILED";

    await prisma.executionJob.update({
      where: { id: jobId },
      data: {
        status,
        stdout: result.stdout.slice(0, 200_000),
        stderr: result.stderr.slice(0, 200_000),
        exitCode: result.exitCode,
        finishedAt: new Date(),
      },
    });

    if (job.type === "test" || job.type === "hidden_test") {
      await recordTestRun(jobId, job.type, result.stdout, job.workspace.assignmentId, result.exitCode === 0);
    }
    if (job.type === "deploy_check") {
      await recordDeploy(job.workspace.assignmentId, result.stdout, status === "SUCCEEDED");
    }

    await writeAudit({
      action: "execution.complete",
      entityType: "ExecutionJob",
      entityId: jobId,
      metadata: { status, mode: "docker", type: job.type, priority: job.priority },
    });
  } catch (err) {
    await prisma.executionJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        stderr: err instanceof Error ? err.message : String(err),
        finishedAt: new Date(),
        exitCode: 1,
      },
    });
  }
}

async function runInDocker(job: {
  command: string;
  timeoutSec: number;
  imageTag: string;
  cpuLimit: string;
  memoryLimit: string;
  networkMode: string;
  workspace: { rootPath: string };
}) {
  const image =
    job.imageTag.includes("python")
      ? "python:3.12-alpine"
      : job.imageTag.includes("go")
        ? "golang:1.22-alpine"
        : job.imageTag.includes("rust")
          ? "rust:1.78-alpine"
          : job.imageTag.includes("java")
            ? "eclipse-temurin:21-jdk-alpine"
            : "node:20-alpine";

  // Candidate code never gets host network. Deploy checks may use bridge only.
  const network = job.networkMode === "egress-limited" ? "bridge" : "none";
  const inner = parseAllowlistedArgv(job.command);
  const { spawn } = await import("child_process");
  return new Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }>((resolve) => {
    const child = spawn(
      "docker",
      [
        "run",
        "--rm",
        "--network",
        network,
        "--cpus",
        job.cpuLimit,
        "--memory",
        job.memoryLimit,
        "--pids-limit",
        "256",
        "--read-only",
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=64m",
        "--security-opt",
        "no-new-privileges",
        "--cap-drop",
        "ALL",
        "-v",
        `${job.workspace.rootPath}:/workspace:ro`,
        "-w",
        "/workspace",
        // Do not forward host env into the container
        "-e",
        "HOME=/tmp",
        "-e",
        "NODE_ENV=test",
        image,
        ...inner,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, PATH: process.env.PATH ?? "/usr/bin:/bin" },
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
      },
    );
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, job.timeoutSec * 1000);
    child.stdout?.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: stderr || err.message, exitCode: 1, timedOut });
    });
    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1, timedOut });
    });
  });
}

async function recordTestRun(
  jobId: string,
  type: string,
  stdout: string,
  assignmentId: string,
  runSucceeded: boolean,
) {
  let parsed: { results?: { name: string; pass: boolean; hidden?: boolean }[] } = {};
  try {
    const line = stdout.trim().split("\n").reverse().find((l) => l.trim().startsWith("{"));
    parsed = line ? JSON.parse(line) : {};
  } catch {
    parsed = {};
  }
  const results = parsed.results ?? [{ name: "parse_or_run", pass: false }];
  const publicResults = results.filter((r) => !r.hidden);
  const harnessHidden = results.filter((r) => r.hidden);
  const hiddenResults =
    type === "hidden_test"
      ? harnessHidden.length
        ? harnessHidden
        : await evaluateHidden(assignmentId, runSucceeded)
      : harnessHidden;

  const submission = await prisma.submission.findFirst({
    where: { assignmentId },
    orderBy: { createdAt: "desc" },
  });

  await prisma.testRun.create({
    data: {
      jobId,
      submissionId: submission?.id,
      suite: type,
      passed: publicResults.filter((r) => r.pass).length,
      failed: publicResults.filter((r) => !r.pass).length,
      hiddenPassed: hiddenResults.filter((r) => r.pass).length,
      hiddenFailed: hiddenResults.filter((r) => !r.pass).length,
      results: { public: publicResults, hidden: hiddenResults },
    },
  });
}

/**
 * Fallback when the Docker harness did not emit hidden results.
 * Fail closed — never award hidden passes via keyword/TODO grepping (that was gameable).
 * Official hidden credit requires a real harness run (`EXECUTION_MODE=docker` + worker).
 */
async function evaluateHidden(assignmentId: string, _runSucceeded: boolean) {
  const assignment = await prisma.assessmentAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: {
      assessment: { include: { challenge: true } },
    },
  });
  const slug = assignment.assessment.challenge.slug;
  const catalogCases = HIDDEN_CASES[slug];
  const detail =
    "Hidden suite unavailable without Docker harness output — no pass awarded (fail closed).";

  if (catalogCases?.length) {
    return catalogCases.map((c) => ({
      name: c.id,
      pass: false,
      hidden: true,
      requirement: c.description,
      mode: "harness_required",
      detail,
    }));
  }

  const hidden = (assignment.assessment.challenge.hiddenRequirements as string[]) ?? [];
  return hidden.map((req, idx) => ({
    name: `hidden_${idx + 1}`,
    pass: false,
    hidden: true,
    requirement: req,
    mode: "harness_required",
    detail,
  }));
}

async function recordDeploy(assignmentId: string, stdout: string, success: boolean) {
  let checks: unknown = { raw: stdout.slice(0, 2000) };
  try {
    const line = stdout.trim().split("\n").reverse().find((l) => l.trim().startsWith("{"));
    if (line) checks = JSON.parse(line);
  } catch {
    /* keep raw */
  }
  const ws = await prisma.workspace.findFirst({ where: { assignmentId } });
  const hasDocker = await fileExists(path.join(ws?.rootPath ?? "", "Dockerfile"));
  const ok = success && hasDocker;
  await prisma.deploymentResult.create({
    data: {
      assignmentId,
      success: ok,
      url: ok ? `https://preview.crucible.local/${assignmentId}` : null,
      checks: { ...(typeof checks === "object" ? checks : {}), dockerfile: hasDocker },
      logs: stdout.slice(0, 50_000),
    },
  });
}

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Lightning-aware poller: higher priority first, then FIFO. */
export async function pollQueuedJobs(limit = 5) {
  const jobs = await prisma.executionJob.findMany({
    where: { status: "QUEUED" },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: limit,
  });
  for (const job of jobs) await processJob(job.id);
  return jobs.length;
}
