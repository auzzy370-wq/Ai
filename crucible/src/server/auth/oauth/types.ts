export type OAuthProvider = "google" | "github" | "apple" | "facebook" | "discord" | "x";

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  "google",
  "github",
  "apple",
  "facebook",
  "discord",
  "x",
];

export type OAuthProfile = {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string | null;
  githubLogin?: string | null;
};

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as string[]).includes(value);
}

export const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
  apple: "Apple",
  facebook: "Facebook",
  discord: "Discord",
  x: "X",
};
