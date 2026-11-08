/**
 * Interview Craft — how to prepare for coding, design, and behavioral rounds.
 * Progress is stored on StudyPlanEnrollment for plan slug `interview-craft`.
 */

export type InterviewLesson = {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  level: "foundations" | "patterns" | "rounds";
  skills: string[];
  practiceSlug?: string;
  bodyMd: string;
};

export const INTERVIEW_CRAFT_PLAN_SLUG = "interview-craft";

export const INTERVIEW_LESSONS: InterviewLesson[] = [
  {
    slug: "iv-how-loops-work",
    title: "How Tech Interview Loops Work",
    summary: "Screens, OA, onsites, hiring committee — what each round actually tests.",
    minutes: 14,
    level: "foundations",
    skills: ["process", "expectations"],
    bodyMd: `## The typical loop

1. **Recruiter screen** — role fit, timeline, comp band, logistics.
2. **Online assessment (OA)** — timed coding; often auto-graded.
3. **Phone / virtual technical** — 45–60m live coding or light design.
4. **Onsite / virtual onsite** — 3–5 rounds: coding, system design, behavioral, sometimes domain (security, ML, frontend).
5. **Hiring committee / bar raiser** — calibration across interviewers; your packet matters more than one hero round.

### What they optimize for
- Can you **solve under time** with clear communication?
- Do you write **correct, tested** code (edge cases)?
- Can you **design** at the right altitude for the level?
- Will you be a **safe teammate** (behavioral)?

### Crucible mapping
Daily + problem bank ≈ OA/coding. Missions ≈ design depth. Timed company sims ≈ onsite pressure. Verified profile ≈ packet evidence.

### Exercise
Write your target loop on one page: company → role → level → which round types. Then enroll in a matching study plan.`,
  },
  {
    slug: "iv-problem-solving-framework",
    title: "The Live Coding Framework",
    summary: "Clarify → examples → approach → code → test — every time.",
    minutes: 18,
    level: "foundations",
    skills: ["communication", "coding"],
    practiceSlug: "lc-two-sum",
    bodyMd: `## Never jump straight to code

Interviewers grade the **process**, not only the AC.

### The five beats
1. **Clarify** — inputs, outputs, constraints, nulls, duplicates, sorted?, mutability.
2. **Examples** — 1 happy path + 1 edge (empty, single, overflow).
3. **Approach** — brute force first (say complexity), then optimize. Name the pattern.
4. **Code** — narrate structure; keep functions small; name variables for the domain.
5. **Test** — walk the example; fix bugs out loud; state remaining risks.

### Phrases that help
- “Constraints say n ≤ 10⁵, so O(n²) is too slow.”
- “I’ll start with a hash map so lookups are O(1).”
- “Empty input should return [] — I’ll guard that first.”

### Practice
Open Two Sum in the bank. Solve it **out loud** in 20 minutes using the five beats — even if you already know the answer.`,
  },
  {
    slug: "iv-complexity-fluency",
    title: "Complexity Fluency",
    summary: "Big-O you can say out loud: time, space, and when it matters.",
    minutes: 16,
    level: "foundations",
    skills: ["complexity", "tradeoffs"],
    bodyMd: `## Say it before they ask

After every approach: **time** and **space** in terms of n (and m if needed).

### Patterns to memorize
| Structure | Typical |
|-----------|---------|
| Hash map / set | O(1) avg lookup; O(n) space |
| Sort then scan | O(n log n) |
| Two pointers on sorted | O(n) |
| Binary search | O(log n) |
| BFS/DFS graph | O(V+E) |
| Heap of size k | O(n log k) |
| DP over n states | often O(n) or O(n·W) |

### Space tradeoffs
Interviewers love “I can trade O(n) space for O(n) time.” Offer the tradeoff even if you pick one.

### Trap
Claiming O(1) space while building a recursion stack of depth n — call it O(n) stack.`,
  },
  {
    slug: "iv-arrays-hashing",
    title: "Pattern: Arrays & Hashing",
    summary: "Frequency maps, prefix sums, and the two-sum family.",
    minutes: 20,
    level: "patterns",
    skills: ["arrays", "hashing"],
    practiceSlug: "lc-two-sum",
    bodyMd: `## When you smell this pattern
- Need pairs/complements → hash map of seen values
- Counts / anagrams → frequency map
- Subarray sums → prefix sums + map of prefixes
- “First unique” → count then scan

### Template (complement)
\`\`\`
map = {}
for i, x in enumerate(nums):
  need = target - x
  if need in map: return [map[need], i]
  map[x] = i
\`\`\`

### Interview tip
State why a nested loop fails the constraint **before** writing the map.

### Practice
Two Sum + Top K Frequent in the bank. Narrate the hash tradeoff.`,
  },
  {
    slug: "iv-sliding-window-two-pointers",
    title: "Pattern: Sliding Window & Two Pointers",
    summary: "Shrink/expand windows and left/right scans on sorted arrays.",
    minutes: 20,
    level: "patterns",
    skills: ["sliding-window", "two-pointers"],
    practiceSlug: "lc-min-window",
    bodyMd: `## Sliding window
Use when the answer is a **contiguous** subarray/substring with a property (sum, unique chars, coverage).

### Expand–shrink
1. Expand \`right\` and update counters.
2. While valid (or invalid), shrink \`left\` and update best answer.
3. Careful with “at most / at least / exactly” wording.

## Two pointers
Sorted array pair sums, removing duplicates in-place, palindrome checks, merge of two sorted lists.

### Practice
Minimum Window Substring — explain the need-count vs have-count loop before coding.`,
  },
  {
    slug: "iv-trees-graphs",
    title: "Pattern: Trees & Graphs",
    summary: "BFS/DFS, topological order, and serialization instincts.",
    minutes: 22,
    level: "patterns",
    skills: ["graphs", "trees", "bfs", "dfs"],
    practiceSlug: "lc-course-schedule",
    bodyMd: `## Decide BFS vs DFS fast
- **Shortest path in unweighted graph** → BFS
- **Connected components / flood fill** → DFS or BFS
- **Cycle detection / prerequisites** → topological (Kahn) or DFS colors
- **Tree level order** → BFS
- **Subtree properties** → DFS returning aggregates

### Graph interview checklist
1. Directed or undirected?
2. Weighted?
3. How is the graph given (edges, adj list, matrix)?
4. Can there be cycles / disconnected nodes?

### Practice
Course Schedule (cycle in directed graph) + Serialize Tree. Draw the state machine on the whiteboard.`,
  },
  {
    slug: "iv-dp-recursion",
    title: "Pattern: Recursion & DP",
    summary: "Define state, transition, base cases — then optimize space.",
    minutes: 22,
    level: "patterns",
    skills: ["dp", "recursion"],
    practiceSlug: "lc-word-break",
    bodyMd: `## The DP interview script
1. **Brute recursion** — what subproblem repeats?
2. **State** — “dp[i] means …”
3. **Transition** — how does dp[i] use smaller states?
4. **Base cases**
5. **Order of computation** (bottom-up) or memo
6. **Complexity**

### Word Break vibe
\`dp[i] = true\` if prefix \`s[0..i)\` can be segmented. Try every end j and dict word.

### Red flags
Jumping to DP without stating the recurrence. Interviewers will interrupt.

### Practice
Word Break — write the recurrence on paper first, then code.`,
  },
  {
    slug: "iv-system-design-basics",
    title: "System Design: The First 15 Minutes",
    summary: "Requirements, estimates, API, then one clear diagram.",
    minutes: 24,
    level: "rounds",
    skills: ["system-design", "estimation"],
    practiceSlug: "arch-blueprint",
    bodyMd: `## Cadence that calms interviewers

1. **Functional requirements** — list 3–5 verbs (post, follow, search…).
2. **Non-functional** — QPS, latency, consistency, durability, cost.
3. **Back-of-envelope** — storage, QPS peak, bandwidth (order of magnitude).
4. **API / events** — write 4 endpoints or event types.
5. **High-level diagram** — clients → gateway → services → data stores.
6. **Deep dive** — pick the hard part (fanout, cache, search, idempotency).
7. **Tradeoffs & failure modes** — what breaks at 10×?

### Level signal
Junior: clear API + one datastore. Senior: bottlenecks, consistency, multi-region awareness.

### Practice
Open Arch Blueprint or a mission like Distributed Outbox. Timebox 15 minutes for steps 1–5 only.`,
  },
  {
    slug: "iv-system-design-deep",
    title: "System Design: Scale, Cache, Consistency",
    summary: "When to shard, cache, queue, and what you sacrifice.",
    minutes: 20,
    level: "rounds",
    skills: ["caching", "queues", "consistency"],
    practiceSlug: "mission-incident-cache-stampede",
    bodyMd: `## Tools with purpose
- **Cache** — cut read latency; watch stampede, TTL, invalidation.
- **Queue** — absorb spikes; enable async fanout; need idempotent consumers.
- **Shard / partition** — hot keys kill you; choose a key that spreads load.
- **Replica** — scale reads; accept lag or use read-your-writes tricks.
- **Idempotency keys** — payments and webhooks.

### Consistency menu
Strong vs eventual — name the user-visible bug if you choose eventual (stale feed, double charge).

### Practice
Cache Stampede mission or Idempotent Charge coding problem — explain the failure mode first.`,
  },
  {
    slug: "iv-behavioral-star",
    title: "Behavioral: STAR Without Fluff",
    summary: "Situation, Task, Action, Result — quantified and honest.",
    minutes: 16,
    level: "rounds",
    skills: ["behavioral", "storytelling"],
    bodyMd: `## Build a story bank (8–10 stories)
Conflict, failure, leadership without authority, ambiguity, performance, mentorship, customer impact, ethical call.

### STAR
- **S/T** — 2 sentences max of context
- **A** — *your* actions (I, not we) with decisions
- **R** — metric or concrete outcome; what you learned

### Anti-patterns
- Rambling setup
- Collective “we shipped” with no personal agency
- Fake perfection — committees probe for growth

### Exercise
Write 3 stories in STAR bullets. Rehearse each in under 2 minutes.`,
  },
  {
    slug: "iv-company-intel",
    title: "Company-Specific Prep",
    summary: "Map company flavors to patterns — not to rumor mills.",
    minutes: 14,
    level: "rounds",
    skills: ["company-prep", "prioritization"],
    bodyMd: `## Useful signals (not folklore)
- **Product/infra company** → graphs, distributed systems, reliability stories
- **Payments** → idempotency, exactly-once, ledgers
- **Consumer social** → fanout, feeds, abuse/safety
- **Security roles** → threat models + coding correctness
- **Early startup** → breadth, shipping stories, ownership

### Crucible tools
- Study plans tagged by company
- Company filter in the problem bank
- Timed company simulations under Interview

### Rule
Prioritize **high-frequency patterns** over memorizing a leaked question list. Frequency tags are prep heuristics, not scrapes.`,
  },
  {
    slug: "iv-day-of-and-offers",
    title: "Day-Of Rituals & Offers",
    summary: "Energy, questions to ask, and negotiating without cringe.",
    minutes: 12,
    level: "rounds",
    skills: ["offers", "mindset"],
    bodyMd: `## Day-of
- Sleep and a short warm-up problem (not a new Hard).
- Environment check: editor, camera, water.
- Prepare 3 thoughtful questions about the team’s pain points.

## After the loop
Send a short thank-you if culturally expected; don’t re-argue every miss.

## Offers
- Know your BATNA (other offers / stay).
- Negotiate **total** (base, equity, bonus, signing, level).
- Ask for leveling rationale if the band feels low — calmly.

### Closing mindset
One bad round is data, not destiny. Log the miss → add a study-plan item → rebook.`,
  },
];

export function getInterviewLesson(slug: string) {
  return INTERVIEW_LESSONS.find((l) => l.slug === slug) ?? null;
}

export function interviewLessonSlugs() {
  return INTERVIEW_LESSONS.map((l) => l.slug);
}

export function nextInterviewLesson(completed: Set<string> | string[]) {
  const done = completed instanceof Set ? completed : new Set(completed);
  return INTERVIEW_LESSONS.find((l) => !done.has(l.slug)) ?? null;
}
