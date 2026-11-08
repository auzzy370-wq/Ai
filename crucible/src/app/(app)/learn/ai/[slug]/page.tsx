import { notFound } from "next/navigation";
import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRolesOrGuest } from "@/server/auth/page-guard";
import { prisma } from "@/lib/db";
import { AI_CRAFT_PLAN_SLUG, AI_LESSONS, getAiLesson } from "@/server/learning/ai-curriculum";
import { AiLessonClient } from "@/components/learn/ai-lesson-client";

export default async function AiLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePageRolesOrGuest("/learn/ai", CANDIDATE_ROLES);
  const { slug } = await params;
  const lesson = getAiLesson(slug);
  if (!lesson) notFound();

  const enrollment = user
    ? await prisma.studyPlanEnrollment.findUnique({
        where: { userId_planSlug: { userId: user.id, planSlug: AI_CRAFT_PLAN_SLUG } },
      })
    : null;
  const idx = AI_LESSONS.findIndex((l) => l.slug === slug);

  return (
    <AiLessonClient
      slug={lesson.slug}
      title={lesson.title}
      summary={lesson.summary}
      minutes={lesson.minutes}
      level={lesson.level}
      skills={lesson.skills}
      practiceSlug={lesson.practiceSlug}
      bodyMd={lesson.bodyMd}
      done={Boolean(enrollment?.completedSlugs.includes(lesson.slug))}
      prevSlug={idx > 0 ? AI_LESSONS[idx - 1]!.slug : null}
      nextSlug={idx >= 0 && idx < AI_LESSONS.length - 1 ? AI_LESSONS[idx + 1]!.slug : null}
    />
  );
}
