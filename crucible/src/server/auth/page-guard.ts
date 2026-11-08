import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { canAccessPath, homeForRole, isGuestFreePath } from "@/lib/access";

export async function requirePageRoles(roles?: readonly string[], opts?: { redirectTo?: string }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) {
    redirect(opts?.redirectTo ?? homeForRole(user.role));
  }
  return user;
}

/** Auth when available; guests allowed only on free Learn paths. */
export async function requirePageRolesOrGuest(
  pathname: string,
  roles?: readonly string[],
  opts?: { redirectTo?: string },
) {
  const user = await getSessionUser();
  if (!user) {
    if (isGuestFreePath(pathname)) return null;
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }
  if (roles && user && !roles.includes(user.role)) {
    redirect(opts?.redirectTo ?? homeForRole(user.role));
  }
  return user;
}

export async function requirePathAccess(pathname: string) {
  const user = await getSessionUser();
  if (!user) {
    if (isGuestFreePath(pathname)) return null;
    redirect("/login");
  }
  if (user && !canAccessPath(user.role, pathname)) {
    redirect(homeForRole(user.role));
  }
  return user;
}
