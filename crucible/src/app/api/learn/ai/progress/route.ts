import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { AI_CRAFT_PLAN_SLUG, AI_LESSONS, getAiLesson, nextAiLesson } from "@/server/learning/ai-curriculum";
import { awardLessonClear } from "@/server/learning/award-lesson";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const enrollment = await prisma.studyPlanEnrollment.findUnique({
      where: { userId_planSlug: { userId: user.id, planSlug: AI_CRAFT_PLAN_SLUG } },
    });
    const completed = enrollment?.completedSlugs ?? [];
    const done = new Set(completed);
    const next = nextAiLesson(done);
    return jsonOk({
      enrolled: Boolean(enrollment),
      completedSlugs: completed,
      completedCount: completed.length,
      totalCount: AI_LESSONS.length,
      percent: Math.round((completed.length / AI_LESSONS.length) * 100),
      nextLesson: next
        ? { slug: next.slug, title: next.title, summary: next.summary, minutes: next.minutes, level: next.level }
        : null,
      lessons: AI_LESSONS.map((l) => ({
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        minutes: l.minutes,
        level: l.level,
        skills: l.skills,
        practiceSlug: l.practiceSlug ?? null,
        done: done.has(l.slug),
      })),
    });
  });
}

const postSchema = z.object({
  lessonSlug: z.string().min(2).optional(),
  done: z.boolean().default(true),
  enroll: z.boolean().optional(),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = postSchema.parse(await req.json());

    let enrollment = await prisma.studyPlanEnrollment.findUnique({
      where: { userId_planSlug: { userId: user.id, planSlug: AI_CRAFT_PLAN_SLUG } },
    });
    if (!enrollment) {
      enrollment = await prisma.studyPlanEnrollment.create({
        data: { userId: user.id, planSlug: AI_CRAFT_PLAN_SLUG },
      });
    }

    if (body.enroll && !body.lessonSlug) {
      return jsonOk({ enrolled: true, completedSlugs: enrollment.completedSlugs });
    }

    if (!body.lessonSlug) throw new AppError("lessonSlug required", 400, "BAD_REQUEST");
    const lesson = getAiLesson(body.lessonSlug);
    if (!lesson) throw new AppError("Lesson not found", 404, "NOT_FOUND");

    const before = [...enrollment.completedSlugs];
    const set = new Set(before);
    const alreadyDone = set.has(body.lessonSlug);
    if (body.done) set.add(body.lessonSlug);
    else set.delete(body.lessonSlug);
    const after = [...set];

    const updated = await prisma.studyPlanEnrollment.update({
      where: { id: enrollment.id },
      data: { completedSlugs: after },
    });
    let award = { xpEarned: 0 };
    if (body.done && !alreadyDone) {
      award = await awardLessonClear({ userId: user.id });
    }
    return jsonOk({
      enrolled: true,
      completedSlugs: updated.completedSlugs,
      nextLesson: nextAiLesson(updated.completedSlugs),
      ...award,
    });
  });
}
