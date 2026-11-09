import { prisma } from "@/lib/db";

const SEED_EDITORIALS: {
  challengeSlug: string;
  slug: string;
  title: string;
  approach: string;
  complexity: string;
  bodyMd: string;
  isPremium: boolean;
}[] = [
  {
    challengeSlug: "lc-two-sum",
    slug: "editorial-lc-two-sum",
    title: "Two Sum — hash map editorial",
    approach: "Single-pass complement map",
    complexity: "O(n) time · O(n) space",
    isPremium: false,
    bodyMd: `## Intuition
For each value \`x\`, ask whether \`target - x\` was already seen. Store \`value → index\` as you scan.

## Pitfalls
- Do not reuse the same index.
- Negatives and zeros are valid.
- Prefer the hash map over nested loops when n grows.

## Reference sketch
\`\`\`ts
const seen = new Map<number, number>();
for (let i = 0; i < nums.length; i++) {
  const need = target - nums[i]!;
  if (seen.has(need)) return [seen.get(need)!, i];
  seen.set(nums[i]!, i);
}
\`\`\`
`,
  },
  {
    challengeSlug: "lc-lru-cache",
    slug: "editorial-lc-lru-cache",
    title: "LRU Cache — map + doubly linked list",
    approach: "O(1) get/put via hash map + DLL",
    complexity: "O(1) amortized per op",
    isPremium: true,
    bodyMd: `## Intuition
A hash map gives O(1) lookup; a doubly linked list orders recency. Move nodes to the head on access; evict from the tail when over capacity.

## Premium deep-dive
Wire sentinel head/tail nodes to avoid null edge cases. Overwrite must refresh recency. Capacity 1 is a common trap.

Judge signal first: pass public + hidden harness before studying this editorial as a shortcut.
`,
  },
  {
    challengeSlug: "lc-idempotent-charge",
    slug: "editorial-lc-idempotent-charge",
    title: "Idempotent charge — intent ledger",
    approach: "Persist intentId → charged amount",
    complexity: "O(1) per call with map/store",
    isPremium: true,
    bodyMd: `## Production lesson
Retries are not bugs — they are the network. Key every charge by \`intentId\` and return \`duplicate\` when the ledger already holds it.

## Evidence bar
Hidden cases interleave intents and retry storms. A correct solution keeps \`totalCharged\` monotonic and never double-books.
`,
  },
];

/** One canonical editorial per coding-bank family (attached to first published q-{family}-*). */
const FAMILY_EDITORIALS: {
  family: string;
  title: string;
  approach: string;
  complexity: string;
  isPremium: boolean;
  bodyMd: string;
}[] = [
  {
    family: "two-sum-family",
    title: "Two-sum family — complement hash map",
    approach: "Single-pass map of value → index",
    complexity: "O(n) time · O(n) space",
    isPremium: false,
    bodyMd: `## Pattern
Scan once. For each \`x\`, look up \`target - x\`. Store what you have seen.

## Judge focus
Hidden cases stress large \`n\` and zeros. Nested loops will time out on the bank harness.
`,
  },
  {
    family: "window-family",
    title: "Sliding window family — distinct budget",
    approach: "Expand right, shrink left when constraint breaks",
    complexity: "O(n) time · O(k) space",
    isPremium: false,
    bodyMd: `## Pattern
Maintain a window \`[L,R]\` with a frequency map. Advance \`R\`; when distinct count exceeds \`k\`, advance \`L\`.

## Pitfalls
\`k = 0\` and single-character strings are easy to mishandle.
`,
  },
  {
    family: "graph-family",
    title: "Graph family — cycle detection",
    approach: "DFS colors or Kahn indegree",
    complexity: "O(V+E)",
    isPremium: false,
    bodyMd: `## Pattern
Build adjacency. Mark nodes visiting/visited (or queue zero-indegree). A back-edge (or leftover nodes) means a cycle.

## Evidence
Hidden harness includes a large ring and a clean DAG.
`,
  },
  {
    family: "dp-family",
    title: "DP family — word break",
    approach: "Boolean DP over prefixes",
    complexity: "O(n² · dict) typical",
    isPremium: false,
    bodyMd: `## Pattern
\`dp[i]\` = true if \`s[0..i)\` segments. Try every dict word ending at \`i\`.

## Pitfalls
Ambiguous splits and long strings — memoize and use a set for O(1) membership.
`,
  },
  {
    family: "heap-family",
    title: "Heap / bucket family — top-k frequent",
    approach: "Count → bucket or heap of size k",
    complexity: "O(n) bucket or O(n log k) heap",
    isPremium: false,
    bodyMd: `## Pattern
Frequency map, then either bucket-sort by count or a min-heap of size \`k\`.

## Judge
Large \`n\` cases fail quadratic approaches.
`,
  },
  {
    family: "interval-family",
    title: "Interval family — sort then merge",
    approach: "Sort by start, merge overlapping",
    complexity: "O(n log n)",
    isPremium: false,
    bodyMd: `## Pattern
Sort by start. Walk once; if current overlaps last merged, extend end; else push.

## Pitfalls
Unsorted input and fully nested intervals.
`,
  },
  {
    family: "tree-family",
    title: "Tree family — depth / traversal",
    approach: "Recursion or BFS levels",
    complexity: "O(n)",
    isPremium: false,
    bodyMd: `## Pattern
\`depth(null)=0\`, else \`1 + max(left, right)\`. Skewed trees stress stack depth — prefer iterative BFS when needed.
`,
  },
  {
    family: "string-family",
    title: "String family — valid parentheses",
    approach: "Stack of expected closers",
    complexity: "O(n)",
    isPremium: false,
    bodyMd: `## Pattern
Push expected closer; on closer, pop and match. Empty stack at end ⇒ valid. Interleaved mismatches like \`([)]\` fail.
`,
  },
  {
    family: "concurrency-family",
    title: "Concurrency family — idempotent ledger",
    approach: "intentId → first successful charge",
    complexity: "O(1) per call",
    isPremium: true,
    bodyMd: `## Production pattern
Retries happen. Key by intent. Return \`duplicate\` without double-booking. Hidden storms interleave intents.
`,
  },
  {
    family: "security-coding",
    title: "Security coding — secret compare",
    approach: "Length-aware compare without early exit on content",
    complexity: "O(n)",
    isPremium: true,
    bodyMd: `## Pattern
Compare lengths first (or pad carefully). Avoid short-circuiting on the first differing byte when teaching constant-time intent — document remaining side channels.
`,
  },
  {
    family: "rate-limit-family",
    title: "Rate limit family — sliding window hits",
    approach: "Per-key timestamp queue pruned to window",
    complexity: "O(hits in window)",
    isPremium: true,
    bodyMd: `## Pattern
Keep timestamps per key. Drop those outside the window. Allow iff count < limit after prune. Isolate keys.
`,
  },
  {
    family: "sql-logic",
    title: "SQL / ledger logic — running balance",
    approach: "Sum deltas in order",
    complexity: "O(n)",
    isPremium: false,
    bodyMd: `## Pattern
Postings are ordered facts. Balance is the sum of deltas. Empty ledger ⇒ 0.
`,
  },
  {
    family: "privacy-coding",
    title: "Privacy coding — email redaction",
    approach: "Regex replace to [EMAIL]",
    complexity: "O(n)",
    isPremium: true,
    bodyMd: `## Pattern
Match common email shapes including plus-addressing. Preserve non-email text. Prefer explicit patterns over greedy catches.
`,
  },
  {
    family: "mobile-logic",
    title: "Mobile sync — last-write-wins merge",
    approach: "Union by id; remote wins conflicts",
    complexity: "O(n)",
    isPremium: false,
    bodyMd: `## Pattern
Index local by id, apply remote overwrites, emit stable merge. Offline-first apps live or die on conflict policy.
`,
  },
  {
    family: "sre-logic",
    title: "SRE logic — error rate",
    approach: "errors / total with zero guard",
    complexity: "O(1)",
    isPremium: false,
    bodyMd: `## Pattern
\`total === 0 → 0\`. Otherwise \`errors / total\`. Tiny rates need floating precision care in asserts.
`,
  },
  {
    family: "bit-family",
    title: "Bit family — popcount",
    approach: "n &= n-1 loop or language popcount",
    complexity: "O(set bits)",
    isPremium: false,
    bodyMd: `## Pattern
Clear lowest set bit until zero. Watch unsigned 32-bit edge cases in JS (\`>>> 0\`).
`,
  },
];

export async function seedEditorials() {
  for (const ed of SEED_EDITORIALS) {
    const challenge = await prisma.challenge.findUnique({ where: { slug: ed.challengeSlug } });
    if (!challenge) continue;
    await prisma.editorial.upsert({
      where: { slug: ed.slug },
      update: {
        title: ed.title,
        bodyMd: ed.bodyMd,
        approach: ed.approach,
        complexity: ed.complexity,
        isPremium: ed.isPremium,
        published: true,
        challengeId: challenge.id,
      },
      create: {
        slug: ed.slug,
        challengeId: challenge.id,
        title: ed.title,
        bodyMd: ed.bodyMd,
        approach: ed.approach,
        complexity: ed.complexity,
        isPremium: ed.isPremium,
        published: true,
      },
    });
  }

  for (const fam of FAMILY_EDITORIALS) {
    const challenge = await prisma.challenge.findFirst({
      where: {
        isPublished: true,
        OR: [{ slug: `q-${fam.family}-1` }, { slug: { startsWith: `q-${fam.family}-` } }],
      },
      orderBy: { slug: "asc" },
    });
    if (!challenge) continue;
    const slug = `editorial-${fam.family}`;
    await prisma.editorial.upsert({
      where: { slug },
      update: {
        title: fam.title,
        bodyMd: fam.bodyMd,
        approach: fam.approach,
        complexity: fam.complexity,
        isPremium: fam.isPremium,
        published: true,
        challengeId: challenge.id,
      },
      create: {
        slug,
        challengeId: challenge.id,
        title: fam.title,
        bodyMd: fam.bodyMd,
        approach: fam.approach,
        complexity: fam.complexity,
        isPremium: fam.isPremium,
        published: true,
      },
    });
  }
}

export async function listEditorials(_opts?: { premium?: boolean }) {
  return prisma.editorial.findMany({
    where: { published: true },
    include: { challenge: { select: { slug: true, title: true, isPremium: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

/** Map challenge slug → editorial slug (family editorial covers all q-{family}-*). */
export async function editorialSlugByChallengeSlug(): Promise<Map<string, string>> {
  const rows = await prisma.editorial.findMany({
    where: { published: true },
    select: { slug: true, challenge: { select: { slug: true } } },
  });
  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(r.challenge.slug, r.slug);
    if (r.slug.startsWith("editorial-") && r.challenge.slug.startsWith("q-")) {
      // cover siblings in same family
      const fam = r.slug.slice("editorial-".length);
      map.set(`__family__:${fam}`, r.slug);
    }
  }
  return map;
}

export function resolveEditorialSlug(
  challengeSlug: string,
  byChallenge: Map<string, string>,
): string | null {
  const direct = byChallenge.get(challengeSlug);
  if (direct) return direct;
  if (!challengeSlug.startsWith("q-")) return null;
  const rest = challengeSlug.slice(2);
  for (const [k, v] of byChallenge) {
    if (!k.startsWith("__family__:")) continue;
    const fam = k.slice("__family__:".length);
    if (rest === fam || rest.startsWith(`${fam}-`)) return v;
  }
  return null;
}
