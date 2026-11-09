/**
 * Host-process / scratch-dir execution is intentionally disabled.
 * Candidate and model code must run only inside a disposable container
 * (EXECUTION_MODE=docker). A temp-dir child process shares the host kernel,
 * user, and reachable filesystem — that is not a sandbox.
 */
export async function runInIsolatedScratch(_params: {
  command: string;
  sourceRoot: string;
  timeoutSec: number;
}): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  throw new Error(
    "Host execution is disabled. Set EXECUTION_MODE=docker and provide a working Docker daemon.",
  );
}
