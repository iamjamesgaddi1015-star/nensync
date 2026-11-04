import { AuthForm } from "@/features/auth/auth-form";
import { publicConfig } from "@/lib/supabase/config";
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const p = await searchParams;
  const notice =
    p.error === "recovery-setup"
      ? "Password recovery is not connected yet. Contact the workspace owner."
      : p.notice === "deleted"
        ? "Your account deletion was confirmed."
        : p.error === "link"
          ? "This link expired or could not be verified. Request a new link below."
          : "";
  return <AuthForm mode="sign-in" enabled={!!publicConfig()} notice={notice} />;
}
