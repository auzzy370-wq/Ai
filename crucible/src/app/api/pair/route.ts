import { z } from "zod";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { createPairSession, joinPairSession, getPairForWorkspace } from "@/server/saas/pair";

const createSchema = z.object({
  workspaceId: z.string(),
  guestRole: z.enum(["SHADOW", "NAVIGATOR", "DRIVER"]).optional(),
});

const joinSchema = z.object({
  code: z.string().min(4),
});

export async function GET(req: Request) {
  return withHandler(async () => {
    await requireUser();
    const workspaceId = new URL(req.url).searchParams.get("workspaceId");
    if (!workspaceId) return jsonOk(null);
    const session = await getPairForWorkspace(workspaceId);
    return jsonOk(session);
  });
}

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = await req.json();
    if (body.code) {
      const parsed = joinSchema.parse(body);
      const session = await joinPairSession({ code: parsed.code, guestId: user.id });
      return jsonOk(session);
    }
    const parsed = createSchema.parse(body);
    const session = await createPairSession({
      hostId: user.id,
      workspaceId: parsed.workspaceId,
      guestRole: parsed.guestRole,
    });
    return jsonOk(session, { status: 201 });
  });
}
