/** Client-safe role access helpers (no server imports). */

export const STAFF_ROLES = ["SUPER_ADMIN", "HIRING_MANAGER", "TECHNICAL_REVIEWER"] as const;
export const CANDIDATE_ROLES = ["CANDIDATE", "TEAM_MEMBER"] as const;
export const ANALYTICS_ROLES = ["SUPER_ADMIN", "HIRING_MANAGER", "TECHNICAL_REVIEWER"] as const;

export type AppRole =
  | "SUPER_ADMIN"
  | "HIRING_MANAGER"
  | "TECHNICAL_REVIEWER"
  | "CANDIDATE"
  | "TEAM_MEMBER";

export type SettingsTab = "account" | "preferences" | "privacy" | "security" | "sessions";

export function settingsTabsForRole(role: string): SettingsTab[] {
  if (role === "CANDIDATE" || role === "TEAM_MEMBER") {
    return ["account", "preferences", "privacy", "security", "sessions"];
  }
  return ["account", "security", "sessions"];
}

export function canManageCandidates(role: string) {
  return role === "SUPER_ADMIN" || role === "HIRING_MANAGER";
}

export function canReview(role: string) {
  return role === "SUPER_ADMIN" || role === "HIRING_MANAGER" || role === "TECHNICAL_REVIEWER";
}

export function canAdmin(role: string) {
  return role === "SUPER_ADMIN";
}

export function isStaff(role: string) {
  return canReview(role);
}

export const PAGE_ROLE_ACCESS: { prefix: string; roles: readonly string[] }[] = [
  { prefix: "/admin", roles: ["SUPER_ADMIN"] },
  { prefix: "/analytics", roles: ANALYTICS_ROLES },
  { prefix: "/reviews", roles: ANALYTICS_ROLES },
  { prefix: "/daily", roles: CANDIDATE_ROLES },
  { prefix: "/weekly", roles: CANDIDATE_ROLES },
  { prefix: "/contest", roles: CANDIDATE_ROLES },
  { prefix: "/study-plans", roles: CANDIDATE_ROLES },
  { prefix: "/roadmap", roles: CANDIDATE_ROLES },
  { prefix: "/learn", roles: CANDIDATE_ROLES },
  { prefix: "/interview", roles: CANDIDATE_ROLES },
  {
    prefix: "/jobs",
    roles: [...CANDIDATE_ROLES, ...STAFF_ROLES],
  },
  { prefix: "/playgrounds", roles: CANDIDATE_ROLES },
  {
    prefix: "/leaderboards",
    roles: [...CANDIDATE_ROLES, ...STAFF_ROLES],
  },
  {
    prefix: "/ai-vs-human",
    roles: [...CANDIDATE_ROLES, ...STAFF_ROLES],
  },
  {
    prefix: "/tournaments",
    roles: [...CANDIDATE_ROLES, ...STAFF_ROLES],
  },
  {
    prefix: "/research-frontier",
    roles: [...CANDIDATE_ROLES, ...STAFF_ROLES],
  },
  {
    prefix: "/benchmarks",
    roles: [...CANDIDATE_ROLES, ...STAFF_ROLES],
  },
];

export function canAccessPath(role: string, pathname: string): boolean {
  const hit = PAGE_ROLE_ACCESS.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (!hit) return true;
  return hit.roles.includes(role);
}

export function homeForRole(role: string): string {
  return (CANDIDATE_ROLES as readonly string[]).includes(role) ? "/learn" : "/dashboard";
}

/** Paths guests can use without signing in (nav + page guards). */
export const GUEST_FREE_PREFIXES = ["/learn", "/challenges"] as const;

export function isGuestFreePath(pathname: string): boolean {
  return GUEST_FREE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
