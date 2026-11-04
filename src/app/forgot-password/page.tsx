import { AuthForm } from "@/features/auth/auth-form";
import { publicConfig } from "@/lib/supabase/config";
export default function Forgot() {
  return <AuthForm mode="forgot-password" enabled={!!publicConfig()} />;
}
