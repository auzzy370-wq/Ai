import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Official flame + vessel mark — flat dark glyph by default; light twin when html.light. */
export function CrucibleGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("relative block", className)}>
      <Image
        src="/brand/crucible-mark-dark.png"
        alt=""
        width={128}
        height={128}
        priority
        className="h-full w-full object-contain [:where(html.light)_&]:hidden"
      />
      <Image
        src="/brand/crucible-mark-light.png"
        alt=""
        width={128}
        height={128}
        className="hidden h-full w-full object-contain [:where(html.light)_&]:block"
      />
    </span>
  );
}

/** Wordmark matches the logo: geometric sans + purple tittle on the i. */
export function CrucibleWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative inline-block font-semibold tracking-[-0.045em] text-[var(--brand-ink)]", className)}
      aria-label="Crucible"
    >
      Cruc
      <span className="relative inline-block" aria-hidden>
        ı
        <span className="pointer-events-none absolute left-1/2 top-[0.06em] h-[0.2em] w-[0.2em] -translate-x-1/2 rounded-full bg-[var(--brand-flame,#8b5cf6)]" />
      </span>
      ble
    </span>
  );
}

type LockupProps = {
  href?: string | null;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  /** Hide the wordmark below this breakpoint (mark stays). */
  wordmarkFrom?: "sm" | "md" | "always";
  className?: string;
  markClassName?: string;
};

const sizes = {
  sm: {
    mark: "h-8 w-8",
    title: "text-[1.05rem]",
    tag: "text-[9px] tracking-[0.16em]",
    gap: "gap-2",
  },
  md: {
    mark: "h-10 w-10",
    title: "text-[1.45rem]",
    tag: "text-[10px] tracking-[0.18em]",
    gap: "gap-2.5",
  },
  lg: {
    mark: "h-12 w-12",
    title: "text-[1.85rem]",
    tag: "text-[11px] tracking-[0.2em]",
    gap: "gap-3",
  },
};

export function CrucibleLockup({
  href = "/dashboard",
  size = "md",
  showTagline = false,
  wordmarkFrom = "always",
  className,
  markClassName,
}: LockupProps) {
  const s = sizes[size];
  const wordmarkVisibility =
    wordmarkFrom === "sm" ? "hidden sm:block" : wordmarkFrom === "md" ? "hidden md:block" : "block";
  const inner = (
    <div className={cn("flex items-center", s.gap, className)}>
      <CrucibleGlyph className={cn("shrink-0", s.mark, markClassName)} />
      <div className={cn("min-w-0 leading-none", wordmarkVisibility)}>
        <CrucibleWordmark className={s.title} />
        {showTagline && (
          <div className={cn("mt-1.5 font-mono text-slate-500", s.tag)}>PROVE THE CRAFT</div>
        )}
      </div>
    </div>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40">
      {inner}
    </Link>
  );
}
