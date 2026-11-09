import { notFound } from "next/navigation";
import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRolesOrGuest } from "@/server/auth/page-guard";
import { prisma } from "@/lib/db";
import {
  INTERVIEW_CRAFT_PLAN_SLUG,
  INTERVIEW_LESSONS,
  getInterviewLesson,
} from "@/server/learning/interview-curriculum";
import { InterviewLessonClient } from "@/components/learn/interview-lesson-client";

export default async function InterviewLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePageRolesOrGuest("/learn/interview", CANDIDATE_ROLES);
  const { slug } = await params;
  const lesson = getInterviewLesson(slug);
  if (!lesson) notFound();

  const enrollment = user
    ? await prisma.studyPlanEnrollment.findUnique({
        where: { userId_planSlug: { userId: user.id, planSlug: INTERVIEW_CRAFT_PLAN_SLUG } },
      })
    : null;
  const idx = INTERVIEW_LESSONS.findIndex((l) => l.slug === slug);

  return (
    <InterviewLessonClient
      slug={lesson.slug}
      title={lesson.title}
      summary={lesson.summary}
      minutes={lesson.minutes}
      level={lesson.level}
      skills={lesson.skills}
      practiceSlug={lesson.practiceSlug}
      bodyMd={lesson.bodyMd}
      done={Boolean(enrollment?.completedSlugs.includes(lesson.slug))}
      prevSlug={idx > 0 ? INTERVIEW_LESSONS[idx - 1]!.slug : null}
      nextSlug={idx >= 0 && idx < INTERVIEW_LESSONS.length - 1 ? INTERVIEW_LESSONS[idx + 1]!.slug : null}
    />
  );
}
