/**
 * Judge is online only when an operator explicitly attaches a Docker worker.
 * Vercel / Cursor Publish without a worker must stay offline (fail closed).
 */
export function isJudgeOnline() {
  return process.env.JUDGE_ONLINE === "true";
}

export function getJudgeStatus() {
  const online = isJudgeOnline();
  return {
    online,
    mode: "docker" as const,
    label: online ? "Judge online" : "Judge offline",
    detail: online
      ? "Docker worker attached — Run / Submit use the hidden harness."
      : "Docker worker not attached. Run and Submit are disabled until JUDGE_ONLINE=true and a worker is running.",
  };
}
