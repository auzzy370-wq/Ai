import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/server/security/headers";

/** Security headers on every response. Auth is enforced in route/page guards. */
export default function middleware(req: NextRequest) {
  const res = NextResponse.next();
  applySecurityHeaders(res);

  // Force HTTPS redirect when behind a TLS-terminating proxy that sets X-Forwarded-Proto
  if (
    process.env.FORCE_HTTPS === "true" ||
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production"
  ) {
    const proto = req.headers.get("x-forwarded-proto");
    if (proto === "http") {
      const url = req.nextUrl.clone();
      url.protocol = "https:";
      const redirect = NextResponse.redirect(url, 308);
      applySecurityHeaders(redirect);
      return redirect;
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
