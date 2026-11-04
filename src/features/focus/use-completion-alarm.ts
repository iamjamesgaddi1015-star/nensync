"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Timer } from "@/lib/domain";
import { CompletionAlarm, INITIAL_ALARM_STATE } from "./completion-alarm";

export function useCompletionAlarm(
  scope: string,
  timer: Timer,
  serverNow: number,
) {
  const alarm = useMemo(() => new CompletionAlarm(scope), [scope]);
  const state = useSyncExternalStore(
    alarm.subscribe,
    alarm.getSnapshot,
    () => INITIAL_ALARM_STATE,
  );
  useEffect(() => alarm.connect(), [alarm]);
  useEffect(() => {
    alarm.observe(timer, serverNow);
  }, [alarm, timer, serverNow]);
  return { alarm, state };
}
