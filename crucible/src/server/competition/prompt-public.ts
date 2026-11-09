/**
 * Build the ONLY payload AI models may see for a challenge.
 * Must never include hiddenRequirements, referenceSolution, or private fixtures.
 */
export function extractPublicPrompt(challenge: {
  slug: string;
  title: string;
  summary: string;
  description: string;
  difficulty: number;
  tags: string[];
  languages: string[];
  functionSignature: string | null;
  expectedComplexity: string | null;
  timeLimitMs: number;
  memoryLimitMb: number;
  publicRequirements: unknown;
}): string {
  const publicReqs = Array.isArray(challenge.publicRequirements)
    ? (challenge.publicRequirements as unknown[]).map(String)
    : [];

  // Strip any accidental "hidden" sections from description
  const description = challenge.description
    .replace(/##\s*Hidden[\s\S]*?(?=##|$)/gi, "")
    .replace(/hiddenRequirements[\s\S]*/gi, "")
    .trim();

  return [
    `# ${challenge.title}`,
    ``,
    `Slug: ${challenge.slug}`,
    `Difficulty: D${challenge.difficulty}/10`,
    `Languages: ${challenge.languages.join(", ")}`,
    challenge.functionSignature ? `Signature: ${challenge.functionSignature}` : `Signature: export function solve(...args)`,
    challenge.expectedComplexity ? `Expected complexity: ${challenge.expectedComplexity}` : null,
    `Limits: ${challenge.timeLimitMs}ms · ${challenge.memoryLimitMb} MiB`,
    ``,
    challenge.summary,
    ``,
    description,
    ``,
    publicReqs.length ? `## Public requirements\n${publicReqs.map((r) => `- ${r}`).join("\n")}` : null,
    ``,
    `## Instructions`,
    `Implement the solution in TypeScript. Export the required function.`,
    `You will be judged on public examples and private hidden tests you cannot see.`,
  ]
    .filter(Boolean)
    .join("\n");
}
