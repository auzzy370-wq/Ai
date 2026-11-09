import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { isPremium, requireUser } from "@/server/auth/session";
import { STUDY_PLANS, getStudyPlan } from "@/server/saas/study-plans";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const enrollments = await prisma.studyPlanEnrollment.findMany({ where: { userId: user.id } });
    const bySlug = new Map(enrollments.map((e) => [e.planSlug, e]));
    const challenges = await prisma.challenge.findMany({
      where: { slug: { in: STUDY_PLANS.flatMap((p) => p.challengeSlugs) } },
      select: { id: true, slug: true, title: true, difficulty: true, isPremium: true, avgMinutes: true },
    });
    const challengeBySlug = new Map(challenges.map((c) => [c.slug, c]));

    return jsonOk({
      premium: isPremium(user),
      plans: STUDY_PLANS.map((plan) => {
        const enr = bySlug.get(plan.slug);
        const completed = new Set(enr?.completedSlugs ?? []);
        const items = plan.challengeSlugs
          .map((slug) => challengeBySlug.get(slug))
          .filter(Boolean)
          .map((c) => ({
            ...c!,
            done: completed.has(c!.slug),
          }));
        return {
          ...plan,
          enrolled: Boolean(enr),
          completedCount: completed.size,
          totalCount: plan.challengeSlugs.length,
          percent: plan.challengeSlugs.length
            ? Math.round((completed.size / plan.challengeSlugs.length) * 100)
            : 0,
          items,
        };
      }),
    });
  });
}

const enrollSchema = z.object({ planSlug: z.string().min(2) });

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = enrollSchema.parse(await req.json());
    const plan = getStudyPlan(body.planSlug);
    if (!plan) throw new AppError("Study plan not found", 404, "NOT_FOUND");
    if (plan.premium && !isPremium(user)) {
      throw new AppError("This study plan requires Premium", 402, "PREMIUM_REQUIRED");
    }
    const enrollment = await prisma.studyPlanEnrollment.upsert({
      where: { userId_planSlug: { userId: user.id, planSlug: plan.slug } },
      create: { userId: user.id, planSlug: plan.slug },
      update: {},
    });
    return jsonOk(enrollment, { status: 201 });
  });
}
