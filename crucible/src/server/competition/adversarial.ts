import { createHash } from "crypto";

/**
 * Seeded adversarial / property-based test generator.
 * Private fixtures stay server-side; only seeds + meta are safe to expose.
 */

export type AdversarialCase = {
  id: string;
  kind:
    | "boundary"
    | "random"
    | "duplicate"
    | "empty"
    | "large"
    | "negative"
    | "malformed"
    | "stress";
  args: unknown[];
  expected?: unknown;
  seed: string;
};

export type AdversarialSuite = {
  seed: string;
  challengeSlug: string;
  generatedAt: string;
  cases: AdversarialCase[];
};

/** Mulberry32 PRNG — deterministic from seed string. */
export function rngFromSeed(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return function mulberry32() {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function deriveSuiteSeed(challengeSlug: string, contentVersion: string, salt = "adv-v1"): string {
  return createHash("sha256").update(`${salt}:${challengeSlug}:${contentVersion}`).digest("hex").slice(0, 16);
}

/** Generate reproducible adversarial numeric-array cases for solve(nums)-style banks. */
export function generateNumericArraySuite(opts: {
  challengeSlug: string;
  contentVersion: string;
  count?: number;
}): AdversarialSuite {
  const seed = deriveSuiteSeed(opts.challengeSlug, opts.contentVersion);
  const rand = rngFromSeed(seed);
  const count = opts.count ?? 12;
  const cases: AdversarialCase[] = [];

  const push = (kind: AdversarialCase["kind"], args: unknown[], expected?: unknown) => {
    const id = `${kind}_${cases.length + 1}`;
    const caseSeed = createHash("sha256").update(`${seed}:${id}`).digest("hex").slice(0, 12);
    cases.push({ id, kind, args, expected, seed: caseSeed });
  };

  push("empty", [[]]);
  push("boundary", [[0]]);
  push("boundary", [[Number.MAX_SAFE_INTEGER]]);
  push("negative", [[-1, -2, -3]]);
  push("duplicate", [[7, 7, 7, 7]]);
  push("malformed", [[NaN, 1, 2]]); // judges may reject; recorded for harness policy

  for (let i = 0; i < count - 6; i++) {
    const n = 1 + Math.floor(rand() * (i < 2 ? 50 : 200));
    const nums = Array.from({ length: n }, () => Math.floor(rand() * 1000) - 200);
    if (i % 3 === 0) push("random", [nums]);
    else if (i % 3 === 1) push("large", [nums.concat(Array.from({ length: 500 }, () => Math.floor(rand() * 10)))]);
    else push("stress", [nums]);
  }

  // Differential expected for unique-sum sector-logic (when applicable)
  for (const c of cases) {
    if (Array.isArray(c.args[0]) && c.args[0].every((x) => typeof x === "number" && Number.isFinite(x))) {
      const uniq = [...new Set(c.args[0] as number[])];
      c.expected = uniq.reduce((a, b) => a + b, 0);
    }
  }

  return {
    seed,
    challengeSlug: opts.challengeSlug,
    generatedAt: new Date().toISOString(),
    cases,
  };
}

/** Public-safe metadata (no args/expected). */
export function publicAdversarialMeta(suite: AdversarialSuite) {
  return {
    seed: suite.seed,
    challengeSlug: suite.challengeSlug,
    generatedAt: suite.generatedAt,
    caseCount: suite.cases.length,
    kinds: [...new Set(suite.cases.map((c) => c.kind))],
  };
}
