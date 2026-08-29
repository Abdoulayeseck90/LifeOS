// Thrown by service-layer functions for an intentional, already-safe-
// to-display domain error ("Bill is already paid", "Subscription not
// found") — never wraps a raw Supabase/Postgres error, which always
// stays a plain Error/PostgrestError and must never reach the client
// verbatim (a constraint-violation message, a schema-cache message,
// etc. is not something an end user should ever see — see the API
// route pattern: `err instanceof UserFacingError ? err.message :
// "<generic message>"`, never a bare `err.message` fallback).
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}
