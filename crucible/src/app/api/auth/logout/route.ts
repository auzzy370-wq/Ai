import { jsonOk, withHandler } from "@/server/auth/api";
import { destroySession, getSessionUser } from "@/server/auth/session";
import { writeAudit } from "@/server/security/audit";

export async function POST() {
  return withHandler(async () => {
    const user = await getSessionUser();
    await destroySession();
    if (user) {
      await writeAudit({
        actorId: user.id,
        action: "auth.logout",
        entityType: "User",
        entityId: user.id,
      });
    }
    return jsonOk({ loggedOut: true });
  });
}
