/**
 * Candidate / model code runs only in disposable containers.
 * Host-process and scratch-dir modes are refused (not a sandbox).
 */
export function resolveExecutionMode(): "docker" {
  const raw = (process.env.EXECUTION_MODE ?? "docker").trim().toLowerCase();
  if (raw === "docker") return "docker";
  throw new Error(
    `Unsafe EXECUTION_MODE="${raw || "unset"}" refused. Only EXECUTION_MODE=docker is allowed.`,
  );
}
