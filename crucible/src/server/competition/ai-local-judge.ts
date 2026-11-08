import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { codingStarterFiles } from "@/server/execution/coding-starters";
import { familyHarnessForSlug, familyTsFiles } from "@/server/execution/coding-family-harness";
import { hiddenTsRunnerSource } from "@/server/execution/hidden-harness";
import { resolveExecutionMode } from "@/server/execution/execution-mode";

export type SuiteResult = {
  passed: number;
  total: number;
  runtimeMs: number;
  firstFailure?: string;
  category?: "accepted" | "wrong_answer" | "runtime_error" | "compile_error" | "time_limit";
};

/** Whether this challenge has a TypeScript harness for AI vs Human. */
export function canJudgeAiSlug(slug: string): boolean {
  if (familyHarnessForSlug(slug)) return true;
  if (slug.startsWith("lc-") && codingStarterFiles(slug, "typescript", "SOFTWARE_ENGINEERING")) return true;
  return false;
}

/**
 * Run TypeScript public + hidden harnesses against model code inside Docker.
 * Host-process judging is refused — same rule as candidate workspaces.
 */
export async function judgeAiTypescript(slug: string, code: string): Promise<{
  public: SuiteResult;
  hidden: SuiteResult;
}> {
  resolveExecutionMode();
  const prepared = prepareSolution(code, slug);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `crucible-ai-${slug.slice(0, 24)}-`));
  try {
    await materializeWorkspace(root, slug, prepared);
    const publicRes = await runDockerSuite(root, "tests/run.ts", 20_000);
    const hiddenFile = path.join(root, "tests/hidden_run.ts");
    let hiddenRes: SuiteResult = { passed: 0, total: 0, runtimeMs: 0 };
    try {
      await fs.access(hiddenFile);
      hiddenRes = await runDockerSuite(root, "tests/hidden_run.ts", 30_000);
    } catch {
      /* no hidden runner for this slug */
    }
    return { public: publicRes, hidden: hiddenRes };
  } finally {
    await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  }
}

function prepareSolution(raw: string, slug: string): string {
  let code = raw.trim();
  const fence = code.match(/^```(?:typescript|ts|javascript|js)?\s*([\s\S]*?)```$/i);
  if (fence) code = fence[1]!.trim();

  const needed = detectRequiredExports(slug);
  const exported = new Set(
    [...code.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g)].map((m) => m[1]!),
  );
  for (const m of code.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1]!.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) exported.add(name);
    }
  }

  const aliases: string[] = [];
  for (const need of needed) {
    if (exported.has(need)) continue;
    if (exported.has("solve") && need !== "solve") {
      aliases.push(`export { solve as ${need} };`);
      continue;
    }
    if (need === "solve") {
      const named = [...exported].find((n) => n !== "solve" && /^[a-z]/.test(n));
      if (named) aliases.push(`export { ${named} as solve };`);
    }
  }
  if (aliases.length) code = `${code}\n\n// Crucible judge aliases\n${aliases.join("\n")}\n`;
  return code;
}

function detectRequiredExports(slug: string): string[] {
  const sources: string[] = [];
  const family = familyHarnessForSlug(slug);
  if (family) sources.push(family.publicTests, family.hiddenRunner);
  const files = codingStarterFiles(slug, "typescript", "SOFTWARE_ENGINEERING") ?? [];
  for (const f of files) {
    if (f.path.includes("test") || f.path.includes("hidden")) sources.push(f.content);
  }
  const hidden = hiddenTsRunnerSource(slug);
  if (hidden) sources.push(hidden);

  const names = new Set<string>();
  for (const src of sources) {
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'][^"']*solution/g)) {
      for (const part of m[1]!.split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0]?.trim();
        if (name && name !== "type" && !name.startsWith("type ")) names.add(name.replace(/^type\s+/, ""));
      }
    }
  }
  if (!names.size) names.add("solve");
  return [...names].filter((n) => n && n !== "TreeNode");
}

async function materializeWorkspace(root: string, slug: string, solutionCode: string) {
  const family = familyHarnessForSlug(slug);
  let files =
    codingStarterFiles(slug, "typescript", "SOFTWARE_ENGINEERING") ??
    (family ? familyTsFiles(slug, family) : null);
  if (!files) throw new Error(`No TypeScript harness for ${slug}`);

  const hidden = hiddenTsRunnerSource(slug);
  const hasHidden = files.some((f) => f.path === "tests/hidden_run.ts");
  if (hidden && !hasHidden) {
    files = [...files, { path: "tests/hidden_run.ts", content: hidden, language: "typescript" }];
  }
  if (!files.some((f) => f.path === "package.json")) {
    files = [
      ...files,
      {
        path: "package.json",
        content: JSON.stringify({ name: slug, private: true, type: "module" }),
        language: "json",
      },
    ];
  }

  for (const f of files) {
    const full = path.join(root, f.path);
    await fs.mkdir(path.dirname(full), { recursive: true });
    const content = f.path === "src/solution.ts" ? solutionCode : f.content;
    await fs.writeFile(full, content, "utf8");
  }
  await fs.mkdir(path.join(root, "src"), { recursive: true });
  await fs.writeFile(path.join(root, "src/solution.ts"), solutionCode, "utf8");
}

function runDockerSuite(root: string, rel: string, timeoutMs: number): Promise<SuiteResult> {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(
      "docker",
      [
        "run",
        "--rm",
        "--network",
        "none",
        "--cpus",
        "1",
        "--memory",
        "512m",
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
        `${root}:/workspace:ro`,
        "-w",
        "/workspace",
        "-e",
        "HOME=/tmp",
        "-e",
        "NODE_ENV=test",
        "node:20-alpine",
        "node",
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        rel,
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
    }, timeoutMs);
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({
        passed: 0,
        total: 1,
        runtimeMs: Date.now() - started,
        firstFailure: err.message.slice(0, 240),
        category: "runtime_error",
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const runtimeMs = Date.now() - started;
      if (timedOut) {
        resolve({
          passed: 0,
          total: 1,
          runtimeMs,
          firstFailure: "Time limit exceeded",
          category: "time_limit",
        });
        return;
      }
      const parsed = parseResultsJson(stdout);
      if (!parsed) {
        const compile =
          /SyntaxError|TypeError|Cannot find|ERR_MODULE_NOT_FOUND|Unexpected/i.test(stderr) ||
          /SyntaxError|TypeError|Cannot find/i.test(stdout);
        resolve({
          passed: 0,
          total: 1,
          runtimeMs,
          firstFailure: (stderr || stdout || `exit ${code}`).slice(0, 240),
          category: compile ? "compile_error" : "runtime_error",
        });
        return;
      }
      const total = parsed.length;
      const passed = parsed.filter((r) => r.pass).length;
      const fail = parsed.find((r) => !r.pass);
      resolve({
        passed,
        total: Math.max(1, total),
        runtimeMs,
        firstFailure: fail ? `${fail.name} failed` : undefined,
        category: passed === total && total > 0 ? "accepted" : "wrong_answer",
      });
    });
  });
}

function parseResultsJson(stdout: string): { name: string; pass: boolean }[] | null {
  const lines = stdout
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (!line.startsWith("{")) continue;
    try {
      const obj = JSON.parse(line) as { results?: { name: string; pass: boolean }[] };
      if (Array.isArray(obj.results)) return obj.results;
    } catch {
      /* try previous */
    }
  }
  return null;
}
