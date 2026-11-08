import type { AssessmentTrack } from "@prisma/client";
import type { ChallengeSeed } from "./catalog";
import { DIFFICULTY_BLURBS, difficultyBand, difficultyFromIndex } from "./difficulty";

type Family = {
  key: string;
  title: string;
  tags: string[];
  tracks: AssessmentTrack[];
  prompt: (n: number, d: number) => { summary: string; description: string; publicReqs: string[]; hiddenReqs: string[] };
};

/** Practice families — procedurally expanded; not claimed as real company interview items. */
const FAMILIES: Family[] = [
  {
    key: "two-sum-family",
    title: "Pair Sum Variants",
    tags: ["coding", "array", "hash-table"],
    tracks: ["SOFTWARE_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `Find index pairs that satisfy a sum/constraint variant #${n}.`,
      description: `Implement a pair-sum style problem (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}\n\nReturn correct indices under the stated constraints. Prefer O(n) with a hash map when difficulty ≥ 4.`,
      publicReqs: ["Pass public examples", "Handle duplicates correctly"],
      hiddenReqs: d >= 7 ? ["n≈1e5 under time", "Negatives + overflow-safe"] : ["Hidden edge pairs"],
    }),
  },
  {
    key: "window-family",
    title: "Sliding Window Variants",
    tags: ["coding", "sliding-window", "string", "array"],
    tracks: ["SOFTWARE_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `Sliding-window optimum for variant #${n}.`,
      description: `Maintain a window that optimizes a count/sum/unique constraint (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct window bounds", "Public examples"],
      hiddenReqs: d >= 8 ? ["Unicode-safe", "Pathological repeats"] : ["Empty / single-element"],
    }),
  },
  {
    key: "graph-family",
    title: "Graph Traversal Variants",
    tags: ["coding", "graphs", "bfs", "dfs"],
    tracks: ["SOFTWARE_ENGINEERING", "PLATFORM_SRE"],
    prompt: (n, d) => ({
      summary: `Graph reachability / topo / shortest path variant #${n}.`,
      description: `Operate on an adjacency list (variant ${n}). Detect cycles or compute distances as specified.\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct BFS/DFS or topo", "Public fixtures"],
      hiddenReqs: d >= 9 ? ["1e5 nodes memory-tight", "Disconnected + cycles"] : ["Cycle detection"],
    }),
  },
  {
    key: "dp-family",
    title: "Dynamic Programming Variants",
    tags: ["coding", "dp", "recursion"],
    tracks: ["SOFTWARE_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `DP formulation variant #${n}.`,
      description: `Derive a DP recurrence and implement it (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct recurrence", "Base cases"],
      hiddenReqs: d >= 8 ? ["Memory-optimized", "Large n"] : ["Off-by-one bases"],
    }),
  },
  {
    key: "heap-family",
    title: "Heap / Top-K Variants",
    tags: ["coding", "heap", "sorting"],
    tracks: ["SOFTWARE_ENGINEERING", "DATA_ML"],
    prompt: (n, d) => ({
      summary: `Top-K / streaming heap variant #${n}.`,
      description: `Maintain a heap (or equivalent) for top-K queries (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct top-K", "Stable on ties where required"],
      hiddenReqs: d >= 7 ? ["Streaming updates", "n≈1e6"] : ["K=1 and K=n"],
    }),
  },
  {
    key: "interval-family",
    title: "Interval Scheduling Variants",
    tags: ["coding", "sorting", "greedy", "array"],
    tracks: ["SOFTWARE_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `Merge / schedule intervals variant #${n}.`,
      description: `Sort and sweep intervals (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Merge or schedule correctly", "Public examples"],
      hiddenReqs: d >= 8 ? ["Touching edges", "1e5 intervals"] : ["Empty list"],
    }),
  },
  {
    key: "tree-family",
    title: "Binary Tree Variants",
    tags: ["coding", "trees", "recursion"],
    tracks: ["SOFTWARE_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `Tree serialize / path / LCA-style variant #${n}.`,
      description: `Manipulate binary trees (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct traversal logic", "Public trees"],
      hiddenReqs: d >= 9 ? ["Skewed 1e4 depth iterative", "Null-heavy"] : ["Single node"],
    }),
  },
  {
    key: "string-family",
    title: "String Algorithm Variants",
    tags: ["coding", "strings", "hash-table"],
    tracks: ["SOFTWARE_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `String matching / parsing variant #${n}.`,
      description: `Process strings under the variant ${n} rules.\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct parsing", "Examples"],
      hiddenReqs: d >= 8 ? ["Unicode", "Adversarial repeats"] : ["Empty string"],
    }),
  },
  {
    key: "concurrency-family",
    title: "Concurrency Puzzle Variants",
    tags: ["coding", "concurrency", "idempotency"],
    tracks: ["SOFTWARE_ENGINEERING", "SECURE_FULL_STACK", "PLATFORM_SRE"],
    prompt: (n, d) => ({
      summary: `Concurrency / idempotency puzzle #${n}.`,
      description: `Implement a thread-safe or idempotent API stub (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Functional single-thread path", "Idempotent key behavior"],
      hiddenReqs: d >= 7 ? ["Race harness", "Double-submit"] : ["Duplicate key"],
    }),
  },
  {
    key: "security-coding",
    title: "Secure Coding Variants",
    tags: ["coding", "appsec", "authn", "crypto"],
    tracks: ["CYBERSECURITY", "SECURE_FULL_STACK", "PRIVACY_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `Secure-coding micro-challenge #${n}.`,
      description: `Fix or implement a security-sensitive function (variant ${n}): constant-time compare, parse hardening, or token checks.\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Secure happy path", "Reject malformed input"],
      hiddenReqs: d >= 8 ? ["Timing side-channel lab", "Alg confusion"] : ["Empty / null input"],
    }),
  },
  {
    key: "sql-logic",
    title: "Query Logic Variants",
    tags: ["coding", "transactions", "data-modeling"],
    tracks: ["SOFTWARE_ENGINEERING", "DATA_ML"],
    prompt: (n, d) => ({
      summary: `Data/query logic variant #${n}.`,
      description: `Implement aggregation or transactional logic in-process (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct aggregates", "Examples"],
      hiddenReqs: d >= 7 ? ["Concurrent updates", "Late events"] : ["Empty tables"],
    }),
  },
  {
    key: "rate-limit-family",
    title: "Rate Limit Variants",
    tags: ["coding", "caching", "queues"],
    tracks: ["SOFTWARE_ENGINEERING", "PLATFORM_SRE", "SECURE_FULL_STACK"],
    prompt: (n, d) => ({
      summary: `Rate limiter / token bucket variant #${n}.`,
      description: `Implement rate limiting semantics (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Allow within quota", "Deny over quota"],
      hiddenReqs: d >= 8 ? ["Distributed approximation", "Clock skew"] : ["Burst boundary"],
    }),
  },
  {
    key: "privacy-coding",
    title: "Privacy Logic Variants",
    tags: ["coding", "privacy", "pii"],
    tracks: ["PRIVACY_ENGINEERING", "DATA_ML"],
    prompt: (n, d) => ({
      summary: `Privacy/redaction logic variant #${n}.`,
      description: `Redact, tokenize, or k-threshold aggregate (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Redact configured fields", "Public fixtures"],
      hiddenReqs: d >= 9 ? ["Nested PII", "Re-ID risk"] : ["Missing fields"],
    }),
  },
  {
    key: "mobile-logic",
    title: "Mobile Sync Logic Variants",
    tags: ["coding", "mobile", "concurrency"],
    tracks: ["MOBILE"],
    prompt: (n, d) => ({
      summary: `Offline sync / merge variant #${n}.`,
      description: `Merge offline mutations with conflict rules (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Apply mutations", "Detect conflicts"],
      hiddenReqs: d >= 8 ? ["Clock skew", "Duplicate sync"] : ["Empty queue"],
    }),
  },
  {
    key: "sre-logic",
    title: "SRE Scoring Variants",
    tags: ["coding", "slo", "observability"],
    tracks: ["PLATFORM_SRE"],
    prompt: (n, d) => ({
      summary: `SLO / burn-rate calculation variant #${n}.`,
      description: `Compute SLI/SLO burn from event windows (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct burn math", "Examples"],
      hiddenReqs: d >= 8 ? ["Multi-window", "Late points"] : ["Zero traffic"],
    }),
  },
  {
    key: "bit-family",
    title: "Bit Manipulation Variants",
    tags: ["coding", "bit-manipulation", "math"],
    tracks: ["SOFTWARE_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `Bit-twiddling variant #${n}.`,
      description: `Solve using bit operations where appropriate (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct bits", "Examples"],
      hiddenReqs: d >= 7 ? ["Full 32/64-bit range"] : ["Zero"],
    }),
  },
  {
    key: "fintech-logic",
    title: "FinTech Logic Variants",
    tags: ["coding", "fintech", "money", "idempotency"],
    tracks: ["FINTECH", "SOFTWARE_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `Money/ledger logic variant #${n}.`,
      description: `Implement rounding, idempotent apply, or balance updates (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct money math", "Examples"],
      hiddenReqs: d >= 8 ? ["Concurrent postings", "Rounding modes"] : ["Zero amounts"],
    }),
  },
  {
    key: "healthcare-logic",
    title: "Healthcare Logic Variants",
    tags: ["coding", "healthcare", "phi", "scheduling"],
    tracks: ["HEALTHCARE", "PRIVACY_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `Clinical/scheduling privacy logic #${n}.`,
      description: `Enforce access windows, redaction, or appointment conflicts (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct rules", "Public fixtures"],
      hiddenReqs: d >= 8 ? ["Break-glass audit", "Overlap races"] : ["Empty roster"],
    }),
  },
  {
    key: "game-logic",
    title: "Game Sim Logic Variants",
    tags: ["coding", "games", "simulation", "netcode"],
    tracks: ["GAME_BACKEND"],
    prompt: (n, d) => ({
      summary: `Game simulation / matchmaking logic #${n}.`,
      description: `Tick reconcile, inventory grant, or MMR match (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Deterministic core", "Examples"],
      hiddenReqs: d >= 8 ? ["Desync harness", "Dupe grant"] : ["Empty lobby"],
    }),
  },
  {
    key: "iot-logic",
    title: "IoT / Embedded Logic Variants",
    tags: ["coding", "iot", "firmware", "protocols"],
    tracks: ["EMBEDDED_IOT"],
    prompt: (n, d) => ({
      summary: `Device protocol / buffer logic #${n}.`,
      description: `Parse frames, ring buffers, or ack windows (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct parse", "Examples"],
      hiddenReqs: d >= 8 ? ["Malformed flood", "Wraparound"] : ["Empty frame"],
    }),
  },
  {
    key: "devtools-logic",
    title: "DevTools Logic Variants",
    tags: ["coding", "devtools", "parsing", "diff"],
    tracks: ["DEVTOOLS", "COMPILER_TOOLING"],
    prompt: (n, d) => ({
      summary: `Parsing / diff / analysis micro-challenge #${n}.`,
      description: `Implement a parser fragment, diff hunk, or dependency select (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct output", "Examples"],
      hiddenReqs: d >= 8 ? ["Pathological input", "Unicode paths"] : ["Empty input"],
    }),
  },
  {
    key: "growth-logic",
    title: "Experiment Logic Variants",
    tags: ["coding", "experiments", "hashing", "metrics"],
    tracks: ["GROWTH"],
    prompt: (n, d) => ({
      summary: `Bucketing / metric window logic #${n}.`,
      description: `Sticky assign, exposure dedupe, or funnel counts (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Stable assignment", "Examples"],
      hiddenReqs: d >= 8 ? ["Reshuffle resistance", "Late events"] : ["Empty cohort"],
    }),
  },
  {
    key: "search-logic",
    title: "Search / Recs Logic Variants",
    tags: ["coding", "search", "ranking", "indexing"],
    tracks: ["SEARCH_RECS", "DATA_ML"],
    prompt: (n, d) => ({
      summary: `Search/ranking micro-challenge #${n}.`,
      description: `Build inverted lists, top-K blend, or prefix find (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct ranking/index", "Examples"],
      hiddenReqs: d >= 8 ? ["Large n", "Tie breaks"] : ["Empty corpus"],
    }),
  },
  {
    key: "mlops-logic",
    title: "MLOps Logic Variants",
    tags: ["coding", "mlops", "features", "eval"],
    tracks: ["AI_MLOPS", "DATA_ML"],
    prompt: (n, d) => ({
      summary: `Feature/eval/serving logic #${n}.`,
      description: `Point-in-time join, drift score, or batch chunking (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct computation", "Examples"],
      hiddenReqs: d >= 8 ? ["Leakage cases", "Late labels"] : ["Empty batch"],
    }),
  },
  {
    key: "dbeng-logic",
    title: "Database Engine Logic Variants",
    tags: ["coding", "database", "storage", "tx"],
    tracks: ["DATABASE_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `Storage/tx engine micro-challenge #${n}.`,
      description: `Implement eviction, WAL apply, or snapshot read (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct semantics", "Examples"],
      hiddenReqs: d >= 8 ? ["Crash mid-apply", "Concurrent readers"] : ["Empty store"],
    }),
  },
  {
    key: "net-edge-logic",
    title: "Network / Edge Logic Variants",
    tags: ["coding", "networking", "cache", "lb"],
    tracks: ["NETWORK_EDGE", "PLATFORM_SRE"],
    prompt: (n, d) => ({
      summary: `Cache key / LB / limit logic #${n}.`,
      description: `Consistent hash, cache key, or token bucket (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct behavior", "Examples"],
      hiddenReqs: d >= 8 ? ["Hot key", "Node join/leave"] : ["Single node"],
    }),
  },
  {
    key: "cloudsec-logic",
    title: "Cloud Security Logic Variants",
    tags: ["coding", "cloudsec", "iam", "policy"],
    tracks: ["CLOUD_INFRA_SECURITY", "CYBERSECURITY"],
    prompt: (n, d) => ({
      summary: `IAM/policy evaluation variant #${n}.`,
      description: `Evaluate allow/deny policies, path constraints, or audience checks (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct allow/deny", "Examples"],
      hiddenReqs: d >= 8 ? ["Confused deputy", "Path traversal"] : ["Empty policy"],
    }),
  },
  {
    key: "qa-logic",
    title: "QA Reliability Logic Variants",
    tags: ["coding", "qa", "flakes", "contracts"],
    tracks: ["QA_RELIABILITY"],
    prompt: (n, d) => ({
      summary: `Flake/contract/selection logic #${n}.`,
      description: `Quarantine rules, impact select, or retry classifiers (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct classification", "Examples"],
      hiddenReqs: d >= 8 ? ["Oscillating flake", "Large suites"] : ["Empty suite"],
    }),
  },
  {
    key: "blockchain-logic",
    title: "Blockchain Logic Variants",
    tags: ["coding", "blockchain", "merkle", "consensus"],
    tracks: ["BLOCKCHAIN"],
    prompt: (n, d) => ({
      summary: `Merkle/vesting/finality logic #${n}.`,
      description: `Merkle proofs, vesting release, or reorg handling (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct proofs/math", "Examples"],
      hiddenReqs: d >= 8 ? ["Reorg depth", "Proof reuse"] : ["Empty tree"],
    }),
  },
  {
    key: "design-logic",
    title: "Design Token Logic Variants",
    tags: ["coding", "design-systems", "tokens", "a11y"],
    tracks: ["DESIGN_SYSTEMS"],
    prompt: (n, d) => ({
      summary: `Token transform / contrast logic #${n}.`,
      description: `Resolve token refs, contrast ratios, or density scales (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct resolve", "Examples"],
      hiddenReqs: d >= 8 ? ["Cycles in refs", "Float edges"] : ["Missing token"],
    }),
  },
  {
    key: "logistics-logic",
    title: "Logistics Logic Variants",
    tags: ["coding", "logistics", "routing", "scheduling"],
    tracks: ["LOGISTICS"],
    prompt: (n, d) => ({
      summary: `Routing/scheduling micro-challenge #${n}.`,
      description: `Time windows, bin packing lite, or ETA smooth (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Feasible solution", "Examples"],
      hiddenReqs: d >= 8 ? ["Infeasible detect", "Large n"] : ["Single stop"],
    }),
  },
  {
    key: "edtech-logic",
    title: "EdTech Logic Variants",
    tags: ["coding", "edtech", "grading", "scheduling"],
    tracks: ["EDTECH"],
    prompt: (n, d) => ({
      summary: `Grading/roster logic #${n}.`,
      description: `Score rubrics, roster sync, or quiz forms (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct scoring/sync", "Examples"],
      hiddenReqs: d >= 8 ? ["Partial credit edges", "Concurrent enroll"] : ["Empty class"],
    }),
  },
  {
    key: "regtech-logic",
    title: "RegTech Logic Variants",
    tags: ["coding", "regtech", "policy", "audit"],
    tracks: ["REGTECH", "PRIVACY_ENGINEERING"],
    prompt: (n, d) => ({
      summary: `Policy evaluation / hold logic #${n}.`,
      description: `Evaluate policies, legal holds, or disclosure versions (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct decisions", "Examples"],
      hiddenReqs: d >= 8 ? ["Conflicting policies", "Hold races"] : ["Empty facts"],
    }),
  },
  {
    key: "support-logic",
    title: "Support Platform Logic Variants",
    tags: ["coding", "support", "sla", "routing"],
    tracks: ["SUPPORT_ENG"],
    prompt: (n, d) => ({
      summary: `Ticket routing / SLA logic #${n}.`,
      description: `Assign by skill, SLA clocks, or merge timelines (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct routing/SLA", "Examples"],
      hiddenReqs: d >= 8 ? ["SLA pause rules", "Merge races"] : ["Empty queue"],
    }),
  },
  {
    key: "climate-logic",
    title: "Climate / Energy Logic Variants",
    tags: ["coding", "energy", "forecast", "optimization"],
    tracks: ["CLIMATE_ENERGY"],
    prompt: (n, d) => ({
      summary: `Energy/carbon calculation #${n}.`,
      description: `Tariff optimize, carbon attribute, or gap fill (variant ${n}).\n\n${DIFFICULTY_BLURBS[difficultyBand(d)]}`,
      publicReqs: ["Correct calc", "Examples"],
      hiddenReqs: d >= 8 ? ["Missing intervals", "Constraint bounds"] : ["Zero load"],
    }),
  },
];

/**
 * Procedurally expand coding practice families to `count` items (Easy → Impossible).
 * These are generated variants for volume practice — not hand-authored company leaks.
 */
export function buildCodingBulk(count = 4000, existingSlugs: Set<string>): ChallengeSeed[] {
  const out: ChallengeSeed[] = [];
  let i = 0;
  while (out.length < count) {
    const family = FAMILIES[i % FAMILIES.length]!;
    const n = Math.floor(i / FAMILIES.length) + 1;
    const difficulty = difficultyFromIndex(i);
    const track = family.tracks[i % family.tracks.length]!;
    const slug = `q-${family.key}-${n}`;
    i += 1;
    if (existingSlugs.has(slug)) continue;
    existingSlugs.add(slug);
    const body = family.prompt(n, difficulty);
    const band = difficultyBand(difficulty);
    out.push({
      slug,
      title: `${family.title} #${n}`,
      summary: body.summary,
      description: `${body.description}\n\n## Difficulty\n**${band} (D${difficulty}/10)**\n\n## Origin\nGenerated practice variant (${family.key}) — not a claimed company interview transcript.\n\n## Function\nImplement \`solve(...)\` in \`src/solution.ts\` (or language equivalent). Public tests call your export; hidden tests probe adversarial cases.`,
      type: "CODING_PROBLEM",
      track,
      difficulty,
      estimatedDays: 1,
      tags: [...family.tags, band.toLowerCase(), "question-bank", "generated"],
      languages: ["typescript", "javascript", "python", "go", "rust", "java"],
      companies: [],
      frequency: Math.max(5, 100 - difficulty * 8 - (n % 17)),
      avgMinutes: difficulty <= 3 ? 15 : difficulty <= 6 ? 25 : difficulty <= 8 ? 40 : difficulty === 9 ? 55 : 75,
      isPremium: difficulty >= 9,
      publicRequirements: body.publicReqs,
      hiddenRequirements: body.hiddenReqs,
      adaptiveTrack: [
        { level: 1, title: "Public examples", criteria: "Public tests green" },
        { level: 2, title: "Hidden edge", criteria: "Hidden harness green" },
        ...(difficulty >= 8
          ? [{ level: 3, title: "Adversarial", criteria: "Perf / abuse cases green" }]
          : []),
      ],
      gradingRubric: {
        backend: "Correctness",
        performance: "Complexity under hidden load",
        testing: "Edge coverage",
        problemSolving: band,
      },
    });
  }
  return out;
}
