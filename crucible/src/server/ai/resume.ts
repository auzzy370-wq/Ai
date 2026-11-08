import { completeJson } from "./provider";

export type ResumeAnalysis = {
  summary: string;
  claimedSkills: { name: string; domain: string; confidence: number }[];
  caveats: string[];
};

const DOMAIN_HINTS: Record<string, string> = {
  react: "frontend",
  nextjs: "frontend",
  typescript: "languages",
  javascript: "languages",
  python: "languages",
  go: "languages",
  rust: "languages",
  postgresql: "database",
  prisma: "database",
  redis: "database",
  docker: "infrastructure",
  kubernetes: "infrastructure",
  aws: "cloud",
  gcp: "cloud",
  azure: "cloud",
  oauth: "security",
  jwt: "security",
  websocket: "backend",
  graphql: "backend",
  openai: "ai",
};

function heuristicExtract(text: string): ResumeAnalysis {
  const lower = text.toLowerCase();
  const claimedSkills: ResumeAnalysis["claimedSkills"] = [];
  for (const [token, domain] of Object.entries(DOMAIN_HINTS)) {
    if (lower.includes(token)) {
      claimedSkills.push({
        name: token,
        domain,
        confidence: 0.35,
      });
    }
  }
  return {
    summary:
      "Heuristic résumé extraction completed. Skills listed below are CLAIMED only and are not proof of competence.",
    claimedSkills,
    caveats: [
      "Résumé claims are unverified.",
      "Portfolio evidence and assessment results must corroborate claims.",
      "Human technical review remains authoritative.",
    ],
  };
}

export async function analyzeResumeText(text: string): Promise<ResumeAnalysis> {
  const fallback = heuristicExtract(text);
  const result = await completeJson<ResumeAnalysis>({
    system:
      "You extract claimed skills from engineering résumés. Never treat claims as verified competence. Return JSON with summary, claimedSkills[{name,domain,confidence}], caveats[]. Domains: frontend, backend, database, infrastructure, cloud, security, ai, languages, testing, devops.",
    user: text.slice(0, 12000),
    fallback,
  });
  return {
    ...result.data,
    caveats: [
      ...(result.data.caveats ?? []),
      result.mocked ? "AI provider unavailable; heuristic extractor used." : "AI-assisted extraction; not verification.",
    ],
  };
}
