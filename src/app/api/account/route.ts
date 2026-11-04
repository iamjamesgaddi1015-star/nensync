import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { publicConfig, timedFetch } from "@/lib/supabase/config";
import { boundedJson } from "@/lib/bounded-body";

export async function DELETE(request: NextRequest) {
  const reply = (message: string, status: number) =>
    NextResponse.json(
      { message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return reply("This request could not be verified.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply("Use a supported request format.", 415);
  const config = publicConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !serviceKey)
    return reply(
      "Account deletion is not connected yet. Contact the workspace owner.",
      503,
    );
  try {
    const client = await serverClient();
    const {
      data: { user },
      error,
    } = await client!.auth.getUser();
    if (error || !user?.email)
      return reply("Sign in again before deleting your account.", 401);
    const body = await boundedJson(request);
    if (
      !body ||
      typeof body !== "object" ||
      !("password" in body) ||
      typeof body.password !== "string" ||
      !body.password ||
      body.password.length > 256
    )
      return reply("Verify your current password.", 400);
    const verifier = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: timedFetch },
    });
    const confirmation = await verifier.auth.signInWithPassword({
      email: user.email,
      password: body.password,
    });
    if (confirmation.error || confirmation.data.user?.id !== user.id)
      return reply(
        "Your current password could not be verified. Try again.",
        403,
      );
    const admin = createClient(config.url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: timedFetch },
    });
    const deletion = await admin.auth.admin.deleteUser(user.id);
    await verifier.auth.signOut();
    if (deletion.error)
      return reply(
        "Deletion could not be confirmed. Contact the workspace owner.",
        502,
      );
    await client!.auth.signOut();
    return reply("Your account deletion was confirmed.", 200);
  } catch {
    return reply("The request could not be completed. Try again later.", 400);
  }
}
