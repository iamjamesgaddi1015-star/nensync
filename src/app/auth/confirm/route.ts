import type { NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE, recoveryContext } from "@/lib/supabase/recovery";
import { authRedirect } from "@/lib/auth-redirect";
export async function GET(request: NextRequest) {
  const client = await serverClient();
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (
    client &&
    token_hash &&
    (type === "signup" || type === "recovery" || type === "email")
  ) {
    const { data, error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error) {
      const context =
        type === "recovery" && data.user ? recoveryContext(data.user.id) : null;
      if (type === "recovery" && !context)
        return authRedirect("/sign-in?error=recovery-setup");
      const response = authRedirect(
        type === "recovery" ? "/update-password" : "/",
      );
      if (context)
        response.cookies.set(RECOVERY_COOKIE, context, {
          httpOnly: true,
          secure: request.nextUrl.protocol === "https:",
          sameSite: "strict",
          path: "/",
          maxAge: 600,
        });
      return response;
    }
  }
  return authRedirect("/sign-in?error=link");
}
