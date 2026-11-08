import type { StarterFile } from "./starters";

export type FamilyHarness = {
  family: string;
  solutionStub: string;
  publicTests: string;
  hiddenRunner: string;
  hiddenHints: { id: string; description: string }[];
  pythonStub: string;
};

/** Real judge harnesses for q-{family}-N coding evidence sessions. */
const FAMILIES: Record<string, Omit<FamilyHarness, "family">> = {
  "two-sum-family": {
    solutionStub: `/** Return indices i < j such that nums[i] + nums[j] === target. */
export function solve(nums: number[], target: number): number[] {
  void nums; void target;
  return [];
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
function samePair(a: number[], b: number[]) {
  if (a.length !== 2 || b.length !== 2) return false;
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}
export async function runPublicTests() {
  return [
    { name: "example_1", pass: samePair(solve([2, 7, 11, 15], 9), [0, 1]) },
    { name: "example_2", pass: samePair(solve([3, 2, 4], 6), [1, 2]) },
    { name: "example_3", pass: samePair(solve([3, 3], 6), [0, 1]) },
    { name: "negatives", pass: samePair(solve([-1, -2, -3, -4, -5], -8), [2, 4]) },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
function samePair(a: number[], b: number[]) {
  if (a.length !== 2 || b.length !== 2) return false;
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}
const big = Array.from({ length: 8000 }, (_, i) => i * 10);
big[7998] = 500000; big[7999] = -499991;
const results = [
  { name: "large_n", pass: samePair(solve(big, 9), [7998, 7999]), hidden: true },
  { name: "zeros", pass: samePair(solve([0, 4, 3, 0], 0), [0, 3]), hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "large_n", description: "n≈8k under time (hash map)" },
      { id: "zeros", description: "Zero pairs" },
    ],
    pythonStub: `from typing import List

def solve(nums: List[int], target: int) -> List[int]:
    return []
`,
  },
  "window-family": {
    solutionStub: `/** Longest substring length with at most k distinct characters. */
export function solve(s: string, k: number): number {
  void s; void k;
  return 0;
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve("eceba", 2) === 3 },
    { name: "example_2", pass: solve("aa", 1) === 2 },
    { name: "k_zero", pass: solve("abc", 0) === 0 },
    { name: "all_unique", pass: solve("abcdef", 3) === 3 },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const long = "ab".repeat(5000) + "c".repeat(100);
const results = [
  { name: "long_s", pass: solve(long, 2) >= 10000, hidden: true },
  { name: "single", pass: solve("xxxxx", 1) === 5, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "long_s", description: "Long string sliding window" },
      { id: "single", description: "Single distinct char" },
    ],
    pythonStub: `def solve(s: str, k: int) -> int:
    return 0
`,
  },
  "graph-family": {
    solutionStub: `/** True if directed graph (0..n-1, edges) has a cycle. */
export function solve(n: number, edges: number[][]): boolean {
  void n; void edges;
  return false;
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
export async function runPublicTests() {
  return [
    { name: "cycle", pass: solve(2, [[0, 1], [1, 0]]) === true },
    { name: "line", pass: solve(3, [[0, 1], [1, 2]]) === false },
    { name: "empty", pass: solve(1, []) === false },
    { name: "self", pass: solve(1, [[0, 0]]) === true },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const edges = Array.from({ length: 2000 }, (_, i) => [i, i + 1]);
edges.push([2000, 0]);
const results = [
  { name: "large_cycle", pass: solve(2001, edges) === true, hidden: true },
  { name: "dag", pass: solve(4, [[0,1],[0,2],[1,3],[2,3]]) === false, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "large_cycle", description: "Large cyclic graph" },
      { id: "dag", description: "DAG has no cycle" },
    ],
    pythonStub: `from typing import List

def solve(n: int, edges: List[List[int]]) -> bool:
    return False
`,
  },
  "dp-family": {
    solutionStub: `/** True if s can be segmented into dictionary words. */
export function solve(s: string, wordDict: string[]): boolean {
  void s; void wordDict;
  return false;
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve("leetcode", ["leet", "code"]) === true },
    { name: "example_2", pass: solve("applepenapple", ["apple", "pen"]) === true },
    { name: "fail", pass: solve("catsandog", ["cats", "dog", "sand", "and", "cat"]) === false },
    { name: "empty_dict", pass: solve("a", []) === false },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const results = [
  { name: "ambiguous", pass: solve("aaaaaaa", ["aaaa","aaa"]) === true, hidden: true },
  { name: "long", pass: solve("a".repeat(40), ["a","aa","aaa"]) === true, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "ambiguous", description: "Ambiguous splits" },
      { id: "long", description: "Long DP string" },
    ],
    pythonStub: `from typing import List

def solve(s: str, wordDict: List[str]) -> bool:
    return False
`,
  },
  "heap-family": {
    solutionStub: `/** Return the k most frequent elements (any order). */
export function solve(nums: number[], k: number): number[] {
  void nums; void k;
  return [];
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
function sameSet(a: number[], b: number[]) {
  return [...a].sort((x,y)=>x-y).join() === [...b].sort((x,y)=>x-y).join();
}
export async function runPublicTests() {
  return [
    { name: "example_1", pass: sameSet(solve([1,1,1,2,2,3], 2), [1, 2]) },
    { name: "example_2", pass: sameSet(solve([1], 1), [1]) },
    { name: "ties_ok", pass: solve([4,4,5,5,6], 2).length === 2 },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const nums = Array.from({ length: 20000 }, (_, i) => i % 50);
const out = solve(nums, 5);
const results = [
  { name: "large_n", pass: out.length === 5, hidden: true },
  { name: "k1", pass: solve([7,7,7,1], 1)[0] === 7, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "large_n", description: "n≈2e4 top-k" },
      { id: "k1", description: "k=1" },
    ],
    pythonStub: `from typing import List

def solve(nums: List[int], k: int) -> List[int]:
    return []
`,
  },
  "interval-family": {
    solutionStub: `/** Merge overlapping intervals. */
export function solve(intervals: number[][]): number[][] {
  void intervals;
  return [];
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
function eq(a: number[][], b: number[][]) {
  return JSON.stringify(a) === JSON.stringify(b);
}
export async function runPublicTests() {
  return [
    { name: "example_1", pass: eq(solve([[1,3],[2,6],[8,10],[15,18]]), [[1,6],[8,10],[15,18]]) },
    { name: "example_2", pass: eq(solve([[1,4],[4,5]]), [[1,5]]) },
    { name: "empty", pass: eq(solve([]), []) },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
function eq(a: number[][], b: number[][]) {
  return JSON.stringify(a) === JSON.stringify(b);
}
const results = [
  { name: "unsorted", pass: eq(solve([[8,10],[1,3],[2,6]]), [[1,6],[8,10]]), hidden: true },
  { name: "nested", pass: eq(solve([[1,10],[2,3],[4,5]]), [[1,10]]), hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "unsorted", description: "Unsorted input" },
      { id: "nested", description: "Nested intervals" },
    ],
    pythonStub: `from typing import List

def solve(intervals: List[List[int]]) -> List[List[int]]:
    return []
`,
  },
  "tree-family": {
    solutionStub: `export type TreeNode = { val: number; left: TreeNode | null; right: TreeNode | null };
/** Max depth of binary tree. */
export function solve(root: TreeNode | null): number {
  void root;
  return 0;
}
`,
    publicTests: `import { solve, type TreeNode } from "../src/solution.ts";
function n(val: number, left: TreeNode | null = null, right: TreeNode | null = null): TreeNode {
  return { val, left, right };
}
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve(n(3, n(9), n(20, n(15), n(7)))) === 3 },
    { name: "empty", pass: solve(null) === 0 },
    { name: "single", pass: solve(n(1)) === 1 },
  ];
}
`,
    hiddenRunner: `import { solve, type TreeNode } from "../src/solution.ts";
function skew(depth: number): TreeNode | null {
  let root: TreeNode | null = null;
  for (let i = depth; i >= 1; i--) root = { val: i, left: root, right: null };
  return root;
}
const results = [
  { name: "skewed", pass: solve(skew(200)) === 200, hidden: true },
  { name: "neg", pass: solve({ val: -1, left: { val: -2, left: null, right: null }, right: null }) === 2, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "skewed", description: "Deep skewed tree" },
      { id: "neg", description: "Negative values" },
    ],
    pythonStub: `from typing import Optional, Any

def solve(root: Optional[Any]) -> int:
    return 0
`,
  },
  "string-family": {
    solutionStub: `/** True if s is valid parentheses string. */
export function solve(s: string): boolean {
  void s;
  return false;
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve("()") === true },
    { name: "example_2", pass: solve("()[]{}") === true },
    { name: "example_3", pass: solve("(]") === false },
    { name: "nested", pass: solve("{[]}") === true },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const results = [
  { name: "deep", pass: solve("(".repeat(500) + ")".repeat(500)) === true, hidden: true },
  { name: "mismatch", pass: solve("([)]") === false, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "deep", description: "Deep nesting" },
      { id: "mismatch", description: "Interleaved mismatch" },
    ],
    pythonStub: `def solve(s: str) -> bool:
    return False
`,
  },
  "concurrency-family": {
    solutionStub: `const ledger = new Map<string, number>();
/** Charge once per intentId; return { status, total }. */
export function solve(intentId: string, amount: number): { status: "ok" | "duplicate"; total: number } {
  void intentId; void amount;
  return { status: "ok", total: 0 };
}
export function __reset() { ledger.clear(); }
`,
    publicTests: `import { solve, __reset } from "../src/solution.ts";
export async function runPublicTests() {
  __reset();
  const a = solve("i1", 10);
  const b = solve("i1", 10);
  const c = solve("i2", 5);
  return [
    { name: "first_ok", pass: a.status === "ok" && a.total === 10 },
    { name: "duplicate", pass: b.status === "duplicate" && b.total === 10 },
    { name: "other", pass: c.status === "ok" && c.total === 5 },
  ];
}
`,
    hiddenRunner: `import { solve, __reset } from "../src/solution.ts";
__reset();
for (let i = 0; i < 100; i++) solve("storm", 1);
const last = solve("storm", 1);
const results = [
  { name: "retry_storm", pass: last.status === "duplicate" && last.total === 1, hidden: true },
  { name: "interleave", pass: (() => { __reset(); solve("a", 2); solve("b", 3); return solve("a", 9).status === "duplicate"; })(), hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "retry_storm", description: "Retry storm same intent" },
      { id: "interleave", description: "Interleaved intents" },
    ],
    pythonStub: `_ledger = {}

def solve(intent_id: str, amount: int):
    return {"status": "ok", "total": 0}

def __reset():
    _ledger.clear()
`,
  },
  "security-coding": {
    solutionStub: `/** Constant-time-ish string equality for secrets (length still leaks — document). */
export function solve(a: string, b: string): boolean {
  void a; void b;
  return false;
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
export async function runPublicTests() {
  return [
    { name: "equal", pass: solve("secret", "secret") === true },
    { name: "diff", pass: solve("secret", "secreX") === false },
    { name: "len", pass: solve("ab", "abc") === false },
    { name: "empty", pass: solve("", "") === true },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const results = [
  { name: "prefix", pass: solve("aaaa", "aaab") === false, hidden: true },
  { name: "long", pass: solve("x".repeat(1000), "x".repeat(1000)) === true, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "prefix", description: "Prefix mismatch" },
      { id: "long", description: "Long equal secrets" },
    ],
    pythonStub: `def solve(a: str, b: str) -> bool:
    return False
`,
  },
  "sql-logic": {
    solutionStub: `/** Running balance after sorted postings [{id, delta}]. */
export function solve(postings: { id: string; delta: number }[]): number {
  void postings;
  return 0;
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve([{ id: "a", delta: 10 }, { id: "b", delta: -3 }]) === 7 },
    { name: "empty", pass: solve([]) === 0 },
    { name: "neg", pass: solve([{ id: "x", delta: -5 }]) === -5 },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const many = Array.from({ length: 5000 }, (_, i) => ({ id: String(i), delta: 1 }));
const results = [
  { name: "large", pass: solve(many) === 5000, hidden: true },
  { name: "mixed", pass: solve([{ id: "1", delta: 100 }, { id: "2", delta: -40 }, { id: "3", delta: -10 }]) === 50, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "large", description: "Many postings" },
      { id: "mixed", description: "Mixed signs" },
    ],
    pythonStub: `from typing import List, Dict

def solve(postings: List[Dict]) -> int:
    return 0
`,
  },
  "rate-limit-family": {
    solutionStub: `type Hit = { ts: number };
const hits = new Map<string, number[]>();
/** Allow at most limit hits per key in any 60s window ending at now. */
export function solve(key: string, now: number, limit: number): boolean {
  void key; void now; void limit;
  return false;
}
export function __reset() { hits.clear(); }
`,
    publicTests: `import { solve, __reset } from "../src/solution.ts";
export async function runPublicTests() {
  __reset();
  return [
    { name: "first", pass: solve("u", 0, 2) === true },
    { name: "second", pass: solve("u", 1, 2) === true },
    { name: "third_blocked", pass: solve("u", 2, 2) === false },
    { name: "window_slide", pass: solve("u", 61, 2) === true },
  ];
}
`,
    hiddenRunner: `import { solve, __reset } from "../src/solution.ts";
__reset();
const results = [
  { name: "burst", pass: (() => { __reset(); return solve("k", 0, 1) && !solve("k", 0, 1); })(), hidden: true },
  { name: "multi_key", pass: (() => { __reset(); solve("a", 0, 1); return solve("b", 0, 1) === true; })(), hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "burst", description: "Same-timestamp burst" },
      { id: "multi_key", description: "Per-key isolation" },
    ],
    pythonStub: `def solve(key: str, now: int, limit: int) -> bool:
    return False

def __reset():
    pass
`,
  },
  "privacy-coding": {
    solutionStub: `/** Redact emails in text as [EMAIL]. */
export function solve(text: string): string {
  void text;
  return text;
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
export async function runPublicTests() {
  return [
    { name: "simple", pass: solve("hi a@b.co") === "hi [EMAIL]" },
    { name: "none", pass: solve("no secrets") === "no secrets" },
    { name: "multi", pass: solve("x@y.z and q@w.e") === "[EMAIL] and [EMAIL]" },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const results = [
  { name: "plus", pass: solve("a+b@c.d") === "[EMAIL]", hidden: true },
  { name: "keep", pass: solve("contact us").includes("contact") === true, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "plus", description: "Plus-addressing emails" },
      { id: "keep", description: "Non-email text preserved" },
    ],
    pythonStub: `def solve(text: str) -> str:
    return text
`,
  },
  "mobile-logic": {
    solutionStub: `type Mut = { id: string; value: number };
/** Last-write-wins merge by id; later array wins on conflict. */
export function solve(local: Mut[], remote: Mut[]): Mut[] {
  void local; void remote;
  return [];
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
function eq(a: { id: string; value: number }[], b: { id: string; value: number }[]) {
  return JSON.stringify(a.sort((x,y)=>x.id.localeCompare(y.id))) === JSON.stringify(b.sort((x,y)=>x.id.localeCompare(y.id)));
}
export async function runPublicTests() {
  return [
    { name: "merge", pass: eq(solve([{ id: "a", value: 1 }], [{ id: "b", value: 2 }]), [{ id: "a", value: 1 }, { id: "b", value: 2 }]) },
    { name: "lww", pass: eq(solve([{ id: "a", value: 1 }], [{ id: "a", value: 9 }]), [{ id: "a", value: 9 }]) },
    { name: "empty", pass: eq(solve([], []), []) },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const results = [
  { name: "many", pass: solve(Array.from({length:100},(_,i)=>({id:String(i),value:i})), [{id:"0",value:999}]).find(x=>x.id==="0")?.value === 999, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [{ id: "many", description: "Large merge LWW" }],
    pythonStub: `from typing import List, Dict

def solve(local: List[Dict], remote: List[Dict]) -> List[Dict]:
    return []
`,
  },
  "sre-logic": {
    solutionStub: `/** Error rate = errors/total; 0 if total=0. */
export function solve(errors: number, total: number): number {
  void errors; void total;
  return 0;
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
export async function runPublicTests() {
  return [
    { name: "basic", pass: Math.abs(solve(1, 100) - 0.01) < 1e-9 },
    { name: "zero", pass: solve(0, 0) === 0 },
    { name: "all", pass: solve(5, 5) === 1 },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const results = [
  { name: "tiny", pass: Math.abs(solve(1, 1e6) - 1e-6) < 1e-12, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [{ id: "tiny", description: "Small error rates" }],
    pythonStub: `def solve(errors: int, total: int) -> float:
    return 0.0
`,
  },
  /**
   * Fallback judge for sector `*-logic` bank items that do not yet have a dedicated harness.
   * Keeps challengeId → tests bound to a real solve() coding lane (never the SaaS mission pack).
   */
  "sector-logic": {
    solutionStub: `/** Sum of unique integers in nums (sector logic bank). */
export function solve(nums: number[]): number {
  void nums;
  return 0;
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve([1, 2, 2, 3]) === 6 },
    { name: "example_2", pass: solve([5, 5, 5]) === 5 },
    { name: "empty", pass: solve([]) === 0 },
    { name: "negatives", pass: solve([-2, -2, 3]) === 1 },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const big = Array.from({ length: 5000 }, (_, i) => i % 250);
const results = [
  { name: "large_unique", pass: solve(big) === (249 * 250) / 2, hidden: true },
  { name: "single", pass: solve([42]) === 42, hidden: true },
  { name: "zeros", pass: solve([0, 0, 1]) === 1, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "large_unique", description: "n≈5k with duplicates" },
      { id: "single", description: "Single element" },
      { id: "zeros", description: "Zeros with positives" },
    ],
    pythonStub: `from typing import List

def solve(nums: List[int]) -> int:
    return 0
`,
  },
  "bit-family": {
    solutionStub: `/** Number of 1-bits in n (n >= 0). */
export function solve(n: number): number {
  void n;
  return 0;
}
`,
    publicTests: `import { solve } from "../src/solution.ts";
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve(11) === 3 },
    { name: "zero", pass: solve(0) === 0 },
    { name: "power", pass: solve(16) === 1 },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.ts";
const results = [
  { name: "max", pass: solve(0xffffffff >>> 0) === 32, hidden: true },
  { name: "alt", pass: solve(0b10101010) === 4, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
    hiddenHints: [
      { id: "max", description: "All 32 bits set" },
      { id: "alt", description: "Alternating bits" },
    ],
    pythonStub: `def solve(n: int) -> int:
    return 0
`,
  },
};

export function familyKeyFromSlug(slug: string): string | null {
  if (!slug.startsWith("q-")) return null;
  const rest = slug.slice(2);
  const known = Object.keys(FAMILIES).sort((a, b) => b.length - a.length);
  const exact = known.find((k) => rest === k || rest.startsWith(`${k}-`));
  if (exact) return exact;
  // Sector bank keys like edtech-logic-107 — bind to sector-logic fallback harness
  if (/-logic-\d+$/.test(rest) || rest.endsWith("-logic") || /logic-\d+$/.test(rest)) {
    return "sector-logic";
  }
  // Any other unbound q-* coding bank item still gets a real solve() judge
  if (/^.+-\d+$/.test(rest)) return "sector-logic";
  return null;
}

export function familyHarnessForSlug(slug: string): FamilyHarness | null {
  const key = familyKeyFromSlug(slug);
  if (!key) return null;
  const h = FAMILIES[key];
  if (!h) return null;
  return { family: key, ...h };
}

export function familyTsFiles(slug: string, harness: FamilyHarness): StarterFile[] {
  return [
    { path: "src/solution.ts", content: harness.solutionStub, language: "typescript" },
    { path: "tests/public.test.ts", content: harness.publicTests, language: "typescript" },
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
      path: "tests/hidden_run.ts",
      content: harness.hiddenRunner,
      language: "typescript",
    },
    {
      path: "package.json",
      content: JSON.stringify(
        { name: slug, private: true, type: "module", scripts: { test: "node --experimental-strip-types --disable-warning=ExperimentalWarning tests/run.ts" } },
        null,
        2,
      ),
      language: "json",
    },
  ];
}
