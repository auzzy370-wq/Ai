"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignInModal } from "@/components/auth/sign-in-modal";

const KEY = "crucible_guest_activity";

/** After a guest finishes a lesson or arcade clear, nudge account creation. */
export function SaveProgressCta({ guest }: { guest: boolean }) {
  const [show, setShow] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    if (!guest) return;
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw === "1") setShow(true);
    } catch {
      /* ignore */
    }
    const onActivity = () => {
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
      setShow(true);
    };
    window.addEventListener("crucible:guest-progress", onActivity);
    return () => window.removeEventListener("crucible:guest-progress", onActivity);
  }, [guest]);

  if (!guest || !show) return null;

  return (
    <>
      <section className="rounded-2xl border border-[var(--brand)]/40 bg-[var(--brand-soft)] px-4 py-4 sm:px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--brand)]">Save your progress</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Nice start — create a free account</h2>
        <p className="mt-1 text-sm text-slate-600">
          Guest mode doesn’t keep XP or streaks. Sign in to save lessons, problem attempts, and your qualification
          profile.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/register">
            <Button>Create free account</Button>
          </Link>
          <Button variant="secondary" onClick={() => setSignInOpen(true)}>
            Sign in
          </Button>
        </div>
      </section>
      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} freeHref="/learn" />
    </>
  );
}

export function markGuestProgress() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("crucible:guest-progress"));
  }
}
