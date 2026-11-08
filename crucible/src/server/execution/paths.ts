import path from "path";

/**
 * Resolve a workspace-relative path under root. Rejects absolute paths,
 * null bytes, and any normalization that escapes the workspace root.
 */
export function resolveInsideRoot(root: string, relativePath: string): string {
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error("Invalid path");
  }
  if (relativePath.includes("\0")) {
    throw new Error("Invalid path");
  }
  if (path.isAbsolute(relativePath)) {
    throw new Error("Absolute paths are not allowed");
  }
  // Disallow Windows drive / UNC style even on Linux hosts
  if (/^[a-zA-Z]:[\\/]/.test(relativePath) || relativePath.startsWith("\\\\")) {
    throw new Error("Absolute paths are not allowed");
  }

  const normalized = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (normalized === ".." || normalized.startsWith("../") || normalized.startsWith("/")) {
    throw new Error("Path escapes workspace");
  }

  const rootResolved = path.resolve(root);
  const full = path.resolve(rootResolved, normalized);
  const prefix = rootResolved.endsWith(path.sep) ? rootResolved : rootResolved + path.sep;
  if (full !== rootResolved && !full.startsWith(prefix)) {
    throw new Error("Path escapes workspace");
  }
  return full;
}

/** Validate a relative workspace path for DB storage (no resolve). */
export function assertSafeRelativePath(relativePath: string): string {
  resolveInsideRoot("/var/crucible-path-check", relativePath);
  return path.posix.normalize(relativePath.replace(/\\/g, "/")).replace(/^\.\//, "");
}
