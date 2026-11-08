"use client";

import { LessonPlayer } from "@/components/learn/lesson-player";

export function InterviewLessonClient(props: {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  level: string;
  skills: string[];
  practiceSlug?: string | null;
  bodyMd: string;
  done: boolean;
  prevSlug: string | null;
  nextSlug: string | null;
}) {
  return (
    <LessonPlayer
      track="interview"
      pathLabel="Interview Craft"
      pathHref="/learn/interview"
      progressApi="/api/learn/interview/progress"
      lessonHref={(slug) => `/learn/interview/${slug}`}
      {...props}
    />
  );
}
