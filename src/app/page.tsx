import { redirect } from "next/navigation";
import { publicConfig } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { Workspace } from "@/features/workspace/workspace";
export default async function Home() {
  if (!publicConfig()) redirect("/demo");
  const client = await serverClient();
  const { data } = await client!.auth.getUser();
  if (!data.user) redirect("/sign-in");
  return (
    <Workspace
      userId={data.user.id}
      demo={false}
      deletionEnabled={!!process.env.SUPABASE_SERVICE_ROLE_KEY}
    />
  );
}
