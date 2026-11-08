import { createRemoteJWKSet, jwtVerify } from "jose";
import { appleClientSecret, callbackUrl } from "./config";
import type { OAuthProfile, OAuthProvider } from "./types";
import { AppError } from "@/lib/errors";

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new AppError(`OAuth provider returned non-JSON (${res.status})`, 502, "OAUTH_BAD_RESPONSE");
  }
}

const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

/** Verify Apple's id_token from the token endpoint — never trust a browser-posted JWT. */
async function verifyAppleIdToken(idToken: string) {
  const audience = process.env.APPLE_CLIENT_ID;
  if (!audience) throw new AppError("Apple Sign In is not configured", 500, "OAUTH_CONFIG");
  const { payload } = await jwtVerify(idToken, appleJwks, {
    issuer: "https://appleid.apple.com",
    audience,
  });
  return payload as {
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
  };
}

export async function exchangeCodeForProfile(opts: {
  provider: OAuthProvider;
  code: string;
  req: Request;
  pkceVerifier?: string | null;
  appleUserName?: string | null;
  /** Ignored for identity — Apple identity comes only from Apple's token response. */
  appleIdToken?: string | null;
}): Promise<OAuthProfile> {
  const { provider, code, req } = opts;
  const redirectUri = callbackUrl(provider, req);

  if (provider === "google") {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const token = await readJson(tokenRes);
    if (!tokenRes.ok || !token.access_token) {
      throw new AppError(token.error_description || "Google token exchange failed", 401, "OAUTH_TOKEN");
    }
    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await readJson(profileRes);
    if (!profile.email) throw new AppError("Google account has no email", 400, "OAUTH_NO_EMAIL");
    const emailVerified = Boolean(profile.email_verified);
    if (!emailVerified) {
      throw new AppError("Google email is not verified", 403, "OAUTH_EMAIL_UNVERIFIED");
    }
    return {
      provider,
      providerUserId: String(profile.sub),
      email: String(profile.email).toLowerCase(),
      emailVerified: true,
      name: String(profile.name || profile.email),
      avatarUrl: profile.picture ?? null,
    };
  }

  if (provider === "github") {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const token = await readJson(tokenRes);
    if (!tokenRes.ok || !token.access_token) {
      throw new AppError(token.error_description || "GitHub token exchange failed", 401, "OAUTH_TOKEN");
    }
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Crucible",
      },
    });
    const user = await readJson(userRes);
    let email: string | null = null;
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Crucible",
      },
    });
    const emails = (await readJson(emailsRes)) as { email: string; primary?: boolean; verified?: boolean }[];
    if (Array.isArray(emails)) {
      const verified =
        emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || null;
      email = verified?.email ?? null;
    }
    if (!email && typeof user.email === "string") {
      // GitHub user.email may be public but not proven verified — refuse linking on it alone.
      email = null;
    }
    if (!email) throw new AppError("GitHub account has no verified email", 400, "OAUTH_NO_EMAIL");
    return {
      provider,
      providerUserId: String(user.id),
      email: email.toLowerCase(),
      emailVerified: true,
      name: String(user.name || user.login || email),
      avatarUrl: user.avatar_url ?? null,
      githubLogin: user.login ?? null,
    };
  }

  if (provider === "facebook") {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        client_id: process.env.FACEBOOK_CLIENT_ID!,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code,
      })}`,
    );
    const token = await readJson(tokenRes);
    if (!tokenRes.ok || !token.access_token) {
      throw new AppError(token.error?.message || "Facebook token exchange failed", 401, "OAUTH_TOKEN");
    }
    const profileRes = await fetch(
      `https://graph.facebook.com/me?${new URLSearchParams({
        fields: "id,name,email,picture.type(large)",
        access_token: token.access_token,
      })}`,
    );
    const profile = await readJson(profileRes);
    // Facebook emails are not strongly verified here — use a provider-scoped synthetic address
    // when linking by email would be unsafe.
    const hasEmail = typeof profile.email === "string" && profile.email.includes("@");
    const email = hasEmail
      ? String(profile.email).toLowerCase()
      : `fb_${profile.id}@oauth.crucible.local`;
    return {
      provider,
      providerUserId: String(profile.id),
      email,
      emailVerified: false,
      name: String(profile.name || email),
      avatarUrl: profile.picture?.data?.url ?? null,
    };
  }

  if (provider === "discord") {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const token = await readJson(tokenRes);
    if (!tokenRes.ok || !token.access_token) {
      throw new AppError(token.error_description || "Discord token exchange failed", 401, "OAUTH_TOKEN");
    }
    const profileRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await readJson(profileRes);
    if (!profile.email) throw new AppError("Discord account has no email", 400, "OAUTH_NO_EMAIL");
    if (!profile.verified) {
      throw new AppError("Discord email is not verified", 403, "OAUTH_EMAIL_UNVERIFIED");
    }
    const avatar = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : null;
    return {
      provider,
      providerUserId: String(profile.id),
      email: String(profile.email).toLowerCase(),
      emailVerified: true,
      name: String(profile.global_name || profile.username || profile.email),
      avatarUrl: avatar,
    };
  }

  if (provider === "x") {
    if (!opts.pkceVerifier) throw new AppError("Missing PKCE verifier for X login", 400, "OAUTH_PKCE");
    const basic = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString(
      "base64",
    );
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: opts.pkceVerifier,
      }),
    });
    const token = await readJson(tokenRes);
    if (!tokenRes.ok || !token.access_token) {
      throw new AppError(token.error_description || "X token exchange failed", 401, "OAUTH_TOKEN");
    }
    const profileRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const body = await readJson(profileRes);
    const user = body.data;
    if (!user?.id) throw new AppError("X profile missing", 400, "OAUTH_PROFILE");
    // X does not provide a verified email in this flow — never claim a real inbox.
    const email = `x_${user.id}@oauth.crucible.local`;
    return {
      provider,
      providerUserId: String(user.id),
      email,
      emailVerified: false,
      name: String(user.name || user.username || email),
      avatarUrl: user.profile_image_url ?? null,
    };
  }

  // Apple — identity only from Apple's verified token response
  const clientSecret = await appleClientSecret();
  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.APPLE_CLIENT_ID!,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const token = await readJson(tokenRes);
  if (!tokenRes.ok || !token.id_token) {
    throw new AppError(token.error_description || "Apple token exchange failed", 401, "OAUTH_TOKEN");
  }
  const claims = await verifyAppleIdToken(String(token.id_token));
  if (!claims.sub) throw new AppError("Apple id_token missing subject", 400, "OAUTH_PROFILE");
  const emailVerified = claims.email_verified === true || claims.email_verified === "true";
  const email =
    typeof claims.email === "string" && emailVerified
      ? claims.email.toLowerCase()
      : `apple_${claims.sub}@oauth.crucible.local`;
  return {
    provider,
    providerUserId: claims.sub,
    email,
    emailVerified: typeof claims.email === "string" ? emailVerified : false,
    name: opts.appleUserName || email.split("@")[0] || "Apple User",
  };
}
