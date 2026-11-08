import { jsonOk, withHandler } from "@/server/auth/api";
import { listEnabledProviders, providerEnabled } from "@/server/auth/oauth/config";
import { OAUTH_PROVIDERS, PROVIDER_LABELS } from "@/server/auth/oauth/types";

export async function GET() {
  return withHandler(async () => {
    const enabled = listEnabledProviders();
    return jsonOk({
      providers: OAUTH_PROVIDERS.map((id) => ({
        id,
        label: PROVIDER_LABELS[id],
        enabled: providerEnabled(id),
        startUrl: `/api/auth/oauth/${id}`,
      })),
      anyEnabled: enabled.length > 0,
      configured: enabled,
    });
  });
}
