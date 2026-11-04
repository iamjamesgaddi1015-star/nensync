"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { publicConfig, timedFetch } from "./config";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;
export function browserClient() {
  const config = publicConfig();
  if (!config)
    throw new Error(
      "Account services are not connected yet. You can explore the interactive demo.",
    );
  client ??= createBrowserClient<Database>(config.url, config.key, {
    global: { fetch: timedFetch },
  });
  return client;
}
