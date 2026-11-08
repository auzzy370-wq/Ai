import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { Role, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const SESSION_COOKIE = "crucible_session";
const COOKIE = SESSION_COOKIE;
const TTL_MS = 1000 * 60 * 60 * 24 * 14;

export type AuthUser = Pick<
  User,
  "id" | "email" | "name" | "role" | "avatarUrl" | "githubLogin" | "plan" | "planExpiresAt"
>;

/** Secure cookies only on real HTTPS (Vercel). NODE_ENV=production on http://localhost must stay non-Secure or browsers drop the session. */
function sessionCookieSecure() {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.VERCEL === "1" || process.env.VERCEL === "true") return true;
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  return appUrl.startsWith("https://");
}

export async function createSession(userId: string, meta?: { ip?: string; userAgent?: string }) {
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + TTL_MS);
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    },
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    jar.delete(COOKIE);
  }
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  const { id, email, name, role, avatarUrl, githubLogin, plan, planExpiresAt } = session.user;
  return { id, email, name, role, avatarUrl, githubLogin, plan, planExpiresAt };
}

export function isPremium(user: Pick<AuthUser, "plan" | "planExpiresAt" | "role"> | null | undefined) {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "HIRING_MANAGER") return true;
  if (user.plan !== "PREMIUM") return false;
  if (user.planExpiresAt && user.planExpiresAt < new Date()) return false;
  return true;
}

export async function requireUser(roles?: Role[]): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  if (roles && !roles.includes(user.role)) {
    throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
  }
  return user;
}

export function canManageCandidates(role: Role) {
  return role === "SUPER_ADMIN" || role === "HIRING_MANAGER";
}

export function canReview(role: Role) {
  return role === "SUPER_ADMIN" || role === "HIRING_MANAGER" || role === "TECHNICAL_REVIEWER";
}

export function canAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}

export function isStaff(role: Role) {
  return canReview(role);
}
