"use client";
import { browserClient } from "./browser";
import { createClient } from "@supabase/supabase-js";
import { publicConfig, timedFetch } from "./config";
import type { Database } from "./database.types";
import {
  parseSnapshot,
  parseStandup,
  record,
  type SaveResult,
} from "../domain";
import type { WorkspaceRepository } from "../repository";

export function supabaseRepository(userId: string): WorkspaceRepository {
  const authClient = browserClient();
  let valid = true;
  const assertCurrent = () => {
    if (!valid)
      throw new Error(
        "Your account changed. Sign in again before continuing; your previous draft is protected.",
      );
  };
  const scopedClient = async () => {
    assertCurrent();
    const verified = await authClient.auth.getUser();
    const local = await authClient.auth.getSession();
    const session = local.data.session;
    if (
      verified.error ||
      local.error ||
      verified.data.user?.id !== userId ||
      session?.user.id !== userId
    ) {
      valid = false;
      window.dispatchEvent(new Event("nensync-signed-out"));
      assertCurrent();
    }
    const config = publicConfig()!;
    const token = session!.access_token;
    return createClient<Database>(config.url, config.key, {
      accessToken: async () => token,
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: timedFetch },
    });
  };
  const checkedSnapshot = (data: unknown) => {
    assertCurrent();
    const s = parseSnapshot(data);
    if (
      s.profile.id !== userId ||
      s.timer.user_id !== userId ||
      s.tasks.some((t) => t.user_id !== userId) ||
      (s.standup && s.standup.user_id !== userId)
    )
      throw new Error(
        "This workspace response belongs to a different account. Sign in again.",
      );
    return s;
  };
  const checkedStandup = (data: unknown) => {
    assertCurrent();
    const s = parseStandup(data);
    if (s.user_id !== userId)
      throw new Error(
        "This draft belongs to a different account. Sign in again.",
      );
    return s;
  };
  const fail = (error: { message: string; code?: string } | null) => {
    if (!error) return;
    if (error.code === "PGRST301" || error.code === "28000")
      throw new Error(
        "Your session expired. Sign in again to continue; your draft is protected on this device.",
      );
    if (error.code === "42501")
      throw new Error(
        "This action is not available for your account. Sign in again or try refreshing.",
      );
    throw new Error(error.message);
  };
  const snapshot = async () => {
    const client = await scopedClient();
    const { data, error } = await client.rpc("workspace_snapshot");
    fail(error);
    return checkedSnapshot(data);
  };
  return {
    demo: false,
    load: snapshot,
    saveStandup: async (day, version, text): Promise<SaveResult> => {
      const client = await scopedClient();
      const { data, error } = await client.rpc("save_standup", {
        p_day: day,
        p_version: version,
        p_yesterday: text.yesterday_text,
        p_today: text.today_text,
        p_blockers: text.blockers_text,
      });
      fail(error);
      assertCurrent();
      const result = record(data);
      if (result.error === "CONFLICT")
        return {
          error: "CONFLICT",
          standup:
            result.standup === null ? null : checkedStandup(result.standup),
        };
      if (result.error === "DAY_CHANGED")
        return {
          error: "DAY_CHANGED",
          message:
            "Your workday changed. Your previous draft is protected on this device.",
        };
      return { standup: checkedStandup(result.standup) };
    },
    task: async (action, id, version, title = "", tag = "Unassigned") => {
      const client = await scopedClient();
      const { data, error } = await client.rpc("mutate_task", {
        p_action: action,
        p_id: id,
        p_version: version,
        p_title: title,
        p_tag: tag,
      });
      fail(error);
      return checkedSnapshot(data);
    },
    timer: async (
      action,
      version,
      intervalId,
      seconds = 3000,
      taskId = null,
    ) => {
      const client = await scopedClient();
      const { data, error } = await client.rpc("control_timer", {
        p_action: action,
        p_version: version,
        p_interval_id: intervalId,
        p_seconds: seconds,
        p_task_id: taskId,
      });
      fail(error);
      return checkedSnapshot(data);
    },
    profile: async (name, timezone, version) => {
      const client = await scopedClient();
      const { data, error } = await client.rpc("update_profile", {
        p_name: name,
        p_timezone: timezone,
        p_version: version,
      });
      fail(error);
      return checkedSnapshot(data);
    },
    export: async () => {
      const client = await scopedClient();
      const tables = [
        "profiles",
        "standups",
        "tasks",
        "task_completions",
        "timer_states",
        "focus_sessions",
      ] as const;
      const columns = {
        profiles:
          "id,full_name,avatar_url,timezone,onboarded,version,updated_at",
        standups:
          "id,user_id,work_date,timezone_at_creation,yesterday_text,today_text,blockers_text,version,created_at,updated_at",
        tasks:
          "id,user_id,title,tag,is_completed,completed_at,active_slot,version,created_at,updated_at",
        task_completions:
          "id,user_id,task_id,task_key,task_version,title_snapshot,tag_snapshot,completed_at,work_date,timezone_at_completion",
        timer_states:
          "user_id,interval_id,state,kind,duration_seconds,remaining_seconds,ends_at,task_id,task_title,tag_snapshot,timezone_at_start,version,updated_at",
        focus_sessions:
          "id,user_id,kind,duration_minutes,completed_at,recorded_at,work_date,timezone_at_completion,task_id,task_title,tag_snapshot",
      };
      const out: Record<string, unknown[]> = {};
      for (const table of tables) {
        const rows: unknown[] = [];
        for (let page = 0; page < 100; page++) {
          assertCurrent();
          const { data, error } = await client
            .from(table)
            .select(columns[table])
            .filter(table === "profiles" ? "id" : "user_id", "eq", userId)
            .order(table === "timer_states" ? "user_id" : "id")
            .range(page * 500, page * 500 + 499);
          fail(error);
          rows.push(...(data ?? []));
          if (!data || data.length < 500) break;
          if (page === 99)
            throw new Error(
              "This export exceeds the safe download size. Contact the workspace owner for a complete export.",
            );
        }
        out[table] = rows;
      }
      assertCurrent();
      return { exported_at: new Date().toISOString(), data: out };
    },
    subscribe: (callback) => {
      const channel = authClient.channel(`workspace:${userId}`);
      for (const table of ["profiles", "standups", "tasks", "timer_states"])
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `${table === "profiles" ? "id" : "user_id"}=eq.${userId}`,
          },
          callback,
        );
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") callback();
      });
      const {
        data: { subscription },
      } = authClient.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT" || (session && session.user.id !== userId)) {
          valid = false;
          window.dispatchEvent(new Event("nensync-signed-out"));
        }
      });
      return () => {
        void authClient.removeChannel(channel);
        subscription.unsubscribe();
      };
    },
  };
}
