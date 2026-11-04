import { AuthForm } from "@/features/auth/auth-form";
import { publicConfig } from "@/lib/supabase/config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE, verifiedRecovery } from "@/lib/supabase/recovery";
export default async function UpdatePassword() {
  const client = await serverClient();
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (
      !user ||
      !verifiedRecovery((await cookies()).get(RECOVERY_COOKIE)?.value, user.id)
    )
      redirect("/forgot-password");
  }
  return <AuthForm mode="update-password" enabled={!!publicConfig()} />;
}
