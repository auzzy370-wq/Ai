import { COMPANIES } from "@/lib/saas";

export type InterviewRoundKind = "phone" | "coding" | "onsite";

export type InterviewRoundDef = {
  id: InterviewRoundKind;
  title: string;
  blurb: string;
  minutes: number;
  difficultyBias: "easy" | "mixed" | "hard";
  xp: number;
};

export const INTERVIEW_ROUNDS: InterviewRoundDef[] = [
  {
    id: "phone",
    title: "Phone screen",
    blurb: "Fast pattern recall under a short clock — arrays, hashing, strings.",
    minutes: 30,
    difficultyBias: "easy",
    xp: 80,
  },
  {
    id: "coding",
    title: "Coding loop",
    blurb: "Full timed coding round with the public + hidden judge bar.",
    minutes: 45,
    difficultyBias: "mixed",
    xp: 120,
  },
  {
    id: "onsite",
    title: "Onsite drill",
    blurb: "Longer session for harder graphs, DP, and systems-shaped problems.",
    minutes: 60,
    difficultyBias: "hard",
    xp: 160,
  },
];

export const INTERVIEW_ROLES = [
  "Software Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "Full-Stack Engineer",
  "New Grad SWE",
  "Senior Software Engineer",
  "Platform / SRE",
  "Security Engineer",
] as const;

export const INTERVIEW_COMPANIES = COMPANIES;

export function getInterviewRound(id: string) {
  return INTERVIEW_ROUNDS.find((r) => r.id === id) ?? INTERVIEW_ROUNDS[1]!;
}

export const FREE_MOCK_LIMIT = 1;

export const ROUND_BRIEFING: Record<
  InterviewRoundKind,
  { title: string; steps: string[] }
> = {
  phone: {
    title: "Phone screen briefing",
    steps: [
      "Clarify inputs, outputs, and constraints out loud before coding.",
      "Start with a brute-force sketch, then tighten.",
      "Leave 3 minutes to dry-run an edge case.",
    ],
  },
  coding: {
    title: "Coding loop briefing",
    steps: [
      "Treat this like a real loop: narrate tradeoffs while you type.",
      "Pass the public harness first, then hunt hidden cases.",
      "If stuck at 15 minutes, reset the approach — don't polish a dead end.",
    ],
  },
  onsite: {
    title: "Onsite drill briefing",
    steps: [
      "Budget time: 10m design, 35m implement, 15m tests & edges.",
      "Name complexity early; interviewers care that you own it.",
      "When the judge fails, read the failure before rewriting everything.",
    ],
  },
};
