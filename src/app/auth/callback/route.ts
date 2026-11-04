import type { NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { authRedirect } from "@/lib/auth-redirect";
export async function GET(request: NextRequest) {
  const client = await serverClient();
  const code = request.nextUrl.searchParams.get("code");
  const next =
    request.nextUrl.searchParams.get("next") === "/update-password"
      ? "/update-password"
      : "/";
  if (client && code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      return authRedirect(
        next === "/update-password" ? "/forgot-password" : next,
      );
    }
  }
  return authRedirect("/sign-in?error=link");
}
