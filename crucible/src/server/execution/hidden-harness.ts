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
  "lc-contains-duplicate": [
    { id: "unique", description: "All unique large", evidenceTokens: ["set", "map"] },
    { id: "pair_end", description: "Duplicate at ends", evidenceTokens: ["set"] },
  ],
  "lc-valid-anagram": [
    { id: "len_mismatch", description: "Different lengths", evidenceTokens: ["length"] },
    { id: "same_letters", description: "Permutation edge", evidenceTokens: ["count", "map"] },
  ],
  "lc-best-time-stock": [
    { id: "flat", description: "Flat prices", evidenceTokens: ["min", "max"] },
    { id: "late_min", description: "Min near end", evidenceTokens: ["min"] },
  ],
  "lc-binary-search": [
    { id: "first", description: "Target is first", evidenceTokens: ["mid", "left"] },
    { id: "last", description: "Target is last", evidenceTokens: ["mid", "right"] },
  ],
  "lc-climbing-stairs": [
    { id: "one", description: "n = 1", evidenceTokens: ["1"] },
    { id: "forty_five", description: "n = 45", evidenceTokens: ["dp", "a", "b"] },
  ],
  "lc-invert-tree": [
    { id: "single", description: "Single node", evidenceTokens: ["left", "right"] },
    { id: "skewed", description: "Left-skewed", evidenceTokens: ["left", "right"] },
  ],
  "lc-max-depth-tree": [
    { id: "chain", description: "Skewed chain", evidenceTokens: ["max", "left"] },
    { id: "balanced", description: "Balanced depth", evidenceTokens: ["max"] },
  ],
  "lc-product-except-self": [
    { id: "two_zeros", description: "Two zeros", evidenceTokens: ["prefix", "suffix"] },
    { id: "negatives", description: "All negatives", evidenceTokens: ["prefix"] },
  ],
  "lc-longest-substring": [
    { id: "empty", description: "Empty string", evidenceTokens: ["set", "map"] },
    { id: "all_unique", description: "All unique chars", evidenceTokens: ["set"] },
  ],
  "lc-group-anagrams": [
    { id: "singles", description: "All unique", evidenceTokens: ["map", "sort"] },
    { id: "empties", description: "Multiple empties", evidenceTokens: ["map"] },
  ],
  "lc-number-of-islands": [
    { id: "single", description: "Single land cell", evidenceTokens: ["dfs", "bfs"] },
    { id: "water", description: "All water", evidenceTokens: ["0"] },
  ],
  "lc-coin-change": [
    { id: "zero", description: "amount 0", evidenceTokens: ["dp"] },
    { id: "impossible", description: "Impossible set", evidenceTokens: ["dp"] },
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

    case "lc-contains-duplicate":
      return `import { containsDuplicate } from "../src/solution.ts";
const big = Array.from({ length: 5000 }, (_, i) => i);
const results = [
  { name: "unique", pass: containsDuplicate(big) === false, hidden: true },
  { name: "pair_end", pass: containsDuplicate([0, ...big.slice(1), 0]) === true, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-valid-anagram":
      return `import { isAnagram } from "../src/solution.ts";
const results = [
  { name: "len_mismatch", pass: isAnagram("ab", "a") === false, hidden: true },
  { name: "same_letters", pass: isAnagram("aacc", "ccac") === false && isAnagram("aacc", "ccaa") === true, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-best-time-stock":
      return `import { maxProfit } from "../src/solution.ts";
const results = [
  { name: "flat", pass: maxProfit([3, 3, 3, 3]) === 0, hidden: true },
  { name: "late_min", pass: maxProfit([5, 4, 3, 2, 10]) === 8, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-binary-search":
      return `import { search } from "../src/solution.ts";
const nums = Array.from({ length: 1000 }, (_, i) => i * 2);
const results = [
  { name: "first", pass: search(nums, 0) === 0, hidden: true },
  { name: "last", pass: search(nums, 1998) === 999, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-climbing-stairs":
      return `import { climbStairs } from "../src/solution.ts";
const results = [
  { name: "one", pass: climbStairs(1) === 1, hidden: true },
  { name: "forty_five", pass: climbStairs(45) === 1836311903, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-invert-tree":
      return `import { invertTree, type TreeNode } from "../src/solution.ts";
function node(val: number, left: TreeNode | null = null, right: TreeNode | null = null): TreeNode {
  return { val, left, right };
}
function same(a: TreeNode | null, b: TreeNode | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.val === b.val && same(a.left, b.left) && same(a.right, b.right);
}
const single = node(1);
const skewed = node(1, node(2, node(3), null), null);
const results = [
  { name: "single", pass: same(invertTree(single), node(1)), hidden: true },
  { name: "skewed", pass: same(invertTree(skewed), node(1, null, node(2, null, node(3)))), hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-max-depth-tree":
      return `import { maxDepth, type TreeNode } from "../src/solution.ts";
function node(val: number, left: TreeNode | null = null, right: TreeNode | null = null): TreeNode {
  return { val, left, right };
}
let chain: TreeNode | null = null;
for (let i = 0; i < 20; i++) chain = node(i, chain, null);
const results = [
  { name: "chain", pass: maxDepth(chain) === 20, hidden: true },
  { name: "balanced", pass: maxDepth(node(1, node(2, node(3), node(4)), node(5))) === 3, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-product-except-self":
      return `import { productExceptSelf } from "../src/solution.ts";
function eq(a: number[], b: number[]) { return a.length === b.length && a.every((v, i) => v === b[i]); }
const results = [
  { name: "two_zeros", pass: eq(productExceptSelf([0, 1, 0]), [0, 0, 0]), hidden: true },
  { name: "negatives", pass: eq(productExceptSelf([-1, -2, -3]), [6, 3, 2]), hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-longest-substring":
      return `import { lengthOfLongestSubstring } from "../src/solution.ts";
const results = [
  { name: "empty", pass: lengthOfLongestSubstring("") === 0, hidden: true },
  { name: "all_unique", pass: lengthOfLongestSubstring("abcdef") === 6, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-group-anagrams":
      return `import { groupAnagrams } from "../src/solution.ts";
function norm(groups: string[][]) {
  return groups.map((g) => [...g].sort().join("\\0")).sort().join("|");
}
const results = [
  { name: "singles", pass: norm(groupAnagrams(["a", "b", "c"])) === norm([["a"], ["b"], ["c"]]), hidden: true },
  { name: "empties", pass: norm(groupAnagrams(["", ""])) === norm([["", ""]]), hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-number-of-islands":
      return `import { numIslands } from "../src/solution.ts";
const results = [
  { name: "single", pass: numIslands([["1"]]) === 1, hidden: true },
  { name: "water", pass: numIslands([["0", "0"], ["0", "0"]]) === 0, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`;
    case "lc-coin-change":
      return `import { coinChange } from "../src/solution.ts";
const results = [
  { name: "zero", pass: coinChange([1, 2, 5], 0) === 0, hidden: true },
  { name: "impossible", pass: coinChange([3, 5], 1) === -1, hidden: true },
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
