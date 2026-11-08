import type { AssessmentTrack, ChallengeType } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Objectively testable D10 Research Frontier challenges — not contradictory puzzles. */
export const RESEARCH_FRONTIER_SEEDS: {
  slug: string;
  title: string;
  summary: string;
  description: string;
  tags: string[];
  functionSignature: string;
  expectedComplexity: string;
  publicRequirements: string[];
  hiddenRequirements: string[];
  track: AssessmentTrack;
  type: ChallengeType;
}[] = [
  {
    slug: "rf-approx-tsp-ptas-window",
    title: "Bounded PTAS Window for Euclidean TSP",
    summary: "Implement a correct Euclidean TSP heuristic with proven approximation ratio under stated n bounds.",
    description: `## Research Frontier — D10

Implement \`approxTour(points)\` returning a cyclic tour (index order) for points in the unit square.

### Formal requirements
- Input: n points with coordinates in [0,1]², 3 ≤ n ≤ 200.
- Output: permutation of 0..n-1 forming a cycle.
- Correctness: every city visited once; length within factor 2 of MST×2 lower bound (Christofides-style or documented 2-approx).
- Time: O(n²) acceptable; must finish under 2s for n=200.

### Validation
- Tour is a permutation.
- Length ≤ 2 × (MST length × 2) for public fixtures (documented bound).
- Hidden fixtures check bound + determinism for fixed seeds.

This is testable approximation quality — not an undecidable claim.`,
    tags: ["research-frontier", "tsp", "approximation", "geometry", "d10"],
    functionSignature: "export function approxTour(points: [number, number][]): number[]",
    expectedComplexity: "O(n^2)",
    publicRequirements: ["Valid permutation tour", "Meets 2-approx vs MST lower bound on public fixtures"],
    hiddenRequirements: ["Deterministic on seeded fixtures", "n=200 under time"],
    track: "SOFTWARE_ENGINEERING",
    type: "CODING_PROBLEM",
  },
  {
    slug: "rf-consistent-hash-balance",
    title: "Consistent Hash Ring with Bounded Load",
    summary: "Virtual-node consistent hashing with proven max/min load ratio under churn.",
    description: `## Research Frontier — D10

Implement a consistent hash ring supporting \`addNode\`, \`removeNode\`, \`assign(key)\`.

### Formal requirements
- With V virtual nodes per physical node, for K keys uniformly hashed, max load / avg load ≤ 1 + ε for configured ε on public traces.
- After remove+readd of one node, ≤ K/N keys remapped (expected bound).
- Deterministic assignment for fixed hash function stub.

Objectively scored via load histograms on fixed key sets.`,
    tags: ["research-frontier", "distributed", "hashing", "load-balance", "d10"],
    functionSignature: "export class HashRing { addNode(id: string): void; removeNode(id: string): void; assign(key: string): string }",
    expectedComplexity: "O(log (N*V)) assign",
    publicRequirements: ["Stable assign", "Load ratio bound on public key set"],
    hiddenRequirements: ["Churn remapping bound", "Empty ring errors"],
    track: "PLATFORM_SRE",
    type: "DISTRIBUTED_SYSTEMS",
  },
  {
    slug: "rf-concurrent-stm-opacity",
    title: "STM Opacity Checker Trace",
    summary: "Validate whether a transactional memory history satisfies opacity.",
    description: `## Research Frontier — D10

Given a history of transactional read/write/commit/abort events, decide opacity.

### Formal requirements
- Accept legal opaque histories; reject clearly non-opaque ones from the fixture set.
- Must be deterministic; no randomness.
- Document complexity; n events ≤ 5e4 under 2s.

Fixtures are finite histories with known ground truth — objectively testable.`,
    tags: ["research-frontier", "concurrency", "stm", "opacity", "d10"],
    functionSignature: "export function isOpaque(history: Event[]): boolean",
    expectedComplexity: "O(n log n) aspirational",
    publicRequirements: ["Public histories classified correctly"],
    hiddenRequirements: ["Adversarial interleavings", "Large n timing"],
    track: "SOFTWARE_ENGINEERING",
    type: "CODING_PROBLEM",
  },
];

export async function upsertResearchFrontier() {
  let n = 0;
  for (const s of RESEARCH_FRONTIER_SEEDS) {
    await prisma.challenge.upsert({
      where: { slug: s.slug },
      create: {
        slug: s.slug,
        title: s.title,
        summary: s.summary,
        description: s.description,
        type: s.type,
        track: s.track,
        difficulty: 10,
        tags: s.tags,
        languages: ["typescript", "python", "go"],
        functionSignature: s.functionSignature,
        expectedComplexity: s.expectedComplexity,
        timeLimitMs: 2000,
        memoryLimitMb: 512,
        researchFrontier: true,
        publicRequirements: s.publicRequirements,
        hiddenRequirements: s.hiddenRequirements,
        isPublished: true,
        frequency: 10,
        avgMinutes: 90,
        gradingRubric: {
          correctness: "Formal requirements",
          performance: "Stated limits",
          research: "Documented approach",
        },
      },
      update: {
        title: s.title,
        summary: s.summary,
        description: s.description,
        researchFrontier: true,
        difficulty: 10,
        functionSignature: s.functionSignature,
        expectedComplexity: s.expectedComplexity,
        isPublished: true,
      },
    });
    n += 1;
  }
  // Mark existing D10 coding with research tag when appropriate
  await prisma.challenge.updateMany({
    where: { difficulty: 10, type: "CODING_PROBLEM", isPublished: true },
    data: { researchFrontier: true },
  });
  return n;
}
