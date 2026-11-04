import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { serverClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE, verifiedRecovery } from "@/lib/supabase/recovery";
import { boundedJson } from "@/lib/bounded-body";
export async function POST(request: NextRequest) {
  const reply = (message: string, status: number) =>
    NextResponse.json(
      { message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return reply("This request could not be verified.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply("Use a supported request format.", 415);
  const client = await serverClient();
  if (!client) return reply("Account services are not connected.", 503);
  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    const jar = await cookies();
    if (
      error ||
      !user ||
      !verifiedRecovery(jar.get(RECOVERY_COOKIE)?.value, user.id)
    )
      return reply(
        "This recovery session expired. Request a new password reset link.",
        401,
      );
    const body = await boundedJson(request);
    if (
      !body ||
      typeof body !== "object" ||
      !("password" in body) ||
      typeof body.password !== "string" ||
      body.password.length < 12 ||
      body.password.length > 256
    )
      return reply("Use a password between 12 and 256 characters.", 400);
    const update = await client.auth.updateUser({ password: body.password });
    if (update.error)
      return reply(
        "The password could not be changed. Request a new link or choose another password.",
        400,
      );
    jar.delete(RECOVERY_COOKIE);
    await client.auth.signOut();
    return reply(
      "Your password is updated. Sign in with your new password.",
      200,
    );
  } catch {
    return reply(
      "The recovery request could not be completed. Request a fresh link or try again.",
      400,
    );
  }
}
