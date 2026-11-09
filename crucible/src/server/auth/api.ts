import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: err.flatten() } },
      { status: 400 },
    );
  }
  if (isAppError(err)) {
    return NextResponse.json(
      { ok: false, error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }
  logger.error("Unhandled API error", { err: err instanceof Error ? err.message : String(err) });
  return NextResponse.json(
    { ok: false, error: { code: "INTERNAL", message: "Internal server error" } },
    { status: 500 },
  );
}

export async function withHandler(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (err) {
    return jsonError(err);
  }
}
