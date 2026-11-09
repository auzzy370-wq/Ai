import { spawn } from "child_process";
import path from "path";

/**
 * Parse a server-authored command into argv. Rejects shell metacharacters
 * and absolute paths outside the workspace.
 */
export function parseAllowlistedArgv(command: string): string[] {
  const trimmed = command.trim();
  if (!trimmed || trimmed.length > 500) {
    throw new Error("Command rejected: empty or too long");
  }
  if (/[;|&`$<>(){}\\\n\r]/.test(trimmed) || trimmed.includes("..")) {
    throw new Error("Command rejected: shell metacharacters are not allowed");
  }
  const argv = trimmed.split(/\s+/).filter(Boolean);
  if (argv.length === 0) throw new Error("Command rejected: empty argv");

  const bin = argv[0];
  const allowedBins = new Set([
    "node",
    "python3",
    "python",
    "go",
    "cargo",
    "rustc",
    "javac",
    "java",
  ]);
  if (!allowedBins.has(bin)) {
    throw new Error(`Command rejected: binary "${bin}" is not allowlisted`);
  }

  for (const arg of argv.slice(1)) {
    if (arg.startsWith("-")) {
      if (!/^--?[\w.=/-]+$/.test(arg)) {
        throw new Error(`Command rejected: flag "${arg}"`);
      }
      continue;
    }
    // Relative workspace paths only (tests/..., src/..., Cargo.toml, etc.)
    if (path.isAbsolute(arg) || arg.includes("..") || !/^[\w./@+-]+$/.test(arg)) {
      throw new Error(`Command rejected: path "${arg}"`);
    }
  }
  return argv;
}

export function execAllowlisted(
  command: string,
  cwd: string,
  env: Record<string, string | undefined>,
  timeoutSec: number,
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  const argv = parseAllowlistedArgv(command);
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      env: env as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutSec * 1000);
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: stderr || err.message, exitCode: 1, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1, timedOut });
    });
  });
}
