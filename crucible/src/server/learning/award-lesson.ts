import { LESSON_XP, touchLearnStreak } from "@/server/learning/gamification";

export async function awardLessonClear(opts: { userId: string }) {
  await touchLearnStreak(opts.userId);
  return { xpEarned: LESSON_XP };
}
