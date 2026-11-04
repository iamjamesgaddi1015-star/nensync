import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { publicConfig, timedFetch } from "./config";

export async function serverClient() {
  const config = publicConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    global: { fetch: timedFetch },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          for (const { name, value, options } of values)
            jar.set(name, value, options);
        } catch {
          /* Proxy refreshes cookies when rendering cannot write them. */
        }
      },
    },
  });
}
