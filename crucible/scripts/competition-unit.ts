import assert from "assert";
import {
  deriveSuiteSeed,
  generateNumericArraySuite,
  publicAdversarialMeta,
  rngFromSeed,
} from "../src/server/competition/adversarial";
import { diagnoseJobResult } from "../src/server/competition/diagnostics";
import { extractPublicPrompt } from "../src/server/competition/prompt-public";

// Adversarial: same seed → identical suite
const a = generateNumericArraySuite({ challengeSlug: "demo-slug", contentVersion: "v1" });
const b = generateNumericArraySuite({ challengeSlug: "demo-slug", contentVersion: "v1" });
assert.equal(a.seed, b.seed);
assert.equal(a.cases.length, b.cases.length);
assert.deepEqual(
  a.cases.map((c) => c.id),
  b.cases.map((c) => c.id),
);
assert.deepEqual(a.cases[0]!.args, b.cases[0]!.args);

const other = generateNumericArraySuite({ challengeSlug: "other", contentVersion: "v1" });
assert.notEqual(a.seed, other.seed);

const meta = publicAdversarialMeta(a);
assert.ok(!("cases" in meta));
assert.equal(meta.caseCount, a.cases.length);
assert.ok(meta.kinds.includes("boundary"));

const r1 = rngFromSeed(deriveSuiteSeed("x", "1"));
const r2 = rngFromSeed(deriveSuiteSeed("x", "1"));
assert.equal(r1(), r2());

// Diagnostics: infrastructure vs contestant
const infra = diagnoseJobResult({
  status: "FAILED",
  type: "test",
  stderr: "ENOENT: harness not found",
  exitCode: 1,
});
assert.equal(infra.category, "infrastructure_error");
assert.equal(infra.contestantFault, false);

const tle = diagnoseJobResult({ status: "TIMEOUT", type: "hidden_test", timedOut: true });
assert.equal(tle.category, "time_limit");
assert.equal(tle.contestantFault, true);
assert.ok(!tle.expected && !tle.actual);

const waPublic = diagnoseJobResult({
  status: "FAILED",
  type: "test",
  stdout: JSON.stringify({
    results: [{ name: "ex1", pass: false, got: 1, expected: 2 }],
  }),
});
assert.equal(waPublic.category, "wrong_answer");
assert.equal(waPublic.expected, "2");
assert.equal(waPublic.actual, "1");

const waHidden = diagnoseJobResult({
  status: "FAILED",
  type: "hidden_test",
  stdout: JSON.stringify({
    results: [{ name: "h1", pass: false, hidden: true, got: 1, expected: 2 }],
  }),
});
assert.equal(waHidden.category, "wrong_answer");
assert.equal(waHidden.expected, undefined);
assert.equal(waHidden.actual, undefined);

// Public prompt must not include hidden / reference
const prompt = extractPublicPrompt({
  slug: "t",
  title: "T",
  summary: "S",
  description: "Public body\n\n## Hidden\nsecret fixture 42\n\n## More\nok",
  difficulty: 5,
  tags: [],
  languages: ["typescript"],
  functionSignature: "export function solve(): number",
  expectedComplexity: "O(1)",
  timeLimitMs: 1000,
  memoryLimitMb: 128,
  publicRequirements: ["works"],
});
assert.ok(!prompt.includes("secret fixture"));
assert.ok(!prompt.includes("reference"));
assert.ok(prompt.includes("Public body"));

console.log("competition-unit OK", { seed: a.seed, cases: a.cases.length });
