/** Floating +XP burst used after clears. */
export function XpBurst({
  amount,
  label = "XP",
  active,
}: {
  amount: number;
  label?: string;
  active: boolean;
}) {
  if (!active || amount <= 0) return null;
  return (
    <div className="xp-burst pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center" aria-live="polite">
      <span className="rounded-md bg-[var(--brand)] px-3 py-1.5 font-mono text-sm font-semibold text-white shadow-lg shadow-orange-500/25">
        +{amount} {label}
      </span>
    </div>
  );
}
