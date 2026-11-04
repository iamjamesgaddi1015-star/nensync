"use client";
import type { WorkspaceRepository } from "./repository";
import {
  parseSnapshot,
  workDate,
  type Snapshot,
  type Task,
  type Standup,
  type CompletedTask,
  type SaveResult,
  type TimerAction,
  type TaskAction,
} from "./domain";

const KEY = "nensync.demo.v1";
const ID = "11111111-1111-4111-8111-111111111111";
type Event = CompletedTask & { day: string };
type Session = {
  id: string;
  day: string;
  minutes: number;
  tag: string;
  kind: string;
};
type Data = {
  snapshot: Snapshot;
  standups: Record<string, Standup>;
  events: Event[];
  sessions: Session[];
};

function seed(): Data {
  const now = new Date().toISOString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const day = workDate(new Date(), timezone);
  const tasks: Task[] = [
    "Ship account settings",
    "Test password recovery",
    "Prepare tomorrow’s handoff",
  ].map((title, i) => ({
    id: `33333333-3333-4333-8333-33333333333${i}`,
    user_id: ID,
    title,
    tag: i === 1 ? "Internal Admin" : "Client Work",
    is_completed: false,
    completed_at: null,
    active_slot: i + 1,
    version: 1,
    created_at: now,
    updated_at: now,
  }));
  const standup: Standup = {
    id: crypto.randomUUID(),
    user_id: ID,
    work_date: day,
    timezone_at_creation: timezone,
    ...{
      yesterday_text: "Finished onboarding and reviewed feedback.",
      today_text: "Ship account settings and test recovery.",
      blockers_text: "Waiting for final copy approval.",
    },
    version: 1,
    created_at: now,
    updated_at: now,
  };
  return {
    snapshot: {
      profile: {
        id: ID,
        full_name: "Alex",
        avatar_url: null,
        timezone,
        onboarded: true,
        version: 1,
        updated_at: now,
      },
      day,
      server_now: now,
      standup,
      tasks,
      timer: {
        user_id: ID,
        interval_id: null,
        state: "idle",
        kind: "focus",
        duration_seconds: 3000,
        remaining_seconds: 3000,
        ends_at: null,
        task_id: null,
        task_title: null,
        tag_snapshot: "Unassigned",
        timezone_at_start: timezone,
        version: 1,
        updated_at: now,
      },
      summary: {
        focus_minutes: 0,
        intervals: 0,
        completed_tasks: [],
        tags: [],
      },
    },
    standups: { [day]: standup },
    events: ["Reviewed onboarding feedback", "Finalized validation states"].map(
      (title) => ({
        task_key: crypto.randomUUID(),
        title_snapshot: title,
        tag_snapshot: "Client Work",
        completed_at: now,
        day,
      }),
    ),
    sessions: [
      {
        id: crypto.randomUUID(),
        day,
        minutes: 50,
        tag: "Client Work",
        kind: "focus",
      },
      {
        id: crypto.randomUUID(),
        day,
        minutes: 25,
        tag: "Client Work",
        kind: "focus",
      },
      {
        id: crypto.randomUUID(),
        day,
        minutes: 25,
        tag: "Internal Admin",
        kind: "focus",
      },
    ],
  };
}

function summarize(data: Data) {
  const s = data.snapshot;
  const now = new Date();
  const t = s.timer;
  if (
    t.state === "running" &&
    t.ends_at &&
    Date.parse(t.ends_at) <= now.getTime()
  ) {
    if (!data.sessions.some((f) => f.id === t.interval_id))
      data.sessions.push({
        id: t.interval_id!,
        day: workDate(new Date(t.ends_at), t.timezone_at_start),
        minutes: t.duration_seconds / 60,
        tag: t.tag_snapshot,
        kind: t.kind,
      });
    t.state = "idle";
    t.ends_at = null;
    t.remaining_seconds = t.duration_seconds;
    t.version++;
    t.updated_at = now.toISOString();
  }
  s.day = workDate(now, s.profile.timezone);
  s.server_now = now.toISOString();
  s.standup = data.standups[s.day] ?? null;
  const events = new Map<string, CompletedTask>();
  for (const e of data.events) if (e.day === s.day) events.set(e.task_key, e);
  const sessions = data.sessions.filter(
    (f) => f.day === s.day && f.kind === "focus",
  );
  const tags = new Map<string, number>();
  for (const f of sessions) tags.set(f.tag, (tags.get(f.tag) ?? 0) + f.minutes);
  s.summary = {
    focus_minutes: sessions.reduce((n, f) => n + f.minutes, 0),
    intervals: sessions.length,
    completed_tasks: [...events.values()],
    tags: [...tags]
      .map(([tag, minutes]) => ({ tag, minutes }))
      .sort((a, b) => b.minutes - a.minutes),
  };
  return data;
}
function read(): Data {
  const raw = localStorage.getItem(KEY);
  if (!raw) return summarize(seed());
  const data: unknown = JSON.parse(raw);
  if (
    !data ||
    typeof data !== "object" ||
    !("snapshot" in data) ||
    !("events" in data) ||
    !("sessions" in data) ||
    !("standups" in data)
  )
    throw new Error(
      "The sample workspace could not be read. Reset the demo from settings.",
    );
  const d = data as Data;
  parseSnapshot(d.snapshot);
  if (
    !Array.isArray(d.events) ||
    !Array.isArray(d.sessions) ||
    typeof d.standups !== "object" ||
    d.standups === null
  )
    throw new Error(
      "The sample workspace could not be read. Reset the demo from settings.",
    );
  return summarize(d);
}
async function transact<T>(change: (data: Data) => T): Promise<T> {
  const run = () => {
    const d = read();
    const out = change(d);
    localStorage.setItem(KEY, JSON.stringify(d));
    return out;
  };
  try {
    return navigator.locks ? await navigator.locks.request(KEY, run) : run();
  } catch (e) {
    if (
      e instanceof DOMException &&
      ["QuotaExceededError", "SecurityError"].includes(e.name)
    )
      throw new Error(
        "Device storage is unavailable. Allow storage to use the interactive demo.",
      );
    throw e;
  }
}
export const demoRepository: WorkspaceRepository = {
  demo: true,
  load: () => transact((d) => structuredClone(d.snapshot)),
  saveStandup: (day, version, text) =>
    transact<SaveResult>((d) => {
      if (day !== d.snapshot.day)
        return {
          error: "DAY_CHANGED",
          message:
            "Your workday changed. Your previous draft is protected on this device.",
        };
      const existing = d.standups[day];
      if ((existing?.version ?? 0) !== version)
        return { error: "CONFLICT", standup: existing ?? null };
      if (Object.values(text).some((s) => s.length > 5000))
        throw new Error("Each field must be at most 5,000 characters.");
      const now = new Date().toISOString();
      const s: Standup = {
        id: existing?.id ?? crypto.randomUUID(),
        user_id: ID,
        work_date: day,
        timezone_at_creation:
          existing?.timezone_at_creation ?? d.snapshot.profile.timezone,
        ...text,
        version: version + 1,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      d.standups[day] = s;
      d.snapshot.standup = s;
      return { standup: structuredClone(s) };
    }),
  task: (action: TaskAction, id, version, title = "", tag = "Unassigned") =>
    transact((d) => {
      const s = d.snapshot;
      const task = s.tasks.find((t) => t.id === id);
      const now = new Date().toISOString();
      if (action === "create" && task) return structuredClone(s);
      if (action !== "create" && (!task || task.version !== version))
        throw new Error("This task changed. Refresh and try again.");
      let slot: number | null = null;
      if (action === "create" || action === "reopen") {
        slot =
          [1, 2, 3].find((n) => !s.tasks.some((t) => t.active_slot === n)) ??
          null;
        if (slot === null)
          throw new Error(
            "Your three priorities are full. Finish or remove one first.",
          );
      }
      if (
        ["create", "edit"].includes(action) &&
        (!title.trim() ||
          title.trim().length > 240 ||
          !tag.trim() ||
          tag.trim().length > 40)
      )
        throw new Error(
          "Use a title of 1–240 characters and a tag of 1–40 characters.",
        );
      if (action === "create")
        s.tasks.push({
          id,
          user_id: ID,
          title: title.trim(),
          tag: tag.trim(),
          is_completed: false,
          completed_at: null,
          active_slot: slot,
          version: 1,
          created_at: now,
          updated_at: now,
        });
      else if (task) {
        if (action === "delete") s.tasks = s.tasks.filter((t) => t.id !== id);
        else {
          task.version++;
          task.updated_at = now;
          if (action === "edit") {
            task.title = title.trim();
            task.tag = tag.trim();
          }
          if (action === "complete" && !task.is_completed) {
            task.is_completed = true;
            task.active_slot = null;
            task.completed_at = now;
            d.events.push({
              task_key: id,
              title_snapshot: task.title,
              tag_snapshot: task.tag,
              completed_at: now,
              day: s.day,
            });
          }
          if (action === "reopen" && task.is_completed) {
            task.is_completed = false;
            task.active_slot = slot;
            task.completed_at = null;
          }
        }
      }
      summarize(d);
      return structuredClone(s);
    }),
  timer: (
    action: TimerAction,
    version,
    intervalId,
    seconds = 3000,
    taskId = null,
  ) =>
    transact((d) => {
      const s = d.snapshot;
      const t = s.timer;
      const now = new Date();
      if (action === "complete") {
        if (t.interval_id !== intervalId)
          throw new Error("The active interval changed. Refresh to continue.");
        if (t.state === "running")
          throw new Error("This interval has not finished yet.");
        return structuredClone(s);
      }
      if (t.version !== version)
        throw new Error(
          "The timer changed on another device. Refresh to continue.",
        );
      if (action === "start") {
        if (t.state !== "idle")
          throw new Error("An interval is already active.");
        if (![300, 1500, 3000].includes(seconds) || !intervalId)
          throw new Error("Choose a supported interval.");
        const task = s.tasks.find((t) => t.id === taskId && !t.is_completed);
        if (taskId && !task)
          throw new Error("Choose one of your unfinished tasks.");
        Object.assign(t, {
          interval_id: intervalId,
          state: "running",
          kind: seconds === 300 ? "break" : "focus",
          duration_seconds: seconds,
          remaining_seconds: seconds,
          ends_at: new Date(now.getTime() + seconds * 1000).toISOString(),
          task_id: task?.id ?? null,
          task_title: task?.title ?? null,
          tag_snapshot: task?.tag ?? "Unassigned",
          timezone_at_start: s.profile.timezone,
        });
      } else if (action === "pause" && t.state === "running") {
        t.remaining_seconds = Math.max(
          0,
          Math.ceil((Date.parse(t.ends_at!) - now.getTime()) / 1000),
        );
        t.state = "paused";
        t.ends_at = null;
      } else if (action === "resume" && t.state === "paused") {
        t.state = "running";
        t.ends_at = new Date(
          now.getTime() + t.remaining_seconds * 1000,
        ).toISOString();
      } else if (action === "cancel" && t.state !== "idle") {
        t.state = "idle";
        t.ends_at = null;
        t.remaining_seconds = t.duration_seconds;
      } else
        throw new Error(
          "This timer action is no longer available. Refresh to continue.",
        );
      t.version++;
      t.updated_at = now.toISOString();
      return structuredClone(s);
    }),
  profile: (name, timezone, version) =>
    transact((d) => {
      const p = d.snapshot.profile;
      if (p.version !== version)
        throw new Error("Your profile changed. Refresh and try again.");
      if (!name.trim() || name.trim().length > 100)
        throw new Error("Enter a name of 1–100 characters.");
      try {
        workDate(new Date(), timezone);
      } catch {
        throw new Error("Choose a valid timezone.");
      }
      if (timezone !== p.timezone && d.snapshot.timer.state !== "idle")
        throw new Error(
          "Finish or end your interval before changing timezone.",
        );
      p.full_name = name.trim();
      p.timezone = timezone;
      p.onboarded = true;
      p.version++;
      p.updated_at = new Date().toISOString();
      summarize(d);
      return structuredClone(d.snapshot);
    }),
  export: () => transact((d) => structuredClone(d)),
  subscribe: (callback) => {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) callback();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};
export function resetDemo() {
  localStorage.removeItem(KEY);
}
