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

  {
    slug: "lc-contains-duplicate",
    title: "13. Contains Duplicate",
    summary: "Return true if any value appears at least twice.",
    description: `Given an integer array \`nums\`, return \`true\` if any value appears **at least twice** in the array, and return \`false\` if every element is distinct.

## Examples
- \`[1,2,3,1]\` → \`true\`
- \`[1,2,3,4]\` → \`false\`
- \`[1,1,1,3,3,4,3,2,4,2]\` → \`true\`

## Constraints
- \`1 <= nums.length <= 10^5\`
- \`-10^9 <= nums[i] <= 10^9\``,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 2,
    estimatedDays: 1,
    tags: ["coding", "array", "hash-table", "easy"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Amazon", "Apple", "Google"],
    frequency: 86,
    avgMinutes: 15,
    isPremium: false,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["Large n", "All unique"],
    adaptiveTrack: [{ level: 1, title: "Set scan", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness", performance: "O(n)" },
  },
  {
    slug: "lc-valid-anagram",
    title: "14. Valid Anagram",
    summary: "Check whether two strings are anagrams.",
    description: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.

## Examples
- \`s = "anagram", t = "nagaram"\` → \`true\`
- \`s = "rat", t = "car"\` → \`false\`

## Constraints
- \`1 <= s.length, t.length <= 5 * 10^4\`
- \`s\` and \`t\` consist of lowercase English letters.`,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 2,
    estimatedDays: 1,
    tags: ["coding", "string", "hash-table", "easy"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Meta", "Bloomberg", "Microsoft"],
    frequency: 82,
    avgMinutes: 15,
    isPremium: false,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["Different lengths", "Unicode-safe for a-z"],
    adaptiveTrack: [{ level: 1, title: "Counts", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness" },
  },
  {
    slug: "lc-best-time-stock",
    title: "15. Best Time to Buy and Sell Stock",
    summary: "Max profit from one buy and one sell.",
    description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`th day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return the maximum profit. If you cannot achieve any profit, return \`0\`.

## Examples
- \`[7,1,5,3,6,4]\` → \`5\` (buy 1, sell 6)
- \`[7,6,4,3,1]\` → \`0\`

## Constraints
- \`1 <= prices.length <= 10^5\`
- \`0 <= prices[i] <= 10^4\``,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 3,
    estimatedDays: 1,
    tags: ["coding", "array", "dp", "easy"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Amazon", "Google", "Bloomberg"],
    frequency: 90,
    avgMinutes: 20,
    isPremium: false,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["Strictly decreasing", "Large n"],
    adaptiveTrack: [{ level: 1, title: "One pass min", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness", performance: "O(n)" },
  },
  {
    slug: "lc-binary-search",
    title: "16. Binary Search",
    summary: "Find target index in a sorted array or return -1.",
    description: `Given an array of integers \`nums\` sorted in ascending order and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, return its index. Otherwise, return \`-1\`.

You must write an algorithm with \`O(log n)\` runtime complexity.

## Examples
- \`nums = [-1,0,3,5,9,12], target = 9\` → \`4\`
- \`nums = [-1,0,3,5,9,12], target = 2\` → \`-1\`

## Constraints
- \`1 <= nums.length <= 10^4\`
- \`-10^4 < nums[i], target < 10^4\`
- All integers in \`nums\` are **unique**
- \`nums\` is sorted in ascending order`,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 2,
    estimatedDays: 1,
    tags: ["coding", "binary-search", "array", "easy"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Meta", "Microsoft", "Apple"],
    frequency: 88,
    avgMinutes: 15,
    isPremium: false,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["First/last element", "Missing target"],
    adaptiveTrack: [{ level: 1, title: "Binary search", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness", performance: "O(log n)" },
  },
  {
    slug: "lc-climbing-stairs",
    title: "17. Climbing Stairs",
    summary: "Count distinct ways to climb n steps taking 1 or 2 at a time.",
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?

## Examples
- \`n = 2\` → \`2\` (1+1, 2)
- \`n = 3\` → \`3\` (1+1+1, 1+2, 2+1)

## Constraints
- \`1 <= n <= 45\``,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 2,
    estimatedDays: 1,
    tags: ["coding", "dp", "math", "easy"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Amazon", "Adobe", "Apple"],
    frequency: 80,
    avgMinutes: 15,
    isPremium: false,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["n=1", "n=45"],
    adaptiveTrack: [{ level: 1, title: "Fibonacci DP", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness" },
  },
  {
    slug: "lc-invert-tree",
    title: "18. Invert Binary Tree",
    summary: "Mirror a binary tree.",
    description: `Given the \`root\` of a binary tree, invert the tree, and return its root.

## Examples
- \`[4,2,7,1,3,6,9]\` → \`[4,7,2,9,6,3,1]\`
- \`[2,1,3]\` → \`[2,3,1]\`
- \`[]\` → \`[]\`

TreeNode is provided as \`{ val: number; left: TreeNode | null; right: TreeNode | null }\`.

## Constraints
- Number of nodes in \`[0, 100]\`
- \`-100 <= Node.val <= 100\``,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 3,
    estimatedDays: 1,
    tags: ["coding", "tree", "dfs", "easy"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Google", "Meta", "Amazon"],
    frequency: 85,
    avgMinutes: 20,
    isPremium: false,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["Skewed tree", "Single node"],
    adaptiveTrack: [{ level: 1, title: "Recurse/BFS", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness" },
  },
  {
    slug: "lc-max-depth-tree",
    title: "19. Maximum Depth of Binary Tree",
    summary: "Return the max depth of a binary tree.",
    description: `Given the \`root\` of a binary tree, return its maximum depth.

A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.

## Examples
- \`[3,9,20,null,null,15,7]\` → \`3\`
- \`[1,null,2]\` → \`2\`

## Constraints
- Number of nodes in \`[0, 10^4]\`
- \`-100 <= Node.val <= 100\``,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 2,
    estimatedDays: 1,
    tags: ["coding", "tree", "dfs", "easy"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["LinkedIn", "Amazon", "Microsoft"],
    frequency: 78,
    avgMinutes: 15,
    isPremium: false,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["Empty tree", "Skewed chain"],
    adaptiveTrack: [{ level: 1, title: "DFS depth", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness" },
  },
  {
    slug: "lc-product-except-self",
    title: "20. Product of Array Except Self",
    summary: "Return product of all elements except nums[i] without division.",
    description: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`.

The product of any prefix or suffix of \`nums\` is **guaranteed** to fit in a 32-bit integer.

You must write an algorithm that runs in \`O(n)\` time and without using the division operation.

## Examples
- \`[1,2,3,4]\` → \`[24,12,8,6]\`
- \`[-1,1,0,-3,3]\` → \`[0,0,9,0,0]\`

## Constraints
- \`2 <= nums.length <= 10^5\`
- \`-30 <= nums[i] <= 30\``,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 5,
    estimatedDays: 1,
    tags: ["coding", "array", "prefix", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Meta", "Amazon", "Apple"],
    frequency: 87,
    avgMinutes: 25,
    isPremium: false,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["Zeros", "Negatives"],
    adaptiveTrack: [{ level: 1, title: "Prefix/suffix", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness", performance: "O(n) no division" },
  },
  {
    slug: "lc-longest-substring",
    title: "21. Longest Substring Without Repeating Characters",
    summary: "Length of the longest substring without repeating characters.",
    description: `Given a string \`s\`, find the length of the longest substring without repeating characters.

## Examples
- \`"abcabcbb"\` → \`3\` (\`"abc"\`)
- \`"bbbbb"\` → \`1\`
- \`"pwwkew"\` → \`3\` (\`"wke"\`)

## Constraints
- \`0 <= s.length <= 5 * 10^4\`
- \`s\` consists of English letters, digits, symbols and spaces.`,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 5,
    estimatedDays: 1,
    tags: ["coding", "string", "sliding-window", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Amazon", "Bloomberg", "Adobe"],
    frequency: 93,
    avgMinutes: 30,
    isPremium: false,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["Empty string", "All unique"],
    adaptiveTrack: [{ level: 1, title: "Sliding window", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness", performance: "O(n)" },
  },
  {
    slug: "lc-group-anagrams",
    title: "22. Group Anagrams",
    summary: "Group strings that are anagrams of each other.",
    description: `Given an array of strings \`strs\`, group the anagrams together. You can return the answer in **any order**.

## Examples
- \`["eat","tea","tan","ate","nat","bat"]\` → \`[["bat"],["nat","tan"],["ate","eat","tea"]]\`
- \`[""]\` → \`[[""]]\`
- \`["a"]\` → \`[["a"]]\`

## Constraints
- \`1 <= strs.length <= 10^4\`
- \`0 <= strs[i].length <= 100\`
- \`strs[i]\` consists of lowercase English letters.`,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 5,
    estimatedDays: 1,
    tags: ["coding", "hash-table", "string", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Uber", "Meta", "Amazon"],
    frequency: 84,
    avgMinutes: 25,
    isPremium: false,
    publicRequirements: ["Groups match ignoring order"],
    hiddenRequirements: ["Empty strings", "Large n"],
    adaptiveTrack: [{ level: 1, title: "Sorted key map", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness" },
  },
  {
    slug: "lc-number-of-islands",
    title: "23. Number of Islands",
    summary: "Count islands of '1's in a 2D grid.",
    description: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are surrounded by water.

## Examples
- Grid with two land blobs → \`2\`
- All water → \`0\`

## Constraints
- \`m == grid.length\`
- \`n == grid[i].length\`
- \`1 <= m, n <= 300\`
- \`grid[i][j]\` is \`'0'\` or \`'1'\``,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 6,
    estimatedDays: 1,
    tags: ["coding", "graph", "dfs", "bfs", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Amazon", "Google", "Meta"],
    frequency: 89,
    avgMinutes: 30,
    isPremium: false,
    publicRequirements: ["Public grids pass"],
    hiddenRequirements: ["Single cell", "Checkerboard"],
    adaptiveTrack: [{ level: 1, title: "Flood fill", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness" },
  },
  {
    slug: "lc-coin-change",
    title: "24. Coin Change",
    summary: "Fewest coins to make amount, or -1.",
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

You may assume that you have an infinite number of each kind of coin.

## Examples
- \`coins = [1,2,5], amount = 11\` → \`3\` (5+5+1)
- \`coins = [2], amount = 3\` → \`-1\`
- \`coins = [1], amount = 0\` → \`0\`

## Constraints
- \`1 <= coins.length <= 12\`
- \`1 <= coins[i] <= 2^31 - 1\`
- \`0 <= amount <= 10^4\``,
    type: "CODING_PROBLEM",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 6,
    estimatedDays: 1,
    tags: ["coding", "dp", "medium"],
    languages: ["typescript", "javascript", "python", "go", "rust", "java"],
    companies: ["Amazon", "Microsoft", "Uber"],
    frequency: 81,
    avgMinutes: 30,
    isPremium: false,
    publicRequirements: ["Public examples pass"],
    hiddenRequirements: ["amount 0", "Impossible amount"],
    adaptiveTrack: [{ level: 1, title: "Unbounded knapsack DP", criteria: "Public + hidden pass" }],
    gradingRubric: { backend: "Correctness" },
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
