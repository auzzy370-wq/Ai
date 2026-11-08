import { NextRequest } from "next/server";
import { appBaseUrl, providerEnabled } from "@/server/auth/oauth/config";
import { exchangeCodeForProfile } from "@/server/auth/oauth/exchange";
import { loginWithOAuthProfile } from "@/server/auth/oauth/service";
import { consumeOAuthState } from "@/server/auth/oauth/state";
import { isOAuthProvider } from "@/server/auth/oauth/types";

export const runtime = "nodejs";
export const maxDuration = 30;

function redirectTo(req: NextRequest, path: string, error?: string) {
  const url = new URL(path, appBaseUrl(req));
  if (error) url.searchParams.set("oauth_error", error);
  return Response.redirect(url.toString(), 302);
}

async function finishOAuth(
  req: NextRequest,
  providerRaw: string,
  params: { code?: string | null; state?: string | null; idToken?: string | null; userJson?: string | null },
) {
  if (!isOAuthProvider(providerRaw)) return redirectTo(req, "/login", "Unknown sign-in provider");
  if (!providerEnabled(providerRaw)) {
    return redirectTo(req, "/login", `${providerRaw} sign-in is not configured`);
  }
  if (!params.code) return redirectTo(req, "/login", "Sign-in was cancelled");

  const stateCheck = await consumeOAuthState(providerRaw, params.state);
  if (!stateCheck.ok) return redirectTo(req, "/login", "Sign-in expired — try again");

  let appleUserName: string | null = null;
  if (params.userJson) {
    try {
      const parsed = JSON.parse(params.userJson) as { name?: { firstName?: string; lastName?: string } };
      const first = parsed.name?.firstName || "";
      const last = parsed.name?.lastName || "";
      appleUserName = `${first} ${last}`.trim() || null;
    } catch {
      /* ignore */
    }
  }

  try {
    const profile = await exchangeCodeForProfile({
      provider: providerRaw,
      code: params.code,
      req,
      pkceVerifier: stateCheck.pkce,
      appleUserName,
      appleIdToken: params.idToken,
    });
    const { clientIp } = await import("@/server/security/client-ip");
    await loginWithOAuthProfile(profile, {
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return redirectTo(req, "/dashboard");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign-in failed";
    return redirectTo(req, "/login", message.slice(0, 180));
  }
}

/** Google / GitHub / Facebook / Discord / X callbacks (query string). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  if (url.searchParams.get("error")) {
    return redirectTo(req, "/login", url.searchParams.get("error_description") || "Sign-in denied");
  }
  return finishOAuth(req, provider, {
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
  });
}

/** Apple uses response_mode=form_post. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const form = await req.formData();
  if (form.get("error")) {
    return redirectTo(req, "/login", String(form.get("error_description") || form.get("error") || "Sign-in denied"));
  }
  return finishOAuth(req, provider, {
    code: form.get("code")?.toString() ?? null,
    state: form.get("state")?.toString() ?? null,
    idToken: form.get("id_token")?.toString() ?? null,
    userJson: form.get("user")?.toString() ?? null,
  });
}
