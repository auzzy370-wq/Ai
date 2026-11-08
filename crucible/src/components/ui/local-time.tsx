"use client";

import { useEffect, useState } from "react";

/** Locale dates differ on server vs browser — render after mount to avoid hydration mismatch. */
export function LocalTime({
  value,
  fallback = "…",
  className,
}: {
  value: string | number | Date;
  fallback?: string;
  className?: string;
}) {
  const [text, setText] = useState(fallback);

  useEffect(() => {
    setText(new Date(value).toLocaleString());
  }, [value]);

  return (
    <time className={className} dateTime={new Date(value).toISOString()}>
      {text}
    </time>
  );
}
