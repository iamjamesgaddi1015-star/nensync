"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { demoRepository } from "@/lib/demo-repository";
import { supabaseRepository } from "@/lib/supabase/repository";
import { message, type Snapshot } from "@/lib/domain";

export function useWorkspace(demo: boolean, userId: string) {
  const repo = useMemo(
    () => (demo ? demoRepository : supabaseRepository(userId)),
    [demo, userId],
  );
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const request = useRef(0);
  const active = useRef(true);
  const running = useRef(false);
  const needsRefresh = useRef(false);
  const sessionValid = useRef(true);
  const refresh = useCallback(async () => {
    if (!sessionValid.current) return;
    if (running.current) {
      needsRefresh.current = true;
      return;
    }
    const id = ++request.current;
    try {
      const s = await repo.load();
      if (active.current && id === request.current) {
        setSnapshot(s);
        setError("");
      }
    } catch (e) {
      if (active.current && id === request.current) setError(message(e));
    }
  }, [repo]);
  useEffect(() => {
    active.current = true;
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void refresh();
    };
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const unsubscribe = repo.subscribe(() => {
      if (!running.current) void refresh();
    });
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    document.addEventListener("visibilitychange", visible);
    const clock = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !running.current &&
        navigator.onLine
      )
        void refresh();
    }, 60000);
    const signedOut = () => {
      sessionValid.current = false;
      request.current++;
      setSnapshot(null);
      setError(
        "Your session ended. Sign in again to continue; device drafts remain protected.",
      );
    };
    window.addEventListener("nensync-signed-out", signedOut);
    const tick = window.setTimeout(() => {
      setOnline(navigator.onLine);
      void refresh();
    }, 0);
    return () => {
      active.current = false;
      unsubscribe();
      clearInterval(clock);
      clearTimeout(tick);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("nensync-signed-out", signedOut);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [repo, refresh]);
  const run = useCallback(
    async (operation: () => Promise<Snapshot>) => {
      if (!sessionValid.current) {
        setError("Your session ended. Sign in again to continue.");
        return false;
      }
      if (running.current) return false;
      if (!navigator.onLine) {
        setError(
          "You’re offline. Reconnect before changing tasks or your timer.",
        );
        return false;
      }
      running.current = true;
      setBusy(true);
      setError("");
      const id = ++request.current;
      try {
        const next = await operation();
        if (active.current && id === request.current) setSnapshot(next);
        return true;
      } catch (e) {
        if (active.current) setError(message(e));
        return false;
      } finally {
        running.current = false;
        if (active.current) setBusy(false);
        if (needsRefresh.current && active.current) {
          needsRefresh.current = false;
          void refresh();
        }
      }
    },
    [refresh],
  );
  return { repo, snapshot, error, busy, online, refresh, run };
}
