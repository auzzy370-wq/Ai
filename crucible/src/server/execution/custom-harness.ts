/**
 * Candidate-authored custom cases — never trusted as grading.
 * Runs inside the workspace sandbox the same way as public tests.
 */
export function customTsRunnerSource(): string {
  return `import { readFileSync } from "node:fs";
import { solve } from "../src/solution.ts";

type Case = { name?: string; args: unknown[]; expected?: unknown };

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => deepEqual(v, b[i]));
    }
    const ak = Object.keys(a as object).sort();
    const bk = Object.keys(b as object).sort();
    if (ak.length !== bk.length) return false;
    return ak.every((k, i) => k === bk[i] && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[bk[i]]));
  }
  return false;
}

const raw = readFileSync(new URL("./custom_cases.json", import.meta.url), "utf8");
const cases = JSON.parse(raw) as Case[];
const results: { name: string; pass: boolean; hidden?: boolean; got?: unknown; expected?: unknown }[] = [];

for (let i = 0; i < cases.length; i++) {
  const c = cases[i]!;
  const name = c.name || \`custom_\${i + 1}\`;
  try {
    const got = (solve as (...a: unknown[]) => unknown)(...(c.args ?? []));
    if (c.expected === undefined) {
      results.push({ name, pass: true, got });
    } else {
      const pass = deepEqual(got, c.expected);
      results.push({ name, pass, got, expected: c.expected });
    }
  } catch (e) {
    results.push({ name, pass: false, got: String(e) });
  }
}

console.log(JSON.stringify({ results, mode: "custom" }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
}

export function customPyRunnerSource(): string {
  return `import json, pathlib, traceback
from src.solution import solve

cases = json.loads(pathlib.Path("tests/custom_cases.json").read_text())
results = []
for i, c in enumerate(cases):
    name = c.get("name") or f"custom_{i+1}"
    try:
        got = solve(*(c.get("args") or []))
        if "expected" not in c:
            results.append({"name": name, "pass": True, "got": got})
        else:
            results.append({"name": name, "pass": got == c["expected"], "got": got, "expected": c["expected"]})
    except Exception as e:
        results.append({"name": name, "pass": False, "got": "".join(traceback.format_exception_only(type(e), e)).strip()})
print(json.dumps({"results": results, "mode": "custom"}))
raise SystemExit(0 if all(r["pass"] for r in results) else 1)
`;
}
