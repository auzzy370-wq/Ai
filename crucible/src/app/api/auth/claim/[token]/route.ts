import { NextRequest } from "next/server";
import { appBaseUrl } from "@/server/auth/oauth/config";

export const runtime = "nodejs";

/**
 * Disabled: putting live session tokens in URLs leaks them to history, proxies, and logs.
 * Use normal password/OAuth sign-in instead.
 */
export async function GET(req: NextRequest) {
  const fail = new URL("/login", appBaseUrl(req));
  fail.searchParams.set("oauth_error", "Magic sign-in links are disabled. Use password or social sign-in.");
  return Response.redirect(fail.toString(), 302);
}
