import { AuthForm } from "@/features/auth/auth-form";
import { publicConfig } from "@/lib/supabase/config";
export default function SignUp() {
  return <AuthForm mode="sign-up" enabled={!!publicConfig()} />;
}
