import { NextRequest } from "next/server";
import { authorizeUrl, providerEnabled } from "@/server/auth/oauth/config";
import { createPkcePair, issueOAuthState } from "@/server/auth/oauth/state";
import { isOAuthProvider } from "@/server/auth/oauth/types";
import { appBaseUrl } from "@/server/auth/oauth/config";

export const runtime = "nodejs";

function redirectError(req: NextRequest, message: string) {
  const url = new URL("/login", appBaseUrl(req));
  url.searchParams.set("oauth_error", message);
  return Response.redirect(url.toString(), 302);
}

/** Start OAuth — redirects the browser to the provider. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await ctx.params;
  if (!isOAuthProvider(raw)) return redirectError(req, "Unknown sign-in provider");
  if (!providerEnabled(raw)) {
    return redirectError(req, `${raw} sign-in is not configured yet`);
  }

  try {
    const pkce = raw === "x" ? createPkcePair() : null;
    const state = await issueOAuthState(raw, pkce?.verifier);
    const url = authorizeUrl(raw, state, req, pkce ? { challenge: pkce.challenge } : undefined);
    return Response.redirect(url, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start sign-in";
    return redirectError(req, message);
  }
}
