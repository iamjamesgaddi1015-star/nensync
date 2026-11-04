import type { Tables } from "./supabase/database.types";

export type Profile = Tables<"profiles">;
export type Task = Tables<"tasks">;
export type Standup = Tables<"standups">;
export type Timer = Tables<"timer_states">;
export type StandupText = Pick<
  Standup,
  "yesterday_text" | "today_text" | "blockers_text"
>;
export type CompletedTask = {
  task_key: string;
  title_snapshot: string;
  tag_snapshot: string;
  completed_at: string;
};
export type Summary = {
  focus_minutes: number;
  intervals: number;
  completed_tasks: CompletedTask[];
  tags: { tag: string; minutes: number }[];
};
export type Snapshot = {
  profile: Profile;
  day: string;
  server_now: string;
  standup: Standup | null;
  tasks: Task[];
  timer: Timer;
  summary: Summary;
};
export type TaskAction = "create" | "edit" | "complete" | "reopen" | "delete";
export type TimerAction = "start" | "pause" | "resume" | "cancel" | "complete";
export type SaveResult =
  | { standup: Standup }
  | { error: "CONFLICT"; standup: Standup | null }
  | { error: "DAY_CHANGED"; message: string };
export const EMPTY_STANDUP: StandupText = {
  yesterday_text: "",
  today_text: "",
  blockers_text: "",
};
export const PRESETS = [
  { seconds: 3000, label: "50m", name: "Deep work" },
  { seconds: 1500, label: "25m", name: "Classic focus" },
  { seconds: 300, label: "5m break", name: "Short break" },
] as const;

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(
      "An unexpected response was received. Refresh and try again.",
    );
  return value as Record<string, unknown>;
}
function shape(
  value: unknown,
  strings: string[],
  numbers: string[],
  nullable: string[] = [],
) {
  const r = record(value);
  for (const key of strings)
    if (typeof r[key] !== "string")
      throw new Error(
        "An incomplete response was received. Refresh and try again.",
      );
  for (const key of numbers)
    if (typeof r[key] !== "number" || !Number.isFinite(r[key]))
      throw new Error(
        "An invalid response was received. Refresh and try again.",
      );
  for (const key of nullable)
    if (r[key] !== null && typeof r[key] !== "string")
      throw new Error(
        "An invalid response was received. Refresh and try again.",
      );
  return r;
}
export function parseStandup(value: unknown): Standup {
  shape(
    value,
    [
      "id",
      "user_id",
      "work_date",
      "timezone_at_creation",
      "yesterday_text",
      "today_text",
      "blockers_text",
      "created_at",
      "updated_at",
    ],
    ["version"],
  );
  return value as Standup;
}
export function parseSnapshot(value: unknown): Snapshot {
  const r = shape(value, ["day", "server_now"], []);
  const p = shape(
    r.profile,
    ["id", "full_name", "timezone", "updated_at"],
    ["version"],
    ["avatar_url"],
  );
  if (typeof p.onboarded !== "boolean")
    throw new Error("Profile setup could not be read.");
  workDate(new Date(), String(p.timezone));
  if (r.standup !== null) parseStandup(r.standup);
  if (!Array.isArray(r.tasks))
    throw new Error("Your task list could not be read.");
  for (const task of r.tasks) {
    const t = shape(
      task,
      ["id", "user_id", "title", "tag", "created_at", "updated_at"],
      ["version"],
      ["completed_at"],
    );
    if (
      typeof t.is_completed !== "boolean" ||
      (t.active_slot !== null &&
        (typeof t.active_slot !== "number" ||
          ![1, 2, 3].includes(t.active_slot)))
    )
      throw new Error("Your task list could not be read.");
  }
  const t = shape(
    r.timer,
    [
      "user_id",
      "state",
      "kind",
      "tag_snapshot",
      "timezone_at_start",
      "updated_at",
    ],
    ["version", "duration_seconds", "remaining_seconds"],
    ["interval_id", "ends_at", "task_id", "task_title"],
  );
  if (
    !["idle", "running", "paused"].includes(String(t.state)) ||
    !["focus", "break"].includes(String(t.kind)) ||
    ![300, 1500, 3000].includes(Number(t.duration_seconds))
  )
    throw new Error("Your timer state could not be read.");
  if (
    t.state === "running" &&
    (typeof t.ends_at !== "string" || !Number.isFinite(Date.parse(t.ends_at)))
  )
    throw new Error("Your timer deadline could not be read.");
  const s = shape(r.summary, [], ["focus_minutes", "intervals"]);
  if (!Array.isArray(s.completed_tasks) || !Array.isArray(s.tags))
    throw new Error("Your daily summary could not be read.");
  for (const c of s.completed_tasks)
    shape(
      c,
      ["task_key", "title_snapshot", "tag_snapshot", "completed_at"],
      [],
    );
  for (const tag of s.tags) shape(tag, ["tag"], ["minutes"]);
  return value as Snapshot;
}
export function workDate(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function displayDate(day: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
export function countdown(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}
export function remaining(
  timer: Pick<Timer, "state" | "ends_at" | "remaining_seconds">,
  now: number,
  offset = 0,
) {
  return timer.state === "running" && timer.ends_at
    ? Math.max(0, Math.ceil((Date.parse(timer.ends_at) - now - offset) / 1000))
    : timer.remaining_seconds;
}
export function focusTime(minutes: number) {
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
}
function clean(text: string) {
  return text.trim().replace(/\r\n/g, "\n");
}
export function compileStandup(
  text: StandupText,
  day: string,
  markdown = true,
) {
  const h = (s: string) => (markdown ? `**${s}**` : s);
  return [
    `Standup — ${displayDate(day)}`,
    "",
    h("Yesterday"),
    clean(text.yesterday_text) || "Not provided",
    "",
    h("Today"),
    clean(text.today_text) || "Not provided",
    "",
    h("Blockers"),
    clean(text.blockers_text) || "None reported",
  ].join("\n");
}
export function compileEod(
  snapshot: Pick<Snapshot, "day" | "summary" | "standup"> & {
    tasks: Pick<Task, "id" | "is_completed">[];
  },
  markdown = true,
) {
  const { summary, standup } = snapshot;
  const label = (s: string) => (markdown ? `**${s}**` : s);
  const active = new Set(
    snapshot.tasks.filter((t) => !t.is_completed).map((t) => t.id),
  );
  return [
    `End of day — ${displayDate(snapshot.day)}`,
    "",
    label("Completed today"),
    ...(summary.completed_tasks.length
      ? summary.completed_tasks.map(
          (t) =>
            `- ${clean(t.title_snapshot)}${active.has(t.task_key) ? " (reopened)" : ""}`,
        )
      : ["- No completed tasks recorded."]),
    "",
    `Focus: ${focusTime(summary.focus_minutes)} across ${summary.intervals} ${summary.intervals === 1 ? "interval" : "intervals"}`,
    `Next: ${clean(standup?.today_text ?? "") || "Not provided"}`,
    `Blockers: ${clean(standup?.blockers_text ?? "") || "None reported"}`,
  ].join("\n");
}
export function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
