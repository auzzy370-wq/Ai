import { CODING_PROBLEM_CATALOG } from "@/server/challenges/coding-problems";
import { CHALLENGE_CATALOG } from "@/server/challenges/catalog";
import { entryPathForLanguage, normalizeCodingLanguage, type CodingLanguage } from "@/lib/coding-languages";
import type { StarterFile } from "./starters";
import { familyHarnessForSlug, familyTsFiles } from "./coding-family-harness";
import { multilangStarterFiles } from "./coding-family-multilang";

type CodingSpec = {
  solutionStub: string;
  publicTests: string;
  hiddenHints: { id: string; description: string }[];
};

const SPECS: Record<string, CodingSpec> = {
  "lc-two-sum": {
    solutionStub: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
export function twoSum(nums: number[], target: number): number[] {
  // TODO: implement — aim for O(n)
  void nums;
  void target;
  return [];
}
`,
    publicTests: `import { twoSum } from "../src/solution.ts";

function samePair(a: number[], b: number[]) {
  if (a.length !== 2 || b.length !== 2) return false;
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

export async function runPublicTests() {
  const results: { name: string; pass: boolean; hidden?: boolean }[] = [];
  results.push({ name: "example_1", pass: samePair(twoSum([2, 7, 11, 15], 9), [0, 1]) });
  results.push({ name: "example_2", pass: samePair(twoSum([3, 2, 4], 6), [1, 2]) });
  results.push({ name: "example_3", pass: samePair(twoSum([3, 3], 6), [0, 1]) });
  return results;
}
`,
    hiddenHints: [
      { id: "negatives", description: "Handles negative numbers" },
      { id: "large_n", description: "Completes within time for n≈10k" },
    ],
  },
  "lc-valid-parens": {
    solutionStub: `export function isValid(s: string): boolean {
  // TODO: stack-based validation
  void s;
  return false;
}
`,
    publicTests: `import { isValid } from "../src/solution.ts";

export async function runPublicTests() {
  return [
    { name: "example_1", pass: isValid("()") === true },
    { name: "example_2", pass: isValid("()[]{}") === true },
    { name: "example_3", pass: isValid("(]") === false },
    { name: "nested", pass: isValid("{[]}") === true },
  ];
}
`,
    hiddenHints: [
      { id: "long_nested", description: "Deep nesting" },
      { id: "empty_pairs", description: "Many () pairs" },
    ],
  },
  "lc-merge-intervals": {
    solutionStub: `export function merge(intervals: number[][]): number[][] {
  // TODO: sort + sweep
  void intervals;
  return [];
}
`,
    publicTests: `import { merge } from "../src/solution.ts";

function eq(a: number[][], b: number[][]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function runPublicTests() {
  return [
    {
      name: "example_1",
      pass: eq(merge([[1, 3], [2, 6], [8, 10], [15, 18]]), [[1, 6], [8, 10], [15, 18]]),
    },
    { name: "example_2", pass: eq(merge([[1, 4], [4, 5]]), [[1, 5]]) },
  ];
}
`,
    hiddenHints: [
      { id: "unsorted", description: "Unsorted input" },
      { id: "nested", description: "Fully nested intervals" },
    ],
  },
  "lc-lru-cache": {
    solutionStub: `export class LRUCache {
  constructor(private capacity: number) {
    void this.capacity;
  }
  get(key: number): number {
    void key;
    return -1;
  }
  put(key: number, value: number): void {
    void key;
    void value;
  }
}
`,
    publicTests: `import { LRUCache } from "../src/solution.ts";

export async function runPublicTests() {
  const c = new LRUCache(2);
  c.put(1, 1);
  c.put(2, 2);
  const r1 = c.get(1) === 1;
  c.put(3, 3);
  const r2 = c.get(2) === -1;
  c.put(4, 4);
  const r3 = c.get(1) === -1 && c.get(3) === 3 && c.get(4) === 4;
  return [
    { name: "get_after_put", pass: r1 },
    { name: "evict_lru", pass: r2 },
    { name: "example_sequence", pass: r3 },
  ];
}
`,
    hiddenHints: [
      { id: "cap1", description: "Capacity 1" },
      { id: "update_recency", description: "Overwrite updates recency" },
    ],
  },
  "lc-course-schedule": {
    solutionStub: `export function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  void numCourses;
  void prerequisites;
  return false;
}
`,
    publicTests: `import { canFinish } from "../src/solution.ts";

export async function runPublicTests() {
  return [
    { name: "example_1", pass: canFinish(2, [[1, 0]]) === true },
    { name: "example_2", pass: canFinish(2, [[1, 0], [0, 1]]) === false },
    { name: "no_prereq", pass: canFinish(3, []) === true },
  ];
}
`,
    hiddenHints: [
      { id: "components", description: "Disconnected components" },
      { id: "long_chain", description: "Long dependency chain" },
    ],
  },
  "lc-word-break": {
    solutionStub: `export function wordBreak(s: string, wordDict: string[]): boolean {
  void s;
  void wordDict;
  return false;
}
`,
    publicTests: `import { wordBreak } from "../src/solution.ts";

export async function runPublicTests() {
  return [
    { name: "example_1", pass: wordBreak("leetcode", ["leet", "code"]) === true },
    { name: "example_2", pass: wordBreak("applepenapple", ["apple", "pen"]) === true },
    { name: "example_3", pass: wordBreak("catsandog", ["cats", "dog", "sand", "and", "cat"]) === false },
  ];
}
`,
    hiddenHints: [
      { id: "ambiguous", description: "Ambiguous splits" },
      { id: "long_s", description: "Long string performance" },
    ],
  },
  "lc-serialize-tree": {
    solutionStub: `export class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val = 0, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

export function serialize(root: TreeNode | null): string {
  void root;
  return "";
}

export function deserialize(data: string): TreeNode | null {
  void data;
  return null;
}
`,
    publicTests: `import { TreeNode, serialize, deserialize } from "../src/solution.ts";

function same(a: TreeNode | null, b: TreeNode | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.val === b.val && same(a.left, b.left) && same(a.right, b.right);
}

export async function runPublicTests() {
  const root = new TreeNode(1, new TreeNode(2), new TreeNode(3, new TreeNode(4), new TreeNode(5)));
  const round = deserialize(serialize(root));
  const empty = deserialize(serialize(null));
  return [
    { name: "round_trip_sample", pass: same(root, round) },
    { name: "empty_tree", pass: empty === null },
  ];
}
`,
    hiddenHints: [
      { id: "skewed", description: "Skewed tree" },
      { id: "negatives", description: "Negative node values" },
    ],
  },
  "lc-rate-limiter": {
    solutionStub: `export class HitCounter {
  hit(timestamp: number): void {
    void timestamp;
  }
  getHits(timestamp: number): number {
    void timestamp;
    return 0;
  }
}
`,
    publicTests: `import { HitCounter } from "../src/solution.ts";

export async function runPublicTests() {
  const h = new HitCounter();
  h.hit(1); h.hit(2); h.hit(3);
  const a = h.getHits(4) === 3;
  h.hit(300);
  const b = h.getHits(300) === 4;
  const c = h.getHits(301) === 3;
  return [
    { name: "early_window", pass: a },
    { name: "at_300", pass: b },
    { name: "slide_off", pass: c },
  ];
}
`,
    hiddenHints: [
      { id: "burst", description: "Same-second bursts" },
      { id: "boundary", description: "Exact 300s boundary" },
    ],
  },
  "lc-top-k-frequent": {
    solutionStub: `export function topKFrequent(nums: number[], k: number): number[] {
  void nums;
  void k;
  return [];
}
`,
    publicTests: `import { topKFrequent } from "../src/solution.ts";

function sameSet(a: number[], b: number[]) {
  return [...a].sort((x, y) => x - y).join(",") === [...b].sort((x, y) => x - y).join(",");
}

export async function runPublicTests() {
  return [
    { name: "example_1", pass: sameSet(topKFrequent([1, 1, 1, 2, 2, 3], 2), [1, 2]) },
    { name: "example_2", pass: sameSet(topKFrequent([1], 1), [1]) },
  ];
}
`,
    hiddenHints: [{ id: "large_n", description: "n ≈ 1e5 performance" }],
  },
  "lc-min-window": {
    solutionStub: `export function minWindow(s: string, t: string): string {
  void s;
  void t;
  return "";
}
`,
    publicTests: `import { minWindow } from "../src/solution.ts";

export async function runPublicTests() {
  return [
    { name: "example_1", pass: minWindow("ADOBECODEBANC", "ABC") === "BANC" },
    { name: "example_2", pass: minWindow("a", "a") === "a" },
    { name: "example_3", pass: minWindow("a", "aa") === "" },
  ];
}
`,
    hiddenHints: [
      { id: "dupes", description: "Duplicates in t" },
      { id: "full", description: "Full-string window" },
    ],
  },
  "lc-secure-password": {
    solutionStub: `export function strongPassword(password: string): boolean {
  // TODO: enforce all rules; scan forbidden substring fully (no early exit helper)
  void password;
  return false;
}
`,
    publicTests: `import { strongPassword } from "../src/solution.ts";

export async function runPublicTests() {
  return [
    { name: "valid", pass: strongPassword("Abcdef1!") === true },
    { name: "too_short", pass: strongPassword("Ab1!x") === false },
    { name: "has_password", pass: strongPassword("Password1!") === false },
    { name: "missing_special", pass: strongPassword("Abcdef12") === false },
  ];
}
`,
    hiddenHints: [
      { id: "case_ban", description: "Case-insensitive password ban" },
      { id: "bounds", description: "Length 8 and 64 bounds" },
    ],
  },
  "lc-idempotent-charge": {
    solutionStub: `export function charge(
  intentId: string,
  amount: number,
): { status: "ok" | "duplicate"; totalCharged: number } {
  void intentId;
  void amount;
  return { status: "ok", totalCharged: 0 };
}
`,
    publicTests: `import { charge } from "../src/solution.ts";

export async function runPublicTests() {
  const a = charge("a", 10);
  const b = charge("a", 10);
  const c = charge("b", 5);
  return [
    { name: "first_ok", pass: a.status === "ok" && a.totalCharged === 10 },
    { name: "dup", pass: b.status === "duplicate" && b.totalCharged === 10 },
    { name: "second_intent", pass: c.status === "ok" && c.totalCharged === 15 },
  ];
}
`,
    hiddenHints: [
      { id: "interleave", description: "Interleaved intents" },
      { id: "retries", description: "Retry storm same id" },
    ],
  },
};

function pythonStub(slug: string): string {
  const stubs: Record<string, string> = {
    "lc-two-sum": `from typing import List

def two_sum(nums: List[int], target: int) -> List[int]:
    """Return indices of the two numbers that add up to target."""
    # TODO: implement — aim for O(n)
    return []
`,
    "lc-valid-parens": `def is_valid(s: str) -> bool:
    # TODO: stack-based validation
    return False
`,
    "lc-merge-intervals": `from typing import List

def merge(intervals: List[List[int]]) -> List[List[int]]:
    # TODO: sort + sweep
    return []
`,
    "lc-top-k-frequent": `from typing import List

def top_k_frequent(nums: List[int], k: int) -> List[int]:
    # TODO: bucket or heap
    return []
`,
    "lc-idempotent-charge": `_ledger: dict[str, int] = {}
_total = 0

def charge(intent_id: str, amount: int) -> dict:
    # TODO: idempotent ledger
    return {"status": "ok", "totalCharged": 0}
`,
  };
  return (
    stubs[slug] ??
    `def solve(*args, **kwargs):
    # TODO: implement
    raise NotImplementedError
`
  );
}

function pythonPublicRunner(slug: string): string {
  if (slug === "lc-two-sum") {
    return `import json, sys
sys.path.insert(0, "src")
from solution import two_sum

def same_pair(a, b):
    if len(a) != 2 or len(b) != 2: return False
    return (a[0]==b[0] and a[1]==b[1]) or (a[0]==b[1] and a[1]==b[0])

results = [
  {"name": "example_1", "pass": same_pair(two_sum([2,7,11,15], 9), [0,1])},
  {"name": "example_2", "pass": same_pair(two_sum([3,2,4], 6), [1,2])},
  {"name": "example_3", "pass": same_pair(two_sum([3,3], 6), [0,1])},
]
print(json.dumps({"results": results}))
sys.exit(0 if all(r["pass"] for r in results) else 1)
`;
  }
  if (slug === "lc-valid-parens") {
    return `import json, sys
sys.path.insert(0, "src")
from solution import is_valid
results = [
  {"name": "example_1", "pass": is_valid("()") is True},
  {"name": "example_2", "pass": is_valid("()[]{}") is True},
  {"name": "example_3", "pass": is_valid("(]") is False},
]
print(json.dumps({"results": results}))
sys.exit(0 if all(r["pass"] for r in results) else 1)
`;
  }
  return `import json, sys
print(json.dumps({"results": [{"name": "python_stub", "pass": False}]}))
sys.exit(1)
`;
}

function pythonHiddenRunner(slug: string): string {
  if (slug === "lc-two-sum") {
    return `import json, sys
sys.path.insert(0, "src")
from solution import two_sum

def same_pair(a, b):
    if len(a) != 2 or len(b) != 2: return False
    return (a[0]==b[0] and a[1]==b[1]) or (a[0]==b[1] and a[1]==b[0])

nums = list(range(5000)); nums[4998]=100000; nums[4999]=-99991
results = [
  {"name": "negatives", "pass": same_pair(two_sum([-1,-2,-3,-4,-5], -8), [2,4]), "hidden": True},
  {"name": "large_n", "pass": same_pair(two_sum(nums, 9), [4998,4999]), "hidden": True},
]
print(json.dumps({"results": results}))
sys.exit(0 if all(r["pass"] for r in results) else 1)
`;
  }
  return `import json, sys
print(json.dumps({"results": [{"name": "hidden_pending", "pass": False, "hidden": True}]}))
sys.exit(1)
`;
}

function goStub(slug: string): string {
  if (slug === "lc-two-sum") {
    return `package solution

func TwoSum(nums []int, target int) []int {
\t// TODO: implement — aim for O(n)
\treturn nil
}
`;
  }
  return `package solution

func Solve() {
\t// TODO: implement
}
`;
}

function goPublicRunner(slug: string): string {
  if (slug === "lc-two-sum") {
    return `package main

import (
\t"encoding/json"
\t"fmt"
\t"os"
\tsolution "crucible/solution"
)

func samePair(a, b []int) bool {
\tif len(a) != 2 || len(b) != 2 { return false }
\treturn (a[0]==b[0] && a[1]==b[1]) || (a[0]==b[1] && a[1]==b[0])
}

func main() {
\ttype R struct { Name string \`json:"name"\`; Pass bool \`json:"pass"\` }
\tresults := []R{
\t\t{Name: "example_1", Pass: samePair(solution.TwoSum([]int{2,7,11,15}, 9), []int{0,1})},
\t\t{Name: "example_2", Pass: samePair(solution.TwoSum([]int{3,2,4}, 6), []int{1,2})},
\t}
\tok := true
\tfor _, r := range results { if !r.Pass { ok = false } }
\tb, _ := json.Marshal(map[string]any{"results": results})
\tfmt.Println(string(b))
\tif !ok { os.Exit(1) }
}
`;
  }
  return `package main
import ("encoding/json"; "fmt"; "os")
func main() {
  b, _ := json.Marshal(map[string]any{"results": []map[string]any{{"name":"go_stub","pass":false}}})
  fmt.Println(string(b)); os.Exit(1)
}
`;
}

export function codingStarterFiles(slug: string, language: string, track: string): StarterFile[] | null {
  const family = familyHarnessForSlug(slug);
  const spec = SPECS[slug];
  if (!spec && !family && !slug.startsWith("lc-") && !slug.startsWith("q-")) return null;

  const challenge =
    CODING_PROBLEM_CATALOG.find((c) => c.slug === slug) ?? CHALLENGE_CATALOG.find((c) => c.slug === slug);
  const problemMd = `# ${challenge?.title ?? slug}

${challenge?.summary ?? ""}

${challenge?.description ?? "Implement the solution."}
`;

  const lang = normalizeCodingLanguage(language);
  const entry = entryPathForLanguage(lang);

  const readme = `# ${slug}

Track: **${track}** · Language: **${lang}**

CRUCIBLE coding lane — TypeScript · JavaScript · Python · Go · Rust · Java.

1. Read the problem in the IDE **Problem** panel (or \`PROBLEM.md\`).
2. Implement \`${entry}\`.
3. Click **Run** for public tests.
4. Click **Submit** for hidden cases + knowledge pinpoint.

Do not modify hidden harness expectations dishonestly — graders check evidence.
`;

  const hiddenHints = family?.hiddenHints ?? spec?.hiddenHints ?? [
    { id: "edge", description: "Edge cases" },
    { id: "scale", description: "Scale / adversarial" },
  ];

  const common: StarterFile[] = [
    { path: "README.md", content: readme, language: "markdown" },
    { path: "PROBLEM.md", content: problemMd, language: "markdown" },
  ];

  // Coding bank: real judges in every supported language
  if (family && lang === "typescript") {
    return [
      ...common,
      {
        path: "tests/hidden.manifest.json",
        content: JSON.stringify({ tests: hiddenHints }, null, 2),
        language: "json",
      },
      ...familyTsFiles(slug, family),
    ];
  }

  if (family && lang !== "typescript") {
    const multi = multilangStarterFiles(slug, lang as CodingLanguage);
    if (multi) {
      // multilang pack already includes hidden.manifest
      return [...common.filter((f) => f.path !== "tests/hidden.manifest.json"), ...multi];
    }
  }

  if (!spec) return null;

  const manifest: StarterFile = {
    path: "tests/hidden.manifest.json",
    content: JSON.stringify({ tests: hiddenHints }, null, 2),
    language: "json",
  };

  if (lang === "python") {
    return [
      ...common,
      manifest,
      { path: "src/solution.py", content: pythonStub(slug), language: "python" },
      { path: "tests/run_public.py", content: pythonPublicRunner(slug), language: "python" },
      { path: "tests/hidden_run.py", content: pythonHiddenRunner(slug), language: "python" },
    ];
  }

  if (lang === "go") {
    return [
      ...common,
      manifest,
      { path: "solution/solution.go", content: goStub(slug), language: "go" },
      {
        path: "go.mod",
        content: `module crucible\n\ngo 1.22\n`,
        language: "go",
      },
      { path: "tests/run_public.go", content: goPublicRunner(slug), language: "go" },
    ];
  }

  // Default curated lc-* problems to TypeScript harness (JS can reuse via transpile path later)
  if (lang === "javascript") {
    // Minimal JS mirror of TS stubs for curated set: still provide TS workspace when only SPECS exist
    // Fall through to TypeScript starters for curated lc-* until per-slug JS ports exist.
  }

  return [
    ...common,
    manifest,
    { path: "src/solution.ts", content: spec.solutionStub, language: "typescript" },
    { path: "tests/public.test.ts", content: spec.publicTests, language: "typescript" },
    {
      path: "tests/run.ts",
      content: `import { runPublicTests } from "./public.test.ts";
const results = await runPublicTests();
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
      language: "typescript",
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: slug,
          private: true,
          type: "module",
          scripts: { test: "node --experimental-strip-types --disable-warning=ExperimentalWarning tests/run.ts" },
        },
        null,
        2,
      ),
      language: "json",
    },
  ];
}
