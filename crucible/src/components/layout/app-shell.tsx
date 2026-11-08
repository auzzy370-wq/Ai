"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Shield,
  Crosshair,
  Boxes,
  ScrollText,
  Settings,
  Network,
  LogOut,
  Menu,
  X,
  Sparkles,
  Timer,
  BookOpen,
  UserRound,
  BarChart3,
  Briefcase,
  Swords,
  Trophy,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CrucibleLockup } from "@/components/brand/crucible-lockup";
import { SignInModal } from "@/components/auth/sign-in-modal";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
  hint?: string;
};

type NavGroup = {
  id: string;
  title: string;
  roles?: string[];
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "learner",
    title: "",
    roles: ["CANDIDATE", "TEAM_MEMBER"],
    items: [
      { href: "/learn", label: "Learn", icon: BookOpen, hint: "Lessons, today’s goals, arcade" },
      { href: "/challenges", label: "Practice", icon: Boxes, hint: "Problems & study plans" },
      { href: "/interview", label: "Mocks", icon: Timer, hint: "Timed company rounds" },
      { href: "/jobs", label: "Jobs", icon: Briefcase, hint: "Official career board links" },
      { href: "/candidates", label: "Profile", icon: UserRound, hint: "Your progress & public page" },
    ],
  },
  {
    id: "compete",
    title: "Compete",
    roles: ["CANDIDATE", "TEAM_MEMBER"],
    items: [
      { href: "/ai-vs-human", label: "AI vs Human", icon: Swords, hint: "Same challenges, both sides" },
      { href: "/leaderboards", label: "Leaderboards", icon: Trophy, hint: "Global rankings" },
      { href: "/tournaments", label: "Tournaments", icon: FlaskConical, hint: "Timed heats" },
    ],
  },
  {
    id: "team-member",
    title: "Your team",
    roles: ["TEAM_MEMBER"],
    items: [{ href: "/teams", label: "Team page", icon: Network, hint: "Shared work" }],
  },
  {
    id: "hiring",
    title: "Hiring",
    roles: ["SUPER_ADMIN", "HIRING_MANAGER", "TECHNICAL_REVIEWER"],
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard, hint: "Hiring overview" },
      {
        href: "/assessments",
        label: "Assessments",
        icon: Crosshair,
        hint: "Create & assign tests",
        roles: ["SUPER_ADMIN", "HIRING_MANAGER"],
      },
      { href: "/candidates", label: "Candidates", icon: Users, hint: "People & evidence" },
      { href: "/reviews", label: "Reviews", icon: ScrollText, hint: "Approve or reject" },
      { href: "/analytics", label: "Analytics", icon: BarChart3, hint: "Pipeline numbers" },
      { href: "/challenges", label: "Problem bank", icon: Boxes, hint: "Challenge catalog" },
      { href: "/teams", label: "Teams", icon: Network, hint: "Group assignments" },
      { href: "/admin", label: "Admin", icon: Shield, hint: "Platform controls", roles: ["SUPER_ADMIN"] },
    ],
  },
  {
    id: "staff-account",
    title: "Account",
    roles: ["SUPER_ADMIN", "HIRING_MANAGER", "TECHNICAL_REVIEWER"],
    items: [
      { href: "/pricing", label: "Billing", icon: Sparkles, hint: "Plan & payments" },
      { href: "/settings", label: "Settings", icon: Settings, hint: "Account & security" },
    ],
  },
];

function isGuestOpen(href: string) {
  return href === "/learn" || href.startsWith("/learn/") || href === "/challenges";
}

function visibleGroups(role: string, guest = false) {
  return NAV_GROUPS.map((group) => {
    if (group.roles && !group.roles.includes(role)) return null;
    // Guests only see surfaces they can open — no Compete/Jobs tease → login bounce.
    if (guest && (group.id === "compete" || group.id === "team-member")) return null;
    let items = group.items.filter((item) => !item.roles || item.roles.includes(role));
    if (guest) items = items.filter((item) => isGuestOpen(item.href));
    if (!items.length) return null;
    return { ...group, items };
  }).filter(Boolean) as NavGroup[];
}

function NavLinks({
  pathname,
  role,
  guest = false,
  onNavigate,
  onRequireSignIn,
}: {
  pathname: string;
  role: string;
  guest?: boolean;
  onNavigate?: () => void;
  onRequireSignIn?: () => void;
}) {
  const groups = useMemo(() => visibleGroups(role, guest), [role, guest]);

  const allHrefs = useMemo(() => groups.flatMap((g) => g.items.map((i) => i.href)), [groups]);

  return (
    <nav className="space-y-5 px-3 pb-6">
      {groups.map((group) => (
        <div key={group.id}>
          {group.title && (
            <div className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-600">
              {group.title}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const exact = pathname === item.href;
              const prefix = item.href !== "/" && pathname.startsWith(`${item.href}/`);
              const longerMatch = allHrefs.some(
                (href) =>
                  href !== item.href &&
                  href.length > item.href.length &&
                  (pathname === href || pathname.startsWith(`${href}/`)) &&
                  href.startsWith(`${item.href}/`),
              );
              const active = exact || (prefix && !longerMatch);
              const gated = guest && !isGuestOpen(item.href);
              return (
                <Link
                  key={`${group.id}-${item.href}-${item.label}`}
                  href={item.href}
                  onClick={(e) => {
                    if (gated) {
                      e.preventDefault();
                      onRequireSignIn?.();
                    }
                    onNavigate?.();
                  }}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-orange-500/10 text-orange-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block leading-tight">{item.label}</span>
                    {item.hint && (
                      <span
                        className={cn(
                          "block text-[11px] leading-tight",
                          active ? "text-orange-800/60" : "text-slate-600",
                        )}
                      >
                        {item.hint}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {guest && (
        <div className="mx-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-3 py-3">
          <p className="text-xs font-medium text-slate-800">Mocks, jobs &amp; compete</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Sign in to unlock timed mocks, career links, AI vs Human, and leaderboards.
          </p>
          <button
            type="button"
            onClick={() => onRequireSignIn?.()}
            className="mt-2 text-xs font-medium text-orange-700 hover:underline"
          >
            Sign in →
          </button>
        </div>
      )}
    </nav>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string; plan?: string } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const isGuest = !user;
  const isCandidate = Boolean(user && (user.role === "CANDIDATE" || user.role === "TEAM_MEMBER"));
  const isStaff = Boolean(
    user && ["SUPER_ADMIN", "HIRING_MANAGER", "TECHNICAL_REVIEWER"].includes(user.role),
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const brand = <CrucibleLockup href={isGuest || isCandidate ? "/learn" : "/dashboard"} size="md" />;

  const userBlock = isGuest ? (
    <div className="border-t border-slate-200/80 p-4">
      <div className="mb-3 min-w-0">
        <div className="truncate text-sm font-medium text-slate-900">Free guest</div>
        <div className="truncate font-mono text-xs text-slate-500">Progress isn’t saved yet</div>
      </div>
      <Button size="sm" className="w-full" onClick={() => setSignInOpen(true)}>
        Sign in
      </Button>
      <Link href="/register" className="mt-2 block text-center text-xs text-orange-700 hover:underline">
        Create free account →
      </Link>
    </div>
  ) : (
    <div className="border-t border-slate-200/80 p-4">
      <div className="mb-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium text-slate-900">{user!.name}</div>
          {user!.plan === "PREMIUM" && <Badge variant="amber">Premium</Badge>}
        </div>
        <div className="truncate font-mono text-xs text-slate-500">
          {isCandidate ? "Learner" : isStaff ? "Hiring team" : user!.role}
        </div>
      </div>
      {!isStaff && (
        <div className="mb-2 flex items-center justify-between text-xs">
          <Link href="/settings" className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
            <Settings className="h-3.5 w-3.5" /> Settings
          </Link>
          {user!.plan !== "PREMIUM" && (
            <Link href="/pricing" className="text-amber-800 hover:underline">
              Upgrade →
            </Link>
          )}
        </div>
      )}
      <Button variant="secondary" size="sm" className="w-full" onClick={logout}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );

  const mobileTabs = isStaff
    ? user!.role === "TECHNICAL_REVIEWER"
      ? ([
          { href: "/dashboard", label: "Home", icon: LayoutDashboard },
          { href: "/candidates", label: "People", icon: Users },
          { href: "/reviews", label: "Review", icon: ScrollText },
          { href: "/analytics", label: "Stats", icon: BarChart3 },
        ] as const)
      : ([
          { href: "/dashboard", label: "Home", icon: LayoutDashboard },
          { href: "/assessments", label: "Tests", icon: Crosshair },
          { href: "/reviews", label: "Review", icon: ScrollText },
          { href: "/candidates", label: "People", icon: Users },
        ] as const)
    : ([
        { href: "/learn", label: "Learn", icon: BookOpen },
        { href: "/challenges", label: "Practice", icon: Boxes },
        { href: "/interview", label: "Mocks", icon: Timer },
        { href: "/jobs", label: "Jobs", icon: Briefcase },
      ] as const);

  const inCodingSession = /^\/workspace\/[^/]+/.test(pathname);

  const navRole = isGuest ? "CANDIDATE" : user!.role;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/95 px-3 py-3 backdrop-blur sm:px-4 lg:hidden safe-top">
        <div className="min-w-0">{brand}</div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {inCodingSession ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="min-h-11 min-w-11"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          ) : null}
        </div>
      </header>

      <div
        className={cn("fixed inset-0 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn("absolute inset-0 bg-slate-900/25 transition-opacity", open ? "opacity-100" : "opacity-0")}
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(100%,20rem)] max-w-full flex-col border-r border-slate-200 bg-slate-50 shadow-xl transition-transform duration-200 ease-out safe-top safe-bottom",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            {brand}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button type="button" variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <NavLinks
              pathname={pathname}
              role={navRole}
              guest={isGuest}
              onNavigate={() => setOpen(false)}
              onRequireSignIn={() => setSignInOpen(true)}
            />
          </div>
          {userBlock}
        </aside>
      </div>

      <aside className="hidden border-r border-slate-200/80 bg-slate-50/90 backdrop-blur lg:flex lg:flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-5">
          {brand}
          <ThemeToggle className="shrink-0" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks pathname={pathname} role={navRole} guest={isGuest} onRequireSignIn={() => setSignInOpen(true)} />
        </div>
        {userBlock}
      </aside>

      <main className="relative min-h-[calc(100vh-3.75rem)] min-w-0 lg:min-h-screen">
        <div className="pointer-events-none absolute inset-0 grid-overlay opacity-40" />
        <div
          className={cn(
            "relative mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:pb-6",
            !inCodingSession && "mobile-bottom-pad",
          )}
        >
          {children}
        </div>
      </main>

      {!inCodingSession && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-[var(--surface)] lg:hidden safe-bottom"
          aria-label="Primary"
        >
          <div className="mx-auto grid h-14 max-w-lg grid-cols-5 gap-0.5 px-1">
            {mobileTabs.map((tab) => {
              const Icon = tab.icon;
              const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={(e) => {
                    if (isGuest && !isGuestOpen(tab.href)) {
                      e.preventDefault();
                      setSignInOpen(true);
                    }
                  }}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium",
                    active ? "bg-orange-500/10 text-orange-800" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium text-slate-500 hover:text-slate-800"
            >
              <Menu className="h-4 w-4" />
              More
            </button>
          </div>
        </nav>
      )}

      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} freeHref="/learn" />
    </div>
  );
}
