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

/** Short plain-text blurb for Jobs cards (from posting HTML/text). */
export function summarizeJobText(raw: string | null | undefined, maxLen = 200): string | null {
  if (!raw) return null;
  let text = decodeHtml(raw)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  text = text.replace(
    /^(about (the )?(role|job|position|us)|overview|who we are|the role|job description)\s*[:.\-–—]?\s*/i,
    "",
  );
  if (text.length < 48) return null;
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen - 1);
  return `${cut.replace(/\s+\S*$/, "").replace(/[.,;:\-–—\s]+$/, "")}…`;
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

const NON_TECH =
  /\b(account executive|sales|recruiter|counsel|attorney|barista|cashier|driver|marketing manager|brand manager)\b/i;

/** Cybersecurity / infosec / AppSec / SOC style roles. */
export function looksLikeCyberRole(title: string): boolean {
  const t = title.toLowerCase();
  if (NON_TECH.test(t)) return false;
  return /\b(cyber\s*security|cybersecurity|information security|infosec|appsec|product security|application security|security engineer|security analyst|security architect|security researcher|security consultant|penetration|pen\s*test|red team|blue team|purple team|threat intel|threat intelligence|threat detection|detection engineer|soc analyst|soc engineer|incident response|malware|vulnerability|offensive security|defensive security|cloud security|network security|identity security|zero[\s-]?trust|cryptograph|ciso|grc|devsecops|secure coding)\b/i.test(
    t,
  );
}

/** Prefer software / eng / security roles for the default Jobs browse. */
export function looksLikeEngRole(title: string): boolean {
  const t = title.toLowerCase();
  if (NON_TECH.test(t)) return false;
  if (looksLikeCyberRole(t)) return true;
  return /\b(software|engineer|engineering|developer|swe|sre|devops|machine learning|ml engineer|applied ml|data engineer|full.?stack|backend|front.??end|ios|android|infrastructure|platform|reliability|genai|ai agent)\b/i.test(
    t,
  );
}

export type JobFocus = "all" | "engineering" | "cybersecurity";

/** Filter postings by Jobs focus chip. */
export function matchesJobFocus(title: string, focus: JobFocus): boolean {
  if (focus === "all") return looksLikeEngRole(title);
  if (focus === "cybersecurity") return looksLikeCyberRole(title);
  // Engineering: tech roles that are not primarily cyber-titled.
  return looksLikeEngRole(title) && !looksLikeCyberRole(title);
}
