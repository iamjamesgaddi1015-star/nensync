"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Dialog, Notice } from "@/components/primitives";
import { Icon } from "@/components/icons";
import {
  EMPTY_STANDUP,
  compileStandup,
  message,
  record,
  type Standup,
  type StandupText,
} from "@/lib/domain";
import type { WorkspaceRepository } from "@/lib/repository";
import { CopyReport } from "@/features/sign-off/copy-report";
import { draftPrefix, sweepDrafts } from "@/lib/draft-storage";

type LocalDraft = { text: StandupText; version: number; savedAt: number };
const fields = [
  ["yesterday_text", "Yesterday", "What did you unblock or finish?"],
  ["today_text", "Today", "What is your main trajectory today?"],
  ["blockers_text", "Blockers", "Any dependencies or red flags?"],
] as const;
const textOf = (s: Standup | null): StandupText =>
  s
    ? {
        yesterday_text: s.yesterday_text,
        today_text: s.today_text,
        blockers_text: s.blockers_text,
      }
    : { ...EMPTY_STANDUP };
const equal = (a: StandupText, b: StandupText) =>
  fields.every(([key]) => a[key] === b[key]);

export function StandupDesk({
  standup,
  day,
  userId,
  repo,
  online,
  onSaved,
}: {
  standup: Standup | null;
  day: string;
  userId: string;
  repo: WorkspaceRepository;
  online: boolean;
  onSaved: () => void;
}) {
  const [text, setText] = useState<StandupText>(textOf(standup));
  const [version, setVersion] = useState(standup?.version ?? 0);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(
    repo.demo ? "Saved on this device" : "Saved",
  );
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<{ remote: Standup | null } | null>(
    null,
  );
  const [recovery, setRecovery] = useState<LocalDraft | null>(null);
  const [compiled, setCompiled] = useState(false);
  const [format, setFormat] = useState<"markdown" | "plain">("markdown");
  const [composing, setComposing] = useState(false);
  const latest = useRef(text);
  const revision = useRef(0);
  const saving = useRef(false);
  const knownVersion = useRef(version);
  const key = `nensync.draft.${repo.demo ? "demo" : "account"}.${userId}.${day}`;
  const protect = useCallback(
    (next: StandupText, v: number) => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ text: next, version: v, savedAt: Date.now() }),
        );
        return true;
      } catch {
        setError(
          "Device storage is unavailable. Keep this page open or compile and copy your draft.",
        );
        return false;
      }
    },
    [key],
  );
  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        sweepDrafts(localStorage, draftPrefix(userId, repo.demo));
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const r = record(JSON.parse(raw));
        const t = record(r.text);
        if (
          typeof r.savedAt !== "number" ||
          Date.now() - r.savedAt > 7 * 86400000 ||
          typeof r.version !== "number" ||
          !fields.every(
            ([k]) => typeof t[k] === "string" && String(t[k]).length <= 5000,
          )
        ) {
          localStorage.removeItem(key);
          return;
        }
        const draft = {
          text: t as StandupText,
          version: r.version,
          savedAt: r.savedAt,
        };
        if (!equal(draft.text, latest.current)) setRecovery(draft);
        else localStorage.removeItem(key);
      } catch {
        setError(
          "A device draft could not be restored. Keep any unsaved text open and copy it before leaving.",
        );
      }
    }, 0);
    return () => clearTimeout(handle);
  }, [key, userId, repo.demo]);
  useEffect(() => {
    if ((standup?.version ?? 0) <= knownVersion.current) return;
    const handle = window.setTimeout(() => {
      if (dirty) {
        if (!saving.current) setConflict({ remote: standup });
      } else {
        const t = textOf(standup);
        latest.current = t;
        setText(t);
        knownVersion.current = standup?.version ?? 0;
        setVersion(knownVersion.current);
      }
    }, 0);
    return () => clearTimeout(handle);
  }, [standup, dirty]);
  const save = useCallback(async () => {
    if (saving.current || !dirty || conflict || recovery || composing) return;
    if (!navigator.onLine) {
      setStatus("Protected on this device · offline");
      return;
    }
    saving.current = true;
    const seq = revision.current;
    const value = { ...latest.current };
    setStatus("Saving…");
    setError("");
    try {
      const result = await repo.saveStandup(day, knownVersion.current, value);
      if ("error" in result) {
        if (result.error === "CONFLICT") {
          setConflict({ remote: result.standup });
          setStatus("Choose a draft");
        } else {
          setError(result.message);
          setStatus("Previous-day draft protected");
        }
      } else {
        knownVersion.current = result.standup.version;
        setVersion(result.standup.version);
        if (seq === revision.current) {
          setDirty(false);
          setStatus(repo.demo ? "Saved on this device" : "Saved");
          try {
            localStorage.removeItem(key);
          } catch {
            /* Draft cleanup can be retried on next load. */
          }
        } else {
          protect(latest.current, knownVersion.current);
          setStatus("Unsaved changes");
        }
        onSaved();
      }
    } catch (e) {
      setError(message(e));
      setStatus("Not saved · retry");
    } finally {
      saving.current = false;
    }
  }, [dirty, conflict, recovery, composing, repo, day, key, protect, onSaved]);
  useEffect(() => {
    if (!dirty || !online || conflict || recovery || composing || error) return;
    const timeout = window.setTimeout(() => void save(), 800);
    return () => clearTimeout(timeout);
  }, [
    text,
    version,
    dirty,
    online,
    conflict,
    recovery,
    composing,
    error,
    save,
  ]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  function change(field: keyof StandupText, value: string) {
    const next = { ...latest.current, [field]: value };
    latest.current = next;
    revision.current++;
    setText(next);
    setDirty(true);
    setError("");
    setStatus(
      protect(next, knownVersion.current)
        ? "Protected on this device"
        : "Unsaved changes",
    );
  }
  return (
    <section
      className="panel standup-panel"
      id="standup"
      aria-labelledby="standup-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="standup-title">Daily standup</h2>
        <span className="save-status" role="status">
          <Icon name="check" />
          {status}
        </span>
      </div>
      <p className="supporting">A clear update for your team.</p>
      <div className="standup-fields">
        {fields.map(([field, label, placeholder]) => (
          <label className="field" key={field}>
            <span>{label}</span>
            <textarea
              name={field}
              value={text[field]}
              maxLength={5000}
              placeholder={placeholder}
              onChange={(e) => change(field, e.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              onBlur={() => {
                if (dirty && !composing) void save();
              }}
              aria-describedby={error ? "standup-error" : undefined}
            />
            <span className="field-count">
              {text[field].length.toLocaleString()} / 5,000
            </span>
          </label>
        ))}
      </div>
      {error && (
        <div id="standup-error">
          <Notice error>{error}</Notice>
          <Button
            variant="outline"
            onClick={() => {
              setError("");
              void save();
            }}
          >
            Retry save
          </Button>
        </div>
      )}
      {!online && (
        <Notice>
          Your writing is protected on this device. Reconnect to save it to your
          account.
        </Notice>
      )}
      <div className="panel-footer">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setCompiled(true)}
        >
          Compile Standup
          <Icon name="copy" />
        </Button>
        <p className="fine-print">Preview, then copy to your team chat.</p>
      </div>
      <Dialog
        open={compiled}
        title="Your standup, ready to share"
        onClose={() => setCompiled(false)}
      >
        <p className="supporting">
          {dirty
            ? "This preview includes text not yet saved to your account."
            : "Review your update before copying."}
        </p>
        <label className="field">
          <span>Copy format</span>
          <select
            value={format}
            onChange={(e) =>
              setFormat(e.target.value === "plain" ? "plain" : "markdown")
            }
          >
            <option value="markdown">Markdown</option>
            <option value="plain">Plain text</option>
          </select>
        </label>
        <CopyReport
          text={compileStandup(text, day, format === "markdown")}
          label="Copy Standup"
        />
      </Dialog>
      <Dialog
        open={!!conflict}
        title="Two drafts need your choice"
        onClose={() => {}}
        dismissible={false}
      >
        <p className="supporting">
          Another tab or device saved a newer update. Your writing is protected;
          choose which version to keep.
        </p>
        <div className="comparison">
          <div>
            <h3>Your draft</h3>
            <pre>{compileStandup(text, day, false)}</pre>
          </div>
          <div>
            <h3>Saved draft</h3>
            <pre>
              {compileStandup(textOf(conflict?.remote ?? null), day, false)}
            </pre>
          </div>
        </div>
        <div className="dialog-actions">
          <Button
            variant="outline"
            onClick={() => {
              const t = textOf(conflict?.remote ?? null);
              latest.current = t;
              setText(t);
              knownVersion.current = conflict?.remote?.version ?? 0;
              setVersion(knownVersion.current);
              setDirty(false);
              setConflict(null);
              setStatus(repo.demo ? "Saved on this device" : "Saved");
              try {
                localStorage.removeItem(key);
              } catch {}
            }}
          >
            Use saved draft
          </Button>
          <Button
            onClick={() => {
              knownVersion.current = conflict?.remote?.version ?? 0;
              setVersion(knownVersion.current);
              setConflict(null);
              setDirty(true);
              setError("");
              protect(latest.current, knownVersion.current);
            }}
          >
            Save my draft
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={!!recovery}
        title="You have a protected draft"
        onClose={() => {}}
        dismissible={false}
      >
        <p className="supporting">
          Your device has writing that differs from the saved update. Restore
          it, or keep the saved version.
        </p>
        <pre className="report-preview">
          {recovery ? compileStandup(recovery.text, day, false) : ""}
        </pre>
        <div className="dialog-actions">
          <Button
            variant="outline"
            onClick={() => {
              try {
                localStorage.removeItem(key);
              } catch {}
              setRecovery(null);
            }}
          >
            Keep saved version
          </Button>
          <Button
            onClick={() => {
              if (!recovery) return;
              latest.current = recovery.text;
              setText(recovery.text);
              setDirty(true);
              revision.current++;
              if (recovery.version !== knownVersion.current)
                setConflict({ remote: standup });
              setRecovery(null);
            }}
          >
            Restore device draft
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
