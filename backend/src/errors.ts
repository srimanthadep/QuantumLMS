/**
 * Errors the API returns on purpose. The message is written for the person using the app and is sent as is;
 * anything else becomes a generic 500 and is logged.
 */
export class AppError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "AppError"
    this.status = status
    this.code = code
  }
}

export const badRequest = (message: string, code = "invalid") => new AppError(400, code, message)
export const unauthorized = (message = "Sign in to continue.") => new AppError(401, "unauthorized", message)
export const forbidden = (message = "You don't have permission to do that.") => new AppError(403, "forbidden", message)
export const notFound = (message = "Not found.") => new AppError(404, "not_found", message)
export const conflict = (message: string, code = "conflict") => new AppError(409, code, message)

/** Postgres error codes that map to a user-facing message. */
export function fromPgError(err: unknown): AppError | null {
  const e = err as { code?: string; cause?: { code?: string } }
  const code = e?.code ?? e?.cause?.code
  if (code === "23505") return conflict("That already exists.", "duplicate")
  if (code === "23503") return badRequest("That item doesn't exist any more.", "missing_reference")
  if (code === "23514" || code === "22P02" || code === "22001") return badRequest("Some of the details aren't valid.")
  return null
}
