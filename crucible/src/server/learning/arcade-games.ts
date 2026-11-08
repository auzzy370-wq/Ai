export const ARCADE_PLAN_SLUG = "learn-arcade";
export const ARCADE_CLEAR_XP = 40;
export const ARCADE_PERFECT_BONUS_XP = 20;

export type ArcadeAccent = "amber" | "emerald" | "orange";

export type ArcadeEngine = "framework-flow" | "big-o-blitz" | "pair-seeker" | "binary-range";

export type ArcadeGameDef = {
  slug: string;
  title: string;
  blurb: string;
  minutes: number;
  skill: string;
  accent: ArcadeAccent;
  engine: ArcadeEngine;
  seed: number;
  featured: boolean;
  difficulty: 1 | 2 | 3 | 4 | 5;
  family: string;
};

export const ARCADE_GAMES: ArcadeGameDef[] = [
  {
    slug: "framework-flow",
    title: "Framework Flow",
    blurb: "Put the live-coding beats in the right order before the clock runs out.",
    minutes: 2,
    skill: "interview process",
    accent: "orange",
    engine: "framework-flow",
    seed: 1,
    featured: true,
    difficulty: 2,
    family: "featured",
  },
  {
    slug: "big-o-blitz",
    title: "Big-O Blitz",
    blurb: "Match each approach to its time complexity — speed and accuracy both count.",
    minutes: 3,
    skill: "complexity",
    accent: "amber",
    engine: "big-o-blitz",
    seed: 2,
    featured: true,
    difficulty: 3,
    family: "featured",
  },
  {
    slug: "pair-seeker",
    title: "Pair Seeker",
    blurb: "Find two values that sum to the target. Learn why a hash map wins.",
    minutes: 3,
    skill: "hashing",
    accent: "orange",
    engine: "pair-seeker",
    seed: 3,
    featured: true,
    difficulty: 2,
    family: "featured",
  },
  {
    slug: "binary-range",
    title: "Binary Range",
    blurb: "Guess the secret with binary search — halve the space each move.",
    minutes: 2,
    skill: "binary search",
    accent: "emerald",
    engine: "binary-range",
    seed: 4,
    featured: true,
    difficulty: 2,
    family: "featured",
  },
];

export const ARCADE_TARGET_COUNT = ARCADE_GAMES.length;

const bySlug = new Map(ARCADE_GAMES.map((g) => [g.slug, g]));

export function getArcadeGame(slug: string) {
  return bySlug.get(slug) ?? null;
}

export function arcadeClearXp(perfect: boolean) {
  return ARCADE_CLEAR_XP + (perfect ? ARCADE_PERFECT_BONUS_XP : 0);
}

export function arcadeReplayPerfectXp() {
  return Math.floor(ARCADE_PERFECT_BONUS_XP / 2);
}
