"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CrucibleLockup, CrucibleWordmark } from "@/components/brand/crucible-lockup";

export function LandingPage(props: {
  verifiedSkills?: number;
  timedSessions?: number;
  publicProfiles?: number;
  sampleProfileSlug?: string;
}) {
  const skills = props.verifiedSkills ?? 0;
  const timed = props.timedSessions ?? 60;
  const profiles = props.publicProfiles ?? 0;
  const sampleSlug = props.sampleProfileSlug ?? "casey-elite";

  return (
    <div className="landing-root relative min-h-screen overflow-x-clip">
      <section className="landing-hero-plane relative isolate flex flex-col sm:min-h-[100svh]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="landing-hero-glow absolute inset-0" />
          <div className="landing-noise absolute inset-0" />
        </div>

        <header className="relative z-20 mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-3 safe-top sm:px-8 sm:py-5 lg:px-10">
          <CrucibleLockup href="/" size="sm" wordmarkFrom="sm" />
          <div className="relative z-20 flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden min-h-10 items-center px-2 text-sm text-slate-500 transition hover:text-slate-900 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-10 items-center rounded-md bg-[var(--brand)] px-3 text-sm font-medium text-white transition hover:bg-[var(--brand-hover)] sm:px-3.5"
            >
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Start learning</span>
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-4 pb-10 pt-6 sm:px-8 sm:pb-20 lg:px-10">
          <div className="max-w-xl lg:max-w-2xl">
            <p className="landing-anim-brand leading-[0.9]">
              <CrucibleWordmark className="text-[clamp(2.75rem,12vw,7.5rem)] font-semibold" />
            </p>
            <h1 className="landing-anim-copy mt-2.5 text-[1.05rem] font-medium leading-snug text-[#334155] dark:text-white/90 sm:mt-5 sm:text-[1.35rem]">
              Learn the craft. Hire the proof.
            </h1>
            <p className="landing-anim-copy mt-2 text-[14px] leading-relaxed text-[#5b7390] dark:text-white/55 sm:mt-3 sm:text-[15px]">
              Short lessons, a curated problem bank, and timed assessments with public + hidden tests — then a
              qualification profile you can share.
            </p>
            <div className="landing-anim-cta mt-5 flex w-full flex-col gap-2 sm:mt-9 sm:flex-row sm:items-center sm:gap-3">
              <Link
                href="/register"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[var(--brand)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)] sm:min-h-12 sm:w-auto"
              >
                Start learning free
              </Link>
              <Link
                href="/learn"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-slate-300 bg-white/70 px-5 text-sm text-slate-800 transition hover:border-slate-400 hover:bg-white dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:border-white/35 dark:hover:bg-white/10 sm:min-h-12 sm:w-auto"
              >
                Browse as guest
              </Link>
            </div>
            <p className="landing-anim-copy mt-4 text-[11px] leading-relaxed text-slate-500 dark:text-white/40">
              Demo seed data may appear on fresh installs. Hidden judging needs a Docker worker (
              <code className="font-mono">JUDGE_ONLINE=true</code>).{" "}
              <Link href="/login?intent=hire" className="underline-offset-2 hover:underline">
                Hiring teams
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section id="paths" className="relative z-10 border-t border-slate-200 bg-[var(--background)]">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-24">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--brand)]">For learners</p>
            <h2 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-slate-900 sm:text-[2rem]">
              Get interview-ready
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-500">
              Interview Craft + AI Craft lessons, a hand-authored problem bank, and timed mocks. Pass public examples,
              then the hidden harness when the judge is online.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-[var(--brand)] transition hover:text-[var(--brand-hover)]"
            >
              Create a learner account →
            </Link>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--brand)]">For employers</p>
            <h2 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-slate-900 sm:text-[2rem]">
              Assign · review · scorecard
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-500">
              Create an assessment, assign a candidate, review evidence, export a scorecard. Hiring surfaces stay lean
              until that loop is solid.
            </p>
            <Link
              href="/login?intent=hire"
              className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Sign in as hiring team →
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-slate-200 bg-[var(--background)]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-12 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:py-14">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">What you get</p>
            <p className="mt-3 max-w-xl text-xl font-semibold leading-snug tracking-[-0.03em] text-slate-900 sm:text-[1.75rem]">
              {timed}-minute assessments · curated problems · human review
            </p>
            <p className="mt-2 font-mono text-[11px] text-slate-500">
              {profiles > 0
                ? `${profiles} sample public profile${profiles === 1 ? "" : "s"} · ${skills} verified skill marker${skills === 1 ? "" : "s"} in seed`
                : "Fresh installs start empty until you seed or register"}
            </p>
          </div>
          <Link
            href={`/u/${sampleSlug}`}
            className="text-sm font-medium text-[var(--brand)] transition hover:text-[var(--brand-hover)]"
          >
            Open a sample qualification profile →
          </Link>
        </div>
      </section>
    </div>
  );
}
