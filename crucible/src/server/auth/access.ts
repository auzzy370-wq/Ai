import { Role } from "@prisma/client";
import {
  ANALYTICS_ROLES as ANALYTICS_ROLES_BASE,
  CANDIDATE_ROLES as CANDIDATE_ROLES_BASE,
  STAFF_ROLES as STAFF_ROLES_BASE,
  canAccessPath as canAccessPathBase,
  canAdmin as canAdminBase,
  canManageCandidates as canManageCandidatesBase,
  canReview as canReviewBase,
  homeForRole as homeForRoleBase,
  isStaff as isStaffBase,
  settingsTabsForRole as settingsTabsForRoleBase,
} from "@/lib/access";

export const STAFF_ROLES = [...STAFF_ROLES_BASE] as Role[];
export const CANDIDATE_ROLES = [...CANDIDATE_ROLES_BASE] as Role[];
export const ANALYTICS_ROLES = [...ANALYTICS_ROLES_BASE] as Role[];

export type AdminTab =
  | "overview"
  | "analytics"
  | "users"
  | "assignments"
  | "library"
  | "jobs"
  | "ai"
  | "audit"
  | "system";

export const SUPER_ADMIN_TABS: AdminTab[] = [
  "overview",
  "analytics",
  "users",
  "assignments",
  "library",
  "jobs",
  "ai",
  "audit",
  "system",
];

export function canAccessPath(role: Role, pathname: string) {
  return canAccessPathBase(role, pathname);
}

export function homeForRole(role: Role) {
  return homeForRoleBase(role);
}

export function settingsTabsForRole(role: Role) {
  return settingsTabsForRoleBase(role);
}

export function canAdmin(role: Role) {
  return canAdminBase(role);
}

export function canManageCandidates(role: Role) {
  return canManageCandidatesBase(role);
}

export function canReview(role: Role) {
  return canReviewBase(role);
}

export function isStaff(role: Role) {
  return isStaffBase(role);
}
