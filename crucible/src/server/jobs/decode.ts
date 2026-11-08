/** Decode common HTML entities from career-site / LinkedIn snippets. */
export function decodeHtml(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function titleFromSlug(slug: string): string {
  return decodeHtml(
    slug
      .split(/[-_+/]+/)
      .filter(Boolean)
      .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1)))
      .join(" "),
  );
}

/** Prefer software / eng roles for the default Jobs browse. */
export function looksLikeEngRole(title: string): boolean {
  const t = title.toLowerCase();
  if (/\b(account executive|sales|recruiter|counsel|attorney|barista|cashier|driver)\b/.test(t)) {
    return false;
  }
  return /\b(software|engineer|engineering|developer|swe|sre|devops|security engineer|machine learning|ml engineer|applied ml|data engineer|full.?stack|backend|front.??end|ios|android|infrastructure|platform|reliability|genai|ai agent)\b/i.test(
    t,
  );
}
