export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status = 400, code = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
