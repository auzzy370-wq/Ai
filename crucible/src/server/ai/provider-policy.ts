/** Allowlisted env var names that may be used as AI API keys — never DATABASE_URL etc. */
export const ALLOWED_AI_API_KEY_ENVS = [
  "OPENAI_API_KEY",
  "GROQ_API_KEY",
  "OPENROUTER_API_KEY",
  "ANTHROPIC_API_KEY",
  "AZURE_OPENAI_API_KEY",
  "TOGETHER_API_KEY",
  "FIREWORKS_API_KEY",
] as const;

export type AllowedAiApiKeyEnv = (typeof ALLOWED_AI_API_KEY_ENVS)[number];

const ALLOWED_AI_HOST_SUFFIXES = [
  "openai.com",
  "api.openai.com",
  "api.groq.com",
  "openrouter.ai",
  "api.anthropic.com",
  "openai.azure.com",
  "api.together.xyz",
  "api.fireworks.ai",
];

export function isAllowedAiApiKeyEnv(name: string): name is AllowedAiApiKeyEnv {
  return (ALLOWED_AI_API_KEY_ENVS as readonly string[]).includes(name);
}

export function isAllowedAiBaseUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  // Block link-local / private ranges
  if (
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return false;
  }
  return ALLOWED_AI_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}
