import { familyHarnessForSlug } from "./coding-family-harness";

/**
 * Coding-problem hidden cases keyed by challenge slug.
 * Executed against candidate solution evidence (AST-free runtime eval via process runner files).
 */
export type HiddenCase = {
  id: string;
  description: string;
  /** Tokens that must appear in solution for heuristic fallback when language runner lacks a full harness */
  evidenceTokens?: string[];
};

export const HIDDEN_CASES: Record<string, HiddenCase[]> = {
  "lc-two-sum": [
    { id: "negatives", description: "Handles negatives", evidenceTokens: ["map", "target"] },
    { id: "large_n", description: "Scales past nested loops", evidenceTokens: ["map", "for"] },
  ],
  "lc-valid-parens": [
    { id: "long_nested", description: "Deep nesting", evidenceTokens: ["stack", "push"] },
    { id: "empty_pairs", description: "Many () pairs", evidenceTokens: ["stack"] },
  ],
  "lc-merge-intervals": [
    { id: "unsorted", description: "Unsorted input", evidenceTokens: ["sort"] },
    { id: "nested", description: "Fully nested intervals", evidenceTokens: ["sort", "push"] },
  ],
  "lc-lru-cache": [
    { id: "cap1", description: "Capacity 1", evidenceTokens: ["map", "delete"] },
    { id: "update_recency", description: "Overwrite updates recency", evidenceTokens: ["get", "put"] },
  ],
  "lc-course-schedule": [
    { id: "components", description: "Disconnected components", evidenceTokens: ["graph", "dfs"] },
    { id: "long_chain", description: "Long dependency chain", evidenceTokens: ["queue", "degree"] },
  ],
  "lc-word-break": [
    { id: "ambiguous", description: "Ambiguous splits", evidenceTokens: ["dp", "set"] },
    { id: "long_s", description: "Long string performance", evidenceTokens: ["dp"] },
  ],
  "lc-serialize-tree": [
    { id: "skewed", description: "Skewed tree", evidenceTokens: ["serialize", "deserialize"] },
    { id: "negatives", description: "Negative node values", evidenceTokens: ["split", "queue"] },
  ],
  "lc-rate-limiter": [
    { id: "burst", description: "Same-second bursts", evidenceTokens: ["queue", "hit"] },
    { id: "boundary", description: "Exact 300s boundary", evidenceTokens: ["300"] },
  ],
  "lc-top-k-frequent": [
    { id: "large_n", description: "n ≈ 1e5 performance", evidenceTokens: ["map", "bucket"] },
  ],
  "lc-min-window": [
    { id: "dupes", description: "Duplicates in t", evidenceTokens: ["need", "have"] },
    { id: "full", description: "Full-string window", evidenceTokens: ["left", "right"] },
  ],
  "lc-secure-password": [
    { id: "case_ban", description: "Case-insensitive password ban", evidenceTokens: ["tolower", "password"] },
    { id: "bounds", description: "Length 8 and 64 bounds", evidenceTokens: ["length", "8"] },
  ],
  "lc-idempotent-charge": [
    { id: "interleave", description: "Interleaved intents", evidenceTokens: ["map", "intent"] },
    { id: "retries", description: "Retry storm same id", evidenceTokens: ["duplicate", "map"] },
  ],
};

/** Build a Node harness snippet that imports solution + asserts hidden fixtures for TS workspaces. */
export function hiddenTsRunnerSource(slug: string): string | null {
  switch (slug) {
    case "lc-two-sum":
      return `import { twoSum } from "../src/solution.ts";
function samePair(a: number[], b: number[]) {
  if (a.length !== 2 || b.length !== 2) return false;
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}
const results = [
  { name: "negatives", pass: samePair(twoSum([-1, -2, -3, -4, -5], -8), [2, 4]), hidden: true },
  { name: "large_n", pass: (() => {
    // Unique pair at the end — fillers never sum to target.
    const nums = Array.from({ length: 5000 }, (_, i) => i * 10);
    nums[4998] = 1_000_000;
    nums[4999] = -999_991;
    return samePair(twoSum(nums, 9), [4998, 4999]);
  })(), hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-valid-parens":
      return `import { isValid } from "../src/solution.ts";
const deep = "(".repeat(2000) + ")".repeat(2000);
const many = "()".repeat(3000);
const results = [
  { name: "long_nested", pass: isValid(deep) === true, hidden: true },
  { name: "empty_pairs", pass: isValid(many) === true, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-merge-intervals":
      return `import { merge } from "../src/solution.ts";
function eq(a: number[][], b: number[][]) { return JSON.stringify(a) === JSON.stringify(b); }
const results = [
  { name: "unsorted", pass: eq(merge([[8,10],[1,3],[2,6],[15,18]]), [[1,6],[8,10],[15,18]]), hidden: true },
  { name: "nested", pass: eq(merge([[1,10],[2,3],[4,5]]), [[1,10]]), hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-lru-cache":
      return `import { LRUCache } from "../src/solution.ts";
const c1 = new LRUCache(1);
c1.put(1, 1); c1.put(2, 2);
const cap1 = c1.get(1) === -1 && c1.get(2) === 2;
const c2 = new LRUCache(2);
c2.put(1, 1); c2.put(2, 2); c2.put(1, 9); c2.put(3, 3);
const recency = c2.get(2) === -1 && c2.get(1) === 9;
const results = [
  { name: "cap1", pass: cap1, hidden: true },
  { name: "update_recency", pass: recency, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-idempotent-charge":
      return `import { charge } from "../src/solution.ts";
const a = charge("x", 10);
const b = charge("y", 5);
const c = charge("x", 10);
const d = charge("x", 10);
const results = [
  { name: "interleave", pass: a.status === "ok" && b.status === "ok" && b.totalCharged === 15, hidden: true },
  { name: "retries", pass: c.status === "duplicate" && d.status === "duplicate" && d.totalCharged === 15, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-top-k-frequent":
      return `import { topKFrequent } from "../src/solution.ts";
function sameSet(a: number[], b: number[]) {
  return [...a].sort((x,y)=>x-y).join(",") === [...b].sort((x,y)=>x-y).join(",");
}
const nums = Array.from({ length: 10000 }, (_, i) => i % 50);
const results = [
  { name: "large_n", pass: sameSet(topKFrequent(nums, 3), [0,1,2]) || topKFrequent(nums, 3).length === 3, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-secure-password":
      return `import { strongPassword } from "../src/solution.ts";
const results = [
  { name: "case_ban", pass: strongPassword("MyPaSsWoRd1!") === false, hidden: true },
  { name: "bounds", pass: strongPassword("Abcdef1!") === true && strongPassword("Ab1!xxxx".repeat(9)) === false, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    default: {
      const family = familyHarnessForSlug(slug);
      return family?.hiddenRunner ?? null;
    }
  }
}
