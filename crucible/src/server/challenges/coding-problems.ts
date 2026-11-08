import type { ChallengeSeed } from "./catalog";

/** Timed coding evidence sessions (function stubs + public/hidden tests). */
export const CODING_PROBLEM_CATALOG: ChallengeSeed[] = [
  {
    slug: "lc-two-sum",
    title: "1. Two Sum",
    summary: "Return indices of the two numbers that add up to target.",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input has **exactly one solution**, and you may not use the same element twice. You can return the answer in any order.

## Examples

**Example 1**
- Input: \`nums = [2,7,11,15], target = 9\`
- Output: \`[0,1]\`
- Explanation: Because \`nums[0] + nums[1] == 9\`, we return \`[0, 1]\`.

**Example 2**
- Input: \`nums = [3,2,4], target = 6\`
- Output: \`[1,2]\`

**Example 3**
- Input: \`nums = [3,3], target = 6\`
- Output: \`[0,1]\`

## Constraints
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\`
- Only one valid answer exists.

## Follow-up
Can you come up with an algorithm that is less than \`O(n^2)\` time complexity?`,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 3,
    estimatedDays: 1,
    tags: ["coding", "array", "hash-table", "easy"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Google","Amazon","Meta","Apple"],
    frequency: 98,
    avgMinutes: 20,
    isPremium: false,
    publicRequirements: ["Pass all public examples", "Return any valid index pair"],
    hiddenRequirements: ["Large n under time budget", "Negative numbers handled"],
    adaptiveTrack: [
      { level: 1, title: "Brute force OK", criteria: "Public examples pass" },
      { level: 2, title: "Hash map", criteria: "Hidden large cases pass" },
    ],
    gradingRubric: { backend: "Correctness", performance: "Complexity", testing: "Edge cases" },
  },
  {
    slug: "lc-valid-parens",
    title: "2. Valid Parentheses",
    summary: "Determine if a string of brackets is valid.",
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{\`', \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

## Examples

**Example 1** — Input: \`s = "()"\` → Output: \`true\`
**Example 2** — Input: \`s = "()[]{}"\` → Output: \`true\`
**Example 3** — Input: \`s = "(]"\` → Output: \`false\`

## Constraints
- \`1 <= s.length <= 10^4\`
- \`s\` consists of parentheses only \`()[]{}\`.`,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 3,
    estimatedDays: 1,
    tags: ["coding", "stack", "string", "easy"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Amazon","Microsoft","Bloomberg"],
    frequency: 91,
    avgMinutes: 15,
    isPremium: false,
    publicRequirements: ["All public examples pass"],
    hiddenRequirements: ["Long nested strings", "Empty-pair sequences"],
    adaptiveTrack: [{ level: 1, title: "Stack", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness" },
  },
  {
    slug: "lc-merge-intervals",
    title: "3. Merge Intervals",
    summary: "Merge all overlapping intervals.",
    description: `Given an array of \`intervals\` where \`intervals[i] = [starti, endi]\`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.

## Examples

**Example 1**
- Input: \`intervals = [[1,3],[2,6],[8,10],[15,18]]\`
- Output: \`[[1,6],[8,10],[15,18]]\`

**Example 2**
- Input: \`intervals = [[1,4],[4,5]]\`
- Output: \`[[1,5]]\`

## Constraints
- \`1 <= intervals.length <= 10^4\`
- \`intervals[i].length == 2\`
- \`0 <= starti <= endi <= 10^4\``,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 5,
    estimatedDays: 1,
    tags: ["coding", "array", "sorting", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Meta","Google","Uber"],
    frequency: 84,
    avgMinutes: 25,
    isPremium: false,
    publicRequirements: ["Merge overlapping and touching intervals"],
    hiddenRequirements: ["Unsorted input", "Single interval", "Full overlap nest"],
    adaptiveTrack: [{ level: 1, title: "Sort + sweep", criteria: "All cases pass" }],
    gradingRubric: { backend: "Correctness", performance: "O(n log n)" },
  },
  {
    slug: "lc-lru-cache",
    title: "4. LRU Cache",
    summary: "Design a data structure that follows LRU cache constraints.",
    description: `Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.

Implement the \`LRUCache\` class:
- \`LRUCache(capacity)\` Initialize with positive size capacity.
- \`get(key)\` Return the value if key exists, otherwise \`-1\`. Update recency.
- \`put(key, value)\` Update or insert. Evict least recently used when over capacity.

Functions \`get\` and \`put\` must each run in \`O(1)\` average time.

## Example
\`\`\`
LRUCache lRUCache = new LRUCache(2);
lRUCache.put(1, 1); // cache is {1=1}
lRUCache.put(2, 2); // cache is {1=1, 2=2}
lRUCache.get(1);    // return 1
lRUCache.put(3, 3); // LRU key 2 evicted, cache is {1=1, 3=3}
lRUCache.get(2);    // return -1
lRUCache.put(4, 4); // LRU key 1 evicted, cache is {4=4, 3=3}
lRUCache.get(1);    // return -1
lRUCache.get(3);    // return 3
lRUCache.get(4);    // return 4
\`\`\`

## Constraints
- \`1 <= capacity <= 3000\`
- \`0 <= key <= 10^4\`
- \`0 <= value <= 10^5\`
- At most \`2 * 10^5\` calls to \`get\` and \`put\`.`,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 6,
    estimatedDays: 1,
    tags: ["coding", "design", "hash-map", "linked-list", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Amazon","Google","Stripe"],
    frequency: 88,
    avgMinutes: 35,
    isPremium: true,
    publicRequirements: ["Example sequence passes", "O(1) get/put claimed"],
    hiddenRequirements: ["Capacity 1", "Overwrite same key updates recency"],
    adaptiveTrack: [{ level: 1, title: "Map + list", criteria: "Hidden sequences pass" }],
    gradingRubric: { backend: "Semantics", performance: "Amortized O(1)", architecture: "Structure" },
  },
  {
    slug: "lc-course-schedule",
    title: "5. Course Schedule",
    summary: "Detect whether you can finish all courses given prerequisites.",
    description: `There are a total of \`numCourses\` courses labeled from \`0\` to \`numCourses - 1\`. You are given an array \`prerequisites\` where \`prerequisites[i] = [ai, bi]\` indicates that you must take course \`bi\` first if you want to take course \`ai\`.

Return \`true\` if you can finish all courses. Otherwise, return \`false\`.

## Examples

**Example 1**
- Input: \`numCourses = 2, prerequisites = [[1,0]]\`
- Output: \`true\`

**Example 2**
- Input: \`numCourses = 2, prerequisites = [[1,0],[0,1]]\`
- Output: \`false\`

## Constraints
- \`1 <= numCourses <= 2000\`
- \`0 <= prerequisites.length <= 5000\`
- \`prerequisites[i].length == 2\`
- All prerequisite pairs are unique.`,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 5,
    estimatedDays: 1,
    tags: ["coding", "graph", "topo-sort", "dfs", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Amazon","TikTok","Uber"],
    frequency: 76,
    avgMinutes: 30,
    isPremium: false,
    publicRequirements: ["Cycle detection correct"],
    hiddenRequirements: ["Disconnected components", "Long chains"],
    adaptiveTrack: [{ level: 1, title: "Topo / DFS", criteria: "All cases pass" }],
    gradingRubric: { backend: "Graph correctness" },
  },
  {
    slug: "lc-word-break",
    title: "6. Word Break",
    summary: "Segment a string using a dictionary of words.",
    description: `Given a string \`s\` and a dictionary of strings \`wordDict\`, return \`true\` if \`s\` can be segmented into a space-separated sequence of one or more dictionary words.

Note that the same word in the dictionary may be reused multiple times in the segmentation.

## Examples

**Example 1**
- Input: \`s = "leetcode", wordDict = ["leet","code"]\`
- Output: \`true\`

**Example 2**
- Input: \`s = "applepenapple", wordDict = ["apple","pen"]\`
- Output: \`true\`

**Example 3**
- Input: \`s = "catsandog", wordDict = ["cats","dog","sand","and","cat"]\`
- Output: \`false\`

## Constraints
- \`1 <= s.length <= 300\`
- \`1 <= wordDict.length <= 1000\`
- \`1 <= wordDict[i].length <= 20\`
- \`s\` and \`wordDict[i]\` consist of only lowercase English letters.
- All the strings of \`wordDict\` are unique.`,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 6,
    estimatedDays: 1,
    tags: ["coding", "dp", "trie", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Google","Facebook","Apple"],
    frequency: 72,
    avgMinutes: 30,
    isPremium: true,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["Ambiguous splits", "Long s with tiny dict"],
    adaptiveTrack: [{ level: 1, title: "DP", criteria: "Hidden pass" }],
    gradingRubric: { backend: "Correctness", performance: "DP efficiency" },
  },
  {
    slug: "lc-serialize-tree",
    title: "7. Serialize Binary Tree",
    summary: "Serialize and deserialize a binary tree.",
    description: `Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.

## Example
Input tree: \`[1,2,3,null,null,4,5]\`
Output after round-trip: same structure.

## Constraints
- Number of nodes in the tree is in the range \`[0, 10^4]\`
- \`-1000 <= Node.val <= 1000\``,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 7,
    estimatedDays: 1,
    tags: ["coding", "tree", "bfs", "dfs", "hard"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Meta","LinkedIn","Microsoft"],
    frequency: 65,
    avgMinutes: 40,
    isPremium: true,
    publicRequirements: ["Round-trip identity for sample trees"],
    hiddenRequirements: ["Empty tree", "Skewed tree", "Negative values"],
    adaptiveTrack: [{ level: 1, title: "Codec", criteria: "Hidden trees round-trip" }],
    gradingRubric: { backend: "Fidelity", architecture: "Encoding clarity" },
  },
  {
    slug: "lc-rate-limiter",
    title: "8. Design Hit Counter / Rate Limiter",
    summary: "Count hits in the past 5 minutes with efficient queries.",
    description: `Design a hit counter which counts the number of hits received in the past 5 minutes (i.e., the past 300 seconds).

Your system should expose:
- \`hit(timestamp)\` — record a hit at timestamp (in seconds)
- \`getHits(timestamp)\` — return hits in range \`(timestamp - 300, timestamp]\`

Multiple hits may arrive at the same timestamp. Timestamps are passed in chronological order.

## Example
\`\`\`
hit(1); hit(2); hit(3);
getHits(4);   // 3
hit(300);
getHits(300); // 4
getHits(301); // 3
\`\`\`

## Constraints
- \`1 <= timestamp <= 2 * 10^9\`
- All calls are made in chronological order
- At most \`300\` calls to \`hit\` and \`getHits\``,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 5,
    estimatedDays: 1,
    tags: ["coding", "design", "queue", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Stripe","Cloudflare","Databricks"],
    frequency: 70,
    avgMinutes: 35,
    isPremium: true,
    publicRequirements: ["Example sequence passes"],
    hiddenRequirements: ["Same-second bursts", "Window boundary exact"],
    adaptiveTrack: [{ level: 1, title: "Sliding window", criteria: "Hidden pass" }],
    gradingRubric: { backend: "Window correctness", performance: "Efficient queries" },
  },
  {
    slug: "lc-top-k-frequent",
    title: "9. Top K Frequent Elements",
    summary: "Return the k most frequent elements.",
    description: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\` most frequent elements. You may return the answer in any order.

## Examples

**Example 1** — \`nums = [1,1,1,2,2,3], k = 2\` → \`[1,2]\`
**Example 2** — \`nums = [1], k = 1\` → \`[1]\`

## Constraints
- \`1 <= nums.length <= 10^5\`
- \`-10^4 <= nums[i] <= 10^4\`
- \`k\` is in the range \`[1, number of unique elements]\`
- It is **guaranteed** that the answer is unique.

## Follow-up
Better than \`O(n log n)\` — heap or bucket sort.`,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 5,
    estimatedDays: 1,
    tags: ["coding", "heap", "hash-table", "bucket-sort", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Amazon","Meta","Apple"],
    frequency: 80,
    avgMinutes: 25,
    isPremium: false,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["Large n", "Ties not present (guaranteed unique)"],
    adaptiveTrack: [{ level: 1, title: "Heap/bucket", criteria: "Hidden pass" }],
    gradingRubric: { backend: "Correctness", performance: "Near-linear" },
  },
  {
    slug: "lc-min-window",
    title: "10. Minimum Window Substring",
    summary: "Find the smallest window in s covering all characters in t.",
    description: `Given two strings \`s\` and \`t\` of lengths \`m\` and \`n\` respectively, return the **minimum window substring** of \`s\` such that every character in \`t\` (including duplicates) is included in the window. If there is no such substring, return the empty string \`""\`.

The testcases will be generated such that the answer is **unique**.

## Examples

**Example 1**
- Input: \`s = "ADOBECODEBANC", t = "ABC"\`
- Output: \`"BANC"\`

**Example 2**
- Input: \`s = "a", t = "a"\`
- Output: \`"a"\`

**Example 3**
- Input: \`s = "a", t = "aa"\`
- Output: \`""\`

## Constraints
- \`m == s.length\`
- \`n == t.length\`
- \`1 <= m, n <= 10^5\`
- \`s\` and \`t\` consist of uppercase and lowercase English letters.

## Follow-up
Could you find an algorithm that runs in \`O(m + n)\` time?`,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 8,
    estimatedDays: 1,
    tags: ["coding", "sliding-window", "hash-table", "hard"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Google","Uber","Adobe"],
    frequency: 74,
    avgMinutes: 40,
    isPremium: true,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["Duplicates in t", "No window", "Full-string window"],
    adaptiveTrack: [{ level: 1, title: "Two pointers", criteria: "Hidden pass" }],
    gradingRubric: { backend: "Correctness", performance: "Linear scan" },
  },
  {
    slug: "lc-secure-password",
    title: "11. Strong Password Checker (Lab)",
    summary: "Validate password strength rules without leaking timing signals.",
    description: `Implement \`strongPassword(password: string): boolean\` that returns true only if:
1. Length is between 8 and 64 inclusive
2. Contains at least one lowercase, one uppercase, and one digit
3. Contains at least one of \`!@#$%^&*\`
4. Does not contain the substring \`"password"\` (case-insensitive)
5. Comparison of the forbidden substring must be **constant-time style** (no early \`return\` on first mismatch in your helper — use a full scan accumulator)

## Examples
- \`"Abcdef1!"\` → \`true\`
- \`"short1!"\` → \`false\` (too short)
- \`"Password1!"\` → \`false\` (contains password)

## Constraints
- \`1 <= password.length <= 200\`
- ASCII printable characters`,
    type: "CODING_PROBLEM",
    track: "CYBERSECURITY",
    difficulty: 4,
    estimatedDays: 1,
    tags: ["coding", "security", "validation", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Cloudflare","Okta","CrowdStrike"],
    frequency: 55,
    avgMinutes: 25,
    isPremium: false,
    publicRequirements: ["Rule checks correct"],
    hiddenRequirements: ["Case-insensitive password ban", "Boundary lengths"],
    adaptiveTrack: [{ level: 1, title: "Validate", criteria: "Public+hidden pass" }],
    owaspMappings: ["A07:2021"],
    gradingRubric: { security: "Rule completeness", backend: "Correctness" },
  },
  {
    slug: "lc-idempotent-charge",
    title: "12. Idempotent Charge",
    summary: "Process payment intents exactly once under retries.",
    description: `Implement \`charge(intentId: string, amount: number): { status: "ok" | "duplicate"; totalCharged: number }\`.

Semantics:
- First call with a new \`intentId\` charges \`amount\` and returns \`status: "ok"\`
- Subsequent calls with the same \`intentId\` must **not** charge again and return \`status: "duplicate"\` with the original amount reflected in \`totalCharged\` (sum of unique intents)
- Different intent IDs accumulate in \`totalCharged\`

## Examples
\`\`\`
charge("a", 10) → { status: "ok", totalCharged: 10 }
charge("a", 10) → { status: "duplicate", totalCharged: 10 }
charge("b", 5)  → { status: "ok", totalCharged: 15 }
\`\`\`

## Constraints
- At most \`10^5\` calls
- \`amount > 0\``,
    type: "CODING_PROBLEM",
    track: "SECURE_FULL_STACK",
    difficulty: 4,
    estimatedDays: 1,
    tags: ["coding", "idempotency", "payments", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Stripe","Square","Shopify"],
    frequency: 68,
    avgMinutes: 30,
    isPremium: true,
    publicRequirements: ["Example sequence passes"],
    hiddenRequirements: ["Interleaved intents", "Large retry storms"],
    adaptiveTrack: [{ level: 1, title: "Idempotency key", criteria: "Hidden pass" }],
    gradingRubric: { backend: "Exactly-once effects", reliability: "Retry safety" },
  },
];

export function isCodingProblem(challenge: { type?: string; tags?: string[]; slug?: string }) {
  return (
    challenge.type === "CODING_PROBLEM" ||
    challenge.tags?.includes("coding") === true ||
    (challenge.slug?.startsWith("lc-") ?? false) ||
    (challenge.slug?.startsWith("q-") ?? false)
  );
}

export { difficultyBand as difficultyLabel } from "@/lib/difficulty";
