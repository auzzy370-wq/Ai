import type { Role } from "@prisma/client";

/** Comma/space-separated emails that should always land as SUPER_ADMIN. */
export function superAdminEmails(): Set<string> {
  const raw = process.env.SUPER_ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Optional Apple `sub` values that should become SUPER_ADMIN even if email is private-relay. */
export function superAdminAppleSubs(): Set<string> {
  const raw = process.env.SUPER_ADMIN_APPLE_SUBS || "";
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean),
  );
}

export function resolveBootstrapRole(opts: {
  email: string;
  provider?: string;
  providerUserId?: string;
  current?: Role;
}): Role {
  const email = opts.email.toLowerCase().trim();
  if (superAdminEmails().has(email)) return "SUPER_ADMIN";
  if (
    opts.provider === "apple" &&
    opts.providerUserId &&
    superAdminAppleSubs().has(opts.providerUserId)
  ) {
    return "SUPER_ADMIN";
  }
  return opts.current ?? "CANDIDATE";
}
