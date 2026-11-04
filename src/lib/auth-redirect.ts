import { NextResponse } from "next/server";

type AuthDestination =
  | "/"
  | "/forgot-password"
  | "/update-password"
  | "/sign-in?error=link"
  | "/sign-in?error=recovery-setup";

// A relative Location preserves the caller's origin even when the server's
// internal URL differs behind a proxy. No caller-supplied destination is used.
export function authRedirect(destination: AuthDestination) {
  return new NextResponse(null, {
    status: 307,
    headers: { Location: destination, "Cache-Control": "no-store" },
  });
}
