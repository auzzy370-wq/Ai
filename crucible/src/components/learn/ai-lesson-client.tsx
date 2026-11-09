"use client";

import { LessonPlayer } from "@/components/learn/lesson-player";

export function AiLessonClient(props: {
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
      track="ai"
      pathLabel="AI Craft"
      pathHref="/learn/ai"
      progressApi="/api/learn/ai/progress"
      lessonHref={(slug) => `/learn/ai/${slug}`}
      {...props}
    />
  );
}
