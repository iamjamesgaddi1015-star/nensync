"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Dialog, Notice } from "@/components/primitives";
import { Icon } from "@/components/icons";
import { PRESETS, countdown, remaining, type Snapshot } from "@/lib/domain";
import type { WorkspaceRepository } from "@/lib/repository";
import { useCompletionAlarm } from "./use-completion-alarm";

export function FocusEngine({
  snapshot,
  repo,
  run,
  busy,
  online,
}: {
  snapshot: Snapshot;
  repo: WorkspaceRepository;
  run: (op: () => Promise<Snapshot>) => Promise<boolean>;
  busy: boolean;
  online: boolean;
}) {
  const t = snapshot.timer;
  const [preset, setPreset] = useState(3000);
  const [taskId, setTaskId] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [cancel, setCancel] = useState(false);
  const [notice, setNotice] = useState("");
  const [offset, setOffset] = useState(
    () => Date.parse(snapshot.server_now) - Date.now(),
  );
  const completed = useRef("");
  const { alarm, state: alarmState } = useCompletionAlarm(
    `${repo.demo ? "demo" : "account"}.${snapshot.profile.id}`,
    t,
    Math.max(now + offset, Date.parse(snapshot.server_now)),
  );
  const retries = useRef(0);
  useEffect(() => {
    const id = setTimeout(
      () => setOffset(Date.parse(snapshot.server_now) - Date.now()),
      0,
    );
    return () => clearTimeout(id);
  }, [snapshot.server_now]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = remaining(t, now, offset);
  const active = t.state !== "idle";
  const duration = active ? t.duration_seconds : preset;
  useEffect(() => {
    if (t.state !== "running" || left > 0 || !online || busy || !t.interval_id)
      return;
    if (completed.current === t.interval_id && retries.current >= 3) return;
    const id = window.setTimeout(
      async () => {
        completed.current = t.interval_id!;
        retries.current++;
        const ok = await run(() =>
          repo.timer("complete", t.version, t.interval_id),
        );
        if (ok) {
          setNotice(
            t.kind === "break"
              ? "Break complete. Ready for your next interval?"
              : "Focus interval complete. Your daily summary is updated.",
          );
          retries.current = 0;
        } else
          setNotice(
            "Your interval ended. Completion is waiting to be confirmed; refresh when connected.",
          );
      },
      retries.current ? Math.min(4000, retries.current * 1500) : 0,
    );
    return () => clearTimeout(id);
  }, [
    left,
    online,
    busy,
    t.interval_id,
    t.state,
    t.version,
    t.kind,
    repo,
    run,
  ]);
  const selected = PRESETS.find((p) => p.seconds === duration) ?? PRESETS[0];
  const validTask =
    taskId && snapshot.tasks.some((x) => x.id === taskId && !x.is_completed)
      ? taskId
      : null;
  const percent = active
    ? Math.max(0, Math.min(100, (1 - left / t.duration_seconds) * 100))
    : 0;
  async function primary() {
    if (t.state !== "running") void alarm.prepare();
    setNotice("");
    if (t.state === "idle") {
      completed.current = "";
      retries.current = 0;
      await run(() =>
        repo.timer("start", t.version, crypto.randomUUID(), preset, validTask),
      );
    } else
      await run(() =>
        repo.timer(
          t.state === "running" ? "pause" : "resume",
          t.version,
          t.interval_id,
        ),
      );
  }
  return (
    <section className="focus-panel" id="focus" aria-labelledby="focus-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="focus-title">Your focus time</h2>
        <span className="focus-chip">{selected.name}</span>
      </div>
      <div className="preset-controls" role="group" aria-label="Focus interval">
        {PRESETS.map((p) => (
          <button
            key={p.seconds}
            aria-pressed={duration === p.seconds}
            disabled={active || busy}
            onClick={() => setPreset(p.seconds)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div
        className="countdown"
        aria-label={`${Math.floor((active ? left : preset) / 60)} minutes ${(active ? left : preset) % 60} seconds remaining`}
        role="timer"
      >
        {countdown(active ? left : preset)}
      </div>
      {active ? (
        <p className="focus-context">
          {t.state === "paused" ? "Paused · " : ""}
          {t.task_title
            ? `Working on ${t.task_title}`
            : "One interval. Your full attention."}
        </p>
      ) : (
        <label className="focus-task">
          <span>Focus on</span>
          <select
            aria-label="Focus on task"
            value={validTask ?? ""}
            onChange={(e) => setTaskId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {snapshot.tasks
              .filter((x) => !x.is_completed)
              .map((x) => (
                <option value={x.id} key={x.id}>
                  {x.title}
                </option>
              ))}
          </select>
        </label>
      )}
      <progress
        className="focus-progress"
        value={percent}
        max={100}
        aria-label="Interval elapsed"
      />
      <div className="focus-actions">
        <Button
          className="focus-primary"
          onClick={() => void primary()}
          disabled={!online || (active && left === 0)}
          busy={busy}
        >
          <Icon name={t.state === "running" ? "pause" : "play"} />
          {t.state === "running"
            ? "Pause"
            : t.state === "paused"
              ? "Resume"
              : "Start focus"}
        </Button>
        {active && (
          <Button
            variant="ghost"
            className="focus-secondary"
            onClick={() => setCancel(true)}
            disabled={busy || !online}
          >
            End session
          </Button>
        )}
      </div>
      {!online && (
        <p className="focus-footnote" role="status">
          Offline · countdown is unconfirmed. Reconnect for timer controls.
        </p>
      )}
      {!active && (
        <p className="focus-footnote">
          {preset === 300
            ? "Breaks never count toward focus time."
            : "Completed intervals count toward today’s focus."}
        </p>
      )}
      <div
        className="alarm-controls"
        role="group"
        aria-label="Completion alarm"
      >
        <label className="alarm-sound">
          <input
            type="checkbox"
            checked={alarmState.sound}
            onChange={(event) => alarm.setSound(event.target.checked)}
          />
          Sound
        </label>
        <Button
          variant="ghost"
          className="alarm-button"
          onClick={() => void alarm.test()}
        >
          Test alarm
        </Button>
        <Button
          variant="ghost"
          className="alarm-button"
          aria-pressed={
            alarmState.notifications && alarmState.permission === "granted"
          }
          busy={alarmState.requesting}
          onClick={() => void alarm.toggleNotifications()}
        >
          {alarmState.notifications && alarmState.permission === "granted"
            ? "Turn off desktop notifications"
            : "Enable desktop notifications"}
        </Button>
      </div>
      <p className="focus-footnote alarm-status" role="status">
        {alarmState.status}
      </p>
      {notice && <Notice>{notice}</Notice>}
      <Dialog
        open={cancel}
        title="End this interval?"
        onClose={() => {
          if (!busy) setCancel(false);
        }}
      >
        <p className="supporting">
          Partial intervals do not add focus minutes. An interval that already
          finished will be recorded before the timer resets.
        </p>
        <div className="dialog-actions">
          <Button
            variant="outline"
            autoFocus
            disabled={busy}
            onClick={() => setCancel(false)}
          >
            Keep going
          </Button>
          <Button
            variant="danger"
            busy={busy}
            onClick={async () => {
              if (
                await run(() => repo.timer("cancel", t.version, t.interval_id))
              )
                setCancel(false);
            }}
          >
            End session
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
