import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  ALLOWED_AI_API_KEY_ENVS,
  isAllowedAiApiKeyEnv,
  isAllowedAiBaseUrl,
} from "@/server/ai/provider-policy";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { assertSameOrigin } from "@/server/security/origin";

export async function GET() {
  return withHandler(async () => {
    await requireUser(["SUPER_ADMIN"]);
    const providers = await prisma.aiProviderConfig.findMany({ orderBy: { createdAt: "asc" } });
    return jsonOk(
      providers.map((p) => ({
        ...p,
        apiKeyConfigured: isAllowedAiApiKeyEnv(p.apiKeyEnv) && Boolean(process.env[p.apiKeyEnv]),
      })),
    );
  });
}

const schema = z.object({
  name: z.string().min(1).max(80),
  baseUrl: z.string().url().max(500),
  model: z.string().min(1).max(200),
  apiKeyEnv: z.enum(ALLOWED_AI_API_KEY_ENVS as unknown as [string, ...string[]]),
  isDefault: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    assertSameOrigin(req);
    await requireUser(["SUPER_ADMIN"]);
    const body = schema.parse(await req.json());
    if (!isAllowedAiApiKeyEnv(body.apiKeyEnv)) {
      throw new AppError("apiKeyEnv is not on the allowlist", 400, "AI_KEY_ENV_FORBIDDEN");
    }
    if (!isAllowedAiBaseUrl(body.baseUrl)) {
      throw new AppError(
        "baseUrl must be https and an allowlisted AI vendor host (no private/internal URLs)",
        400,
        "AI_BASE_URL_FORBIDDEN",
      );
    }
    if (body.isDefault) {
      await prisma.aiProviderConfig.updateMany({ data: { isDefault: false } });
    }
    const provider = await prisma.aiProviderConfig.create({ data: body });
    return jsonOk(provider, { status: 201 });
  });
}
