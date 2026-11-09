import { SignJWT, importPKCS8 } from "jose";
import { OAUTH_PROVIDERS, type OAuthProvider } from "./types";

export function appBaseUrl(req?: Request): string {
  const env = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (env && !/localhost|127\.0\.0\.1/.test(env)) return env;
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  }
  return env || "http://127.0.0.1:3847";
}

export function callbackUrl(provider: OAuthProvider, req?: Request) {
  return `${appBaseUrl(req)}/api/auth/oauth/${provider}/callback`;
}

export function providerEnabled(provider: OAuthProvider): boolean {
  switch (provider) {
    case "google":
      return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    case "github":
      return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    case "apple":
      return Boolean(
        process.env.APPLE_CLIENT_ID &&
          process.env.APPLE_TEAM_ID &&
          process.env.APPLE_KEY_ID &&
          process.env.APPLE_PRIVATE_KEY,
      );
    case "facebook":
      return Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
    case "discord":
      return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
    case "x":
      return Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);
  }
}

export function listEnabledProviders(): OAuthProvider[] {
  return OAUTH_PROVIDERS.filter(providerEnabled);
}

export async function appleClientSecret(): Promise<string> {
  const clientId = process.env.APPLE_CLIENT_ID!;
  const teamId = process.env.APPLE_TEAM_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  const raw = (process.env.APPLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const key = await importPKCS8(raw, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("180d")
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .sign(key);
}

export function authorizeUrl(
  provider: OAuthProvider,
  state: string,
  req?: Request,
  pkce?: { challenge: string },
): string {
  const redirectUri = callbackUrl(provider, req);
  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  if (provider === "github") {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state,
      allow_signup: "true",
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }
  if (provider === "facebook") {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_CLIENT_ID!,
      redirect_uri: redirectUri,
      state,
      scope: "email,public_profile",
      response_type: "code",
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }
  if (provider === "discord") {
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify email",
      state,
      prompt: "consent",
    });
    return `https://discord.com/api/oauth2/authorize?${params}`;
  }
  if (provider === "x") {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.X_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: "tweet.read users.read offline.access",
      state,
      code_challenge: pkce?.challenge || "",
      code_challenge_method: "S256",
    });
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }
  // Apple — form_post callback
  const params = new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code id_token",
    response_mode: "form_post",
    scope: "name email",
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params}`;
}
