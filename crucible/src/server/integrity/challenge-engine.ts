import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { familyHarnessForSlug, familyKeyFromSlug } from "@/server/execution/coding-family-harness";
import { HIDDEN_CASES, hiddenTsRunnerSource } from "@/server/execution/hidden-harness";
import { starterFilesForChallenge } from "@/server/execution/starters";
import { isCodingProblem } from "@/server/challenges/coding-problems";

export type IntegritySeverity = "error" | "warning" | "info";

export type IntegrityFinding = {
  code: string;
  severity: IntegritySeverity;
  message: string;
  evidence?: Record<string, unknown>;
};

export type IntegrityScanResult = {
  challengeId: string;
  slug: string;
  contentVersion: string;
  status: "pass" | "warn" | "fail";
  findings: IntegrityFinding[];
  calibratedDifficulty: number | null;
  liveAcceptancePct: number | null;
  avgRuntimeMs: number | null;
  sampleSubmissions: number;
};

function hashContent(parts: string[]): string {
  return createHash("sha256").update(parts.join("\n---\n")).digest("hex").slice(0, 24);
}

function extractTestNames(src: string): string[] {
  const names: string[] = [];
  const re = /name:\s*["'`]([^"'`]+)["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) names.push(m[1]!);
  return names;
}

function extractExports(src: string): string[] {
  const out = new Set<string>();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) out.add(m[1]!);
  for (const m of src.matchAll(/export\s+(?:const|class)\s+(\w+)/g)) out.add(m[1]!);
  for (const m of src.matchAll(/export\s+\{\s*([^}]+)\s*\}/g)) {
    for (const part of m[1]!.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) out.add(name);
    }
  }
  return [...out];
}

function extractImportsFromTests(src: string): string[] {
  const out = new Set<string>();
  for (const m of src.matchAll(/import\s+\{([^}]+)\}\s+from\s+["'][^"']*solution[^"']*["']/g)) {
    for (const part of m[1]!.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) out.add(name);
    }
  }
  return [...out];
}

function detectNondeterminism(src: string): string[] {
  const hits: string[] = [];
  if (/\bMath\.random\s*\(/.test(src)) hits.push("Math.random");
  if (/\bDate\.now\s*\(/.test(src)) hits.push("Date.now");
  if (/\bnew\s+Date\s*\(\s*\)/.test(src)) hits.push("new Date()");
  if (/\bcrypto\.random/.test(src)) hits.push("crypto.random");
  if (/\bperformance\.now\s*\(/.test(src)) hits.push("performance.now");
  return hits;
}

function edgeCaseCoverage(tags: string[], hiddenNames: string[], hiddenText: string): string[] {
  const missing: string[] = [];
  const blob = `${hiddenNames.join(" ")} ${hiddenText}`.toLowerCase();
  const checks: { need: boolean; label: string; tokens: string[] }[] = [
    { need: true, label: "empty/zero input", tokens: ["empty", "zero", "[]", '""', "blank"] },
    { need: tags.some((t) => /array|string|list|graph|tree/.test(t)), label: "single-element", tokens: ["single", "one_", "len1", "n_1"] },
    { need: tags.some((t) => /array|string|perf|scale/.test(t)), label: "large input", tokens: ["large", "long", "n≈", "perf", "scale", "1e5", "8000", "5000"] },
    { need: tags.some((t) => /bound|window|stack|math/.test(t)), label: "boundary", tokens: ["bound", "edge", "exact", "limit", "cap"] },
    { need: tags.some((t) => /dup|hash|map|set/.test(t)), label: "duplicates", tokens: ["dup", "same", "repeat", "identical"] },
  ];
  for (const c of checks) {
    if (!c.need) continue;
    if (!c.tokens.some((t) => blob.includes(t))) missing.push(c.label);
  }
  return missing;
}

function difficultyBandFromAcceptance(pct: number | null, labeled: number): number | null {
  if (pct == null) return null;
  // Higher acceptance → easier
  let suggested = labeled;
  if (pct >= 70) suggested = Math.min(3, labeled);
  else if (pct >= 45) suggested = Math.min(5, Math.max(3, labeled));
  else if (pct >= 25) suggested = Math.min(7, Math.max(5, labeled));
  else suggested = Math.max(7, labeled);
  return suggested;
}

async function liveStats(challengeId: string): Promise<{
  submissions: number;
  acceptancePct: number | null;
  avgRuntimeMs: number | null;
}> {
  const jobs = await prisma.executionJob.findMany({
    where: {
      type: "hidden_test",
      workspace: { assignment: { assessment: { challengeId } } },
    },
    select: {
      status: true,
      startedAt: true,
      finishedAt: true,
      testRun: { select: { hiddenPassed: true, hiddenFailed: true, passed: true, failed: true } },
    },
    take: 2000,
    orderBy: { createdAt: "desc" },
  });
  if (!jobs.length) return { submissions: 0, acceptancePct: null, avgRuntimeMs: null };

  let accepted = 0;
  const runtimes: number[] = [];
  for (const j of jobs) {
    const tr = j.testRun;
    const ok =
      (tr && tr.hiddenPassed > 0 && tr.hiddenFailed === 0) ||
      (tr && tr.failed === 0 && tr.passed > 0) ||
      j.status === "SUCCEEDED";
    if (ok) accepted += 1;
    if (j.startedAt && j.finishedAt) {
      const ms = j.finishedAt.getTime() - j.startedAt.getTime();
      if (ms > 0 && ms < 120_000) runtimes.push(ms);
    }
  }
  const avgRuntimeMs = runtimes.length
    ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length)
    : null;
  return {
    submissions: jobs.length,
    acceptancePct: Math.round((accepted / jobs.length) * 1000) / 10,
    avgRuntimeMs,
  };
}

/** Scan one challenge for integrity issues. Does not persist unless `persist` is true. */
export async function scanChallengeIntegrity(
  challengeId: string,
  opts?: { persist?: boolean },
): Promise<IntegrityScanResult> {
  const challenge = await prisma.challenge.findUniqueOrThrow({ where: { id: challengeId } });
  const findings: IntegrityFinding[] = [];
  const coding = isCodingProblem(challenge);

  const publicReqs = Array.isArray(challenge.publicRequirements)
    ? (challenge.publicRequirements as unknown[]).map(String)
    : [];
  const hiddenReqs = Array.isArray(challenge.hiddenRequirements)
    ? (challenge.hiddenRequirements as unknown[]).map(String)
    : [];

  let publicSrc = "";
  let hiddenSrc = "";
  let solutionSrc = "";
  let problemMd = "";
  let starterBound = false;

  if (coding) {
    const files = starterFilesForChallenge(challenge.slug, "typescript", challenge.track);
    starterBound = files.length > 0;
    publicSrc =
      files.find((f) => f.path === "tests/public.test.ts" || f.path === "tests/run.ts")?.content ?? "";
    hiddenSrc =
      files.find((f) => f.path === "tests/hidden_run.ts" || f.path === "tests/_hidden_run.ts")?.content ??
      hiddenTsRunnerSource(challenge.slug) ??
      "";
    solutionSrc = files.find((f) => f.path === "src/solution.ts")?.content ?? "";
    problemMd =
      files.find((f) => f.path === "PROBLEM.md")?.content ??
      `${challenge.title}\n${challenge.summary}\n${challenge.description}`;

    // 1) ID / version binding
    if (!starterBound) {
      findings.push({
        code: "MISSING_STARTER",
        severity: "error",
        message: "No starter/harness files bound to this challenge slug.",
      });
    }

    const family = familyKeyFromSlug(challenge.slug);
    const harness = familyHarnessForSlug(challenge.slug);
    if (challenge.slug.startsWith("q-") && !harness) {
      findings.push({
        code: "FAMILY_UNBOUND",
        severity: "error",
        message: `Question-bank slug ${challenge.slug} has no family harness binding.`,
        evidence: { family },
      });
    }
    if (harness && family && harness.family !== family) {
      findings.push({
        code: "FAMILY_MISMATCH",
        severity: "error",
        message: `Harness family ${harness.family} does not match slug family ${family}.`,
      });
    }

    // Curated lc-* must map to HIDDEN_CASES or explicit runner
    if (challenge.slug.startsWith("lc-")) {
      const curated = Boolean(HIDDEN_CASES[challenge.slug] || hiddenTsRunnerSource(challenge.slug));
      if (!curated) {
        findings.push({
          code: "CURATED_HIDDEN_MISSING",
          severity: "warning",
          message: "Curated lc-* problem lacks HIDDEN_CASES / hidden runner binding.",
        });
      }
    }

    // Package.json name should match slug when present
    const pkg = files.find((f) => f.path === "package.json")?.content;
    if (pkg) {
      try {
        const name = (JSON.parse(pkg) as { name?: string }).name;
        if (name && name !== challenge.slug) {
          findings.push({
            code: "PACKAGE_SLUG_MISMATCH",
            severity: "error",
            message: `package.json name "${name}" ≠ challenge slug "${challenge.slug}".`,
          });
        }
      } catch {
        findings.push({
          code: "PACKAGE_JSON_INVALID",
          severity: "warning",
          message: "package.json in starter is not valid JSON.",
        });
      }
    }

    // 2) Statement ↔ tests mismatch (export/import)
    const exports = extractExports(solutionStubOrSolution(solutionSrc));
    const imports = [
      ...extractImportsFromTests(publicSrc),
      ...extractImportsFromTests(hiddenSrc),
    ];
    for (const imp of imports) {
      if (exports.length && !exports.includes(imp) && !solutionSrc.includes(`function ${imp}`) && !solutionSrc.includes(`class ${imp}`)) {
        // Stub may declare export function solve — check stub text
        if (!solutionSrc.includes(imp)) {
          findings.push({
            code: "EXPORT_IMPORT_MISMATCH",
            severity: "error",
            message: `Tests import \`${imp}\` but starter solution does not export it.`,
            evidence: { import: imp, exports },
          });
        }
      }
    }

    // Description mentions solve() but tests import something else (or vice versa)
    const descMentionsSolve = /\bsolve\s*\(/.test(challenge.description) || /Implement `solve/.test(challenge.description);
    if (descMentionsSolve && imports.length && !imports.includes("solve") && !exports.includes("solve")) {
      findings.push({
        code: "STATEMENT_API_MISMATCH",
        severity: "warning",
        message: "Problem statement references solve() but harness uses a different API.",
        evidence: { imports },
      });
    }

    // 3) Reference solution quality
    if (challenge.referenceSolution) {
      const ref = challenge.referenceSolution;
      if (/return\s+\[\s*\]\s*;|return\s+0\s*;|return\s+false\s*;|TODO|NotImplemented/.test(ref)) {
        findings.push({
          code: "REFERENCE_STUB",
          severity: "error",
          message: "referenceSolution looks like a stub, not a correct solution.",
        });
      }
      if (ref.length < 40) {
        findings.push({
          code: "REFERENCE_TOO_SHORT",
          severity: "warning",
          message: "referenceSolution is suspiciously short.",
        });
      }
    } else if (coding && challenge.slug.startsWith("lc-")) {
      findings.push({
        code: "REFERENCE_MISSING",
        severity: "info",
        message: "No referenceSolution stored for curated problem (recommended for integrity).",
      });
    }

    // Starter stub should not be a full solution leaked to candidates
    if (solutionSrc && !/return\s+\[\s*\]\s*;|return\s+0\s*;|return\s+false\s*;|return\s+""\s*;|NotImplemented|pass\s*$/m.test(solutionSrc)) {
      // Heuristic: long solution stubs with real algorithms
      if (solutionSrc.length > 800 && /for\s*\(|while\s*\(|Map\(|dict\(/.test(solutionSrc)) {
        findings.push({
          code: "STARTER_LOOKS_SOLVED",
          severity: "warning",
          message: "Starter solution.ts looks like a full implementation — risk of answer leakage.",
        });
      }
    }

    // 4) Duplicate / contradictory tests (within each suite; cross-suite → leakage)
    const publicNames = [...new Set(extractTestNames(publicSrc))];
    const hiddenNames = [...new Set(extractTestNames(hiddenSrc))];
    const publicRaw = extractTestNames(publicSrc);
    const hiddenRaw = extractTestNames(hiddenSrc);
    for (const [label, raw] of [
      ["public", publicRaw],
      ["hidden", hiddenRaw],
    ] as const) {
      const seen = new Map<string, number>();
      for (const n of raw) seen.set(n, (seen.get(n) ?? 0) + 1);
      for (const [name, count] of seen) {
        if (count > 1) {
          findings.push({
            code: "DUPLICATE_TEST_NAME",
            severity: "error",
            message: `Duplicate ${label} test case name "${name}" (${count}×).`,
            evidence: { name, count, suite: label },
          });
        }
      }
    }
    for (const name of publicNames) {
      if (hiddenNames.includes(name)) {
        findings.push({
          code: "HIDDEN_NAME_IN_PUBLIC",
          severity: "error",
          message: `Test name "${name}" appears in both public and hidden suites.`,
          evidence: { name },
        });
      }
    }
    if (!publicNames.length && coding) {
      findings.push({
        code: "NO_PUBLIC_TESTS",
        severity: "error",
        message: "No public test cases found in harness.",
      });
    }
    if (!hiddenNames.length && coding) {
      findings.push({
        code: "NO_HIDDEN_TESTS",
        severity: "warning",
        message: "No hidden test cases found — weak anti-cheat / grading signal.",
      });
    }

    // Contradictory: same literal expected values with opposing pass conditions is hard;
    // flag identical input literals used with different expected if pattern matches.
    const expectPairs = [...`${publicSrc}\n${hiddenSrc}`.matchAll(/solve\(([^)]+)\)\s*===\s*([^,\n}]+)/g)].map(
      (m) => ({ args: m[1]!.trim(), expected: m[2]!.trim() }),
    );
    const byArgs = new Map<string, Set<string>>();
    for (const p of expectPairs) {
      const set = byArgs.get(p.args) ?? new Set();
      set.add(p.expected);
      byArgs.set(p.args, set);
    }
    for (const [args, expecteds] of byArgs) {
      if (expecteds.size > 1) {
        findings.push({
          code: "CONTRADICTORY_EXPECTATIONS",
          severity: "error",
          message: `Same inputs produce conflicting expected values: solve(${args}).`,
          evidence: { args, expecteds: [...expecteds] },
        });
      }
    }

    // 7) Hidden fixture leakage into public materials (long literals)
    const hiddenLiterals = [...hiddenSrc.matchAll(/["'`]([A-Za-z0-9_\-]{16,})["'`]/g)].map((m) => m[1]!);
    for (const lit of hiddenLiterals.slice(0, 20)) {
      if (problemMd.includes(lit) || publicSrc.includes(lit)) {
        findings.push({
          code: "HIDDEN_FIXTURE_LEAK",
          severity: "warning",
          message: "A long fixture string from the hidden harness also appears in public materials.",
          evidence: { sample: lit.slice(0, 32) },
        });
        break;
      }
    }

    // 8) Nondeterministic evaluation
    for (const [label, src] of [
      ["public", publicSrc],
      ["hidden", hiddenSrc],
    ] as const) {
      const hits = detectNondeterminism(src);
      if (hits.length) {
        findings.push({
          code: "NONDETERMINISTIC_HARNESS",
          severity: "error",
          message: `${label} harness uses nondeterministic APIs: ${hits.join(", ")}.`,
          evidence: { hits, label },
        });
      }
    }

    // 6) Missing edge cases
    const missingEdges = edgeCaseCoverage(
      challenge.tags,
      hiddenNames,
      `${hiddenSrc}\n${hiddenReqs.join("\n")}`,
    );
    for (const edge of missingEdges) {
      findings.push({
        code: "MISSING_EDGE_CASE",
        severity: "warning",
        message: `Likely missing edge coverage: ${edge}.`,
        evidence: { edge },
      });
    }

    // Public requirements empty for coding
    if (!publicReqs.length) {
      findings.push({
        code: "NO_PUBLIC_REQUIREMENTS",
        severity: "warning",
        message: "publicRequirements is empty — deliverables unclear for candidates/graders.",
      });
    }
  } else {
    // Mission / project challenges
    if (!publicReqs.length) {
      findings.push({
        code: "NO_PUBLIC_REQUIREMENTS",
        severity: "error",
        message: "Mission has no publicRequirements.",
      });
    }
    if (!hiddenReqs.length) {
      findings.push({
        code: "NO_HIDDEN_REQUIREMENTS",
        severity: "warning",
        message: "Mission has no hiddenRequirements — weak evaluation bar.",
      });
    }
    if (!challenge.gradingRubric) {
      findings.push({
        code: "NO_RUBRIC",
        severity: "warning",
        message: "Mission missing gradingRubric.",
      });
    }
  }

  // Difficulty bounds
  if (challenge.difficulty < 1 || challenge.difficulty > 10) {
    findings.push({
      code: "DIFFICULTY_OUT_OF_RANGE",
      severity: "error",
      message: `Difficulty ${challenge.difficulty} outside 1–10.`,
    });
  }

  // Live calibration
  const stats = await liveStats(challenge.id);
  const calibrated = difficultyBandFromAcceptance(stats.acceptancePct, challenge.difficulty);
  if (
    calibrated != null &&
    stats.submissions >= 10 &&
    Math.abs(calibrated - challenge.difficulty) >= 3
  ) {
    findings.push({
      code: "UNREALISTIC_DIFFICULTY",
      severity: "warning",
      message: `Labeled difficulty ${challenge.difficulty}/10 vs calibrated ~${calibrated}/10 from live acceptance ${stats.acceptancePct}%.`,
      evidence: {
        labeled: challenge.difficulty,
        calibrated,
        acceptancePct: stats.acceptancePct,
        submissions: stats.submissions,
      },
    });
  }
  if (stats.avgRuntimeMs != null && stats.avgRuntimeMs > 45_000 && challenge.difficulty <= 3) {
    findings.push({
      code: "RESOURCE_MISMATCH",
      severity: "warning",
      message: `Easy-labeled problem averages ${stats.avgRuntimeMs}ms runtime — may need harder rating or harness fix.`,
      evidence: { avgRuntimeMs: stats.avgRuntimeMs },
    });
  }

  const contentVersion = hashContent([
    challenge.slug,
    challenge.title,
    challenge.description,
    JSON.stringify(publicReqs),
    JSON.stringify(hiddenReqs),
    publicSrc,
    hiddenSrc,
    solutionSrc.slice(0, 2000),
    String(challenge.difficulty),
  ]);

  // Version drift: stored contentVersion differs from fresh hash while published
  if (challenge.contentVersion && challenge.contentVersion !== contentVersion && challenge.isPublished) {
    findings.push({
      code: "VERSION_DRIFT",
      severity: "warning",
      message: "Published challenge content changed since last integrity stamp — re-scan before relying on it.",
      evidence: { stored: challenge.contentVersion, computed: contentVersion },
    });
  }

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const status: IntegrityScanResult["status"] =
    errorCount > 0 ? "fail" : warningCount > 0 ? "warn" : "pass";

  const result: IntegrityScanResult = {
    challengeId: challenge.id,
    slug: challenge.slug,
    contentVersion,
    status,
    findings,
    calibratedDifficulty: calibrated,
    liveAcceptancePct: stats.acceptancePct,
    avgRuntimeMs: stats.avgRuntimeMs,
    sampleSubmissions: stats.submissions,
  };

  if (opts?.persist) {
    await prisma.challengeIntegrityReport.create({
      data: {
        challengeId: challenge.id,
        contentVersion,
        status,
        findingCount: findings.length,
        errorCount,
        warningCount,
        findings: findings as unknown as object,
        calibratedDifficulty: calibrated ?? undefined,
        liveAcceptancePct: stats.acceptancePct ?? undefined,
        avgRuntimeMs: stats.avgRuntimeMs ?? undefined,
        sampleSubmissions: stats.submissions,
      },
    });
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        contentVersion,
        integrityStatus: status,
        integrityScannedAt: new Date(),
        calibratedDifficulty: calibrated ?? undefined,
      },
    });
  }

  return result;
}

function solutionStubOrSolution(src: string) {
  return src;
}

/** Batch scan. Defaults to coding problems; pass `all: true` for missions too. */
export async function scanChallengeLibrary(opts?: {
  take?: number;
  all?: boolean;
  onlyPublished?: boolean;
  persist?: boolean;
  slugs?: string[];
}) {
  const take = opts?.take ?? 200;
  const where = {
    ...(opts?.onlyPublished ? { isPublished: true } : {}),
    ...(opts?.slugs?.length ? { slug: { in: opts.slugs } } : {}),
    ...(!opts?.all && !opts?.slugs?.length ? { type: "CODING_PROBLEM" as const } : {}),
  };
  const challenges = await prisma.challenge.findMany({
    where,
    select: { id: true, slug: true },
    orderBy: { updatedAt: "desc" },
    take,
  });

  const results: IntegrityScanResult[] = [];
  for (const c of challenges) {
    results.push(await scanChallengeIntegrity(c.id, { persist: opts?.persist ?? true }));
  }

  const summary = {
    scanned: results.length,
    pass: results.filter((r) => r.status === "pass").length,
    warn: results.filter((r) => r.status === "warn").length,
    fail: results.filter((r) => r.status === "fail").length,
    byCode: {} as Record<string, number>,
  };
  for (const r of results) {
    for (const f of r.findings) {
      summary.byCode[f.code] = (summary.byCode[f.code] ?? 0) + 1;
    }
  }
  return { summary, results };
}

/** Gate publish: returns null if allowed, or a blocking result. */
export async function assertPublishable(challengeId: string, opts?: { force?: boolean }) {
  const result = await scanChallengeIntegrity(challengeId, { persist: true });
  if (opts?.force) return { allowed: true as const, result, forced: true };
  if (result.status === "fail") {
    return { allowed: false as const, result, forced: false };
  }
  return { allowed: true as const, result, forced: false };
}
