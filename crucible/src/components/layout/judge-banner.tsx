import { getJudgeStatus } from "@/server/execution/judge-status";

/** Server-rendered status chip — fail-closed messaging when Docker worker is absent. */
export function JudgeBanner({ className }: { className?: string }) {
  const judge = getJudgeStatus();
  if (judge.online) return null;
  return (
    <p
      className={
        className ??
        "rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
      }
    >
      <span className="font-semibold">Judge offline.</span> Run and Submit stay disabled until a Docker worker is
      attached (<code className="font-mono">JUDGE_ONLINE=true</code>). You can still learn lessons and open workspaces.
    </p>
  );
}
