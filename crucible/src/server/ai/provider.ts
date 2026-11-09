import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isAllowedAiApiKeyEnv, isAllowedAiBaseUrl } from "@/server/ai/provider-policy";

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmProviderConfig = {
  name: string;
  baseUrl: string;
  model: string;
  apiKeyEnv: string;
};

/** Free / cheap OpenAI-compatible endpoints preferred for competition benches. */
export const FREE_PROVIDER_PRESETS: LlmProviderConfig[] = [
  {
    name: "groq-free",
    baseUrl: "https://api.groq.com/openai/v1",
    model: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
    apiKeyEnv: "GROQ_API_KEY",
  },
  {
    name: "openrouter-free",
    baseUrl: "https://openrouter.ai/api/v1",
    model: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.2-3b-instruct:free",
    apiKeyEnv: "OPENROUTER_API_KEY",
  },
];

export function envHasKey(apiKeyEnv: string): boolean {
  const v = process.env[apiKeyEnv];
  return Boolean(v && v.trim());
}

/** Prefer Groq → OpenRouter → configured DB provider → OPENAI_* env. */
export async function getActiveProvider(): Promise<LlmProviderConfig> {
  for (const preset of FREE_PROVIDER_PRESETS) {
    if (envHasKey(preset.apiKeyEnv)) return preset;
  }

  const configured = await prisma.aiProviderConfig.findFirst({
    where: { enabled: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (
    configured &&
    isAllowedAiApiKeyEnv(configured.apiKeyEnv) &&
    isAllowedAiBaseUrl(configured.baseUrl)
  ) {
    return {
      name: configured.name,
      baseUrl: configured.baseUrl,
      model: configured.model,
      apiKeyEnv: configured.apiKeyEnv,
    };
  }
  if (configured) {
    logger.warn("Ignoring AI provider config that fails allowlist checks", {
      name: configured.name,
      baseUrl: configured.baseUrl,
      apiKeyEnv: configured.apiKeyEnv,
    });
  }

  return {
    name: "default-openai-compatible",
    baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    apiKeyEnv: "OPENAI_API_KEY",
  };
}

export async function completeJson<T>(params: {
  system: string;
  user: string;
  fallback: T;
  /** When set (e.g. competition AiModel), overrides the active provider. */
  providerOverride?: Partial<LlmProviderConfig> & { name?: string };
}): Promise<{ data: T; provider: string; model: string; mocked: boolean }> {
  const active = await getActiveProvider();
  const provider: LlmProviderConfig = {
    name: params.providerOverride?.name ?? active.name,
    baseUrl: params.providerOverride?.baseUrl ?? active.baseUrl,
    model: params.providerOverride?.model ?? active.model,
    apiKeyEnv: params.providerOverride?.apiKeyEnv ?? active.apiKeyEnv,
  };

  // Never send arbitrary env values (DATABASE_URL, SESSION_SECRET, …) to a model host.
  const keyEnv = isAllowedAiApiKeyEnv(provider.apiKeyEnv) ? provider.apiKeyEnv : null;
  let apiKey = (keyEnv && process.env[keyEnv]?.trim()) || "";
  let baseUrl = isAllowedAiBaseUrl(provider.baseUrl) ? provider.baseUrl : "";
  let modelId = provider.model;
  let providerName = provider.name;

  if (!apiKey || !baseUrl) {
    const fallbackPreset = FREE_PROVIDER_PRESETS.find((p) => envHasKey(p.apiKeyEnv));
    if (fallbackPreset) {
      apiKey = process.env[fallbackPreset.apiKeyEnv]!.trim();
      baseUrl = fallbackPreset.baseUrl;
      modelId = fallbackPreset.model;
      providerName = `${provider.name}→${fallbackPreset.name}`;
    }
  }

  const allowMock = process.env.AI_FALLBACK_MOCK !== "false";

  if (!apiKey || !baseUrl) {
    if (!allowMock) throw new Error("No AI API key configured (set GROQ_API_KEY or OPENROUTER_API_KEY)");
    logger.warn("AI provider missing API key; using deterministic mock", { provider: provider.name });
    return {
      data: params.fallback,
      provider: provider.name,
      model: provider.model,
      mocked: true,
    };
  }

  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl,
    defaultHeaders: baseUrl.includes("openrouter.ai")
      ? {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3847",
          "X-Title": "Crucible AI vs Human",
        }
      : undefined,
  });

  const messages = [
    {
      role: "system" as const,
      content: `${params.system}\n\nRespond with a single JSON object only.`,
    },
    { role: "user" as const, content: params.user },
  ];

  const parseModelJson = (text: string): T => {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const attempts = [cleaned];
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) attempts.push(cleaned.slice(start, end + 1));
    // Competition benches: salvage {"language","code"} even when models append prose
    const codeMatch = cleaned.match(
      /\{\s*"language"\s*:\s*"([^"\\]*)"\s*,\s*"code"\s*:\s*"((?:\\.|[^"\\])*)"\s*(?:,\s*"explanation"\s*:\s*"((?:\\.|[^"\\])*)")?\s*\}/,
    );
    if (codeMatch) {
      try {
        return {
          language: codeMatch[1],
          code: JSON.parse(`"${codeMatch[2]}"`),
          ...(codeMatch[3] != null ? { explanation: JSON.parse(`"${codeMatch[3]}"`) } : {}),
        } as T;
      } catch {
        /* fall through */
      }
    }
    // Raw TypeScript export if JSON completely failed
    if (/export\s+(?:async\s+)?function\s+\w+|export\s+class\s+\w+/.test(cleaned)) {
      const fence = cleaned.match(/```(?:typescript|ts|javascript|js)?\s*([\s\S]*?)```/i);
      const code = (fence?.[1] ?? cleaned).trim();
      return { language: "typescript", code, explanation: "Recovered non-JSON model output" } as T;
    }
    let lastErr: unknown;
    for (const attempt of attempts) {
      try {
        return JSON.parse(attempt) as T;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Model did not return valid JSON");
  };

  try {
    // Prefer JSON mode; some free models (esp. Groq) reject it — retry plain chat.
    let text = "";
    try {
      const completion = await client.chat.completions.create({
        model: modelId,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      });
      text = completion.choices[0]?.message?.content ?? "{}";
    } catch (jsonModeErr) {
      logger.warn("JSON mode unsupported; retrying plain completion", {
        provider: providerName,
        model: modelId,
        err: jsonModeErr instanceof Error ? jsonModeErr.message : String(jsonModeErr),
      });
      const completion = await client.chat.completions.create({
        model: modelId,
        temperature: 0.2,
        messages,
      });
      text = completion.choices[0]?.message?.content ?? "{}";
    }

    return {
      data: parseModelJson(text),
      provider: providerName,
      model: modelId,
      mocked: false,
    };
  } catch (err) {
    logger.error("AI completion failed; falling back", {
      err: err instanceof Error ? err.message : String(err),
      provider: providerName,
      model: modelId,
    });
    if (!allowMock) throw err;
    return {
      data: params.fallback,
      provider: providerName,
      model: modelId,
      mocked: true,
    };
  }
}
