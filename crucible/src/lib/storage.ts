import fs from "fs/promises";
import path from "path";
import os from "os";

/** Writable root for résumés/workspaces. On Vercel the filesystem is ephemeral — use /tmp. */
export function getStorageRoot() {
  if (process.env.STORAGE_ROOT) return process.env.STORAGE_ROOT;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "crucible-storage");
  }
  return path.join(process.cwd(), "storage");
}

export async function ensureStorageDirs() {
  const root = getStorageRoot();
  await fs.mkdir(path.join(root, "resumes"), { recursive: true });
  await fs.mkdir(path.join(root, "workspaces"), { recursive: true });
  await fs.mkdir(path.join(root, "artifacts"), { recursive: true });
  return root;
}
