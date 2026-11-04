"use client";
import { useEffect, useState, useRef } from "react";
import { draftPrefix, sweepDrafts } from "@/lib/draft-storage";
import { useRouter } from "next/navigation";
import { Button, Dialog, Notice } from "@/components/primitives";
import { ThemeControl } from "@/components/theme-control";
import { resetDemo } from "@/lib/demo-repository";
import { message, type Snapshot } from "@/lib/domain";
import type { WorkspaceRepository } from "@/lib/repository";

function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export function clearDrafts(userId: string, demo = false) {
  const prefix = `nensync.draft.${demo ? "demo" : "account"}.${userId}.`;
  for (const key of Object.keys(localStorage))
    if (key.startsWith(prefix)) localStorage.removeItem(key);
}

export function Settings({
  open,
  onClose,
  snapshot,
  repo,
  run,
  busy,
  deletionEnabled,
}: {
  open: boolean;
  onClose: () => void;
  snapshot: Snapshot;
  repo: WorkspaceRepository;
  run: (op: () => Promise<Snapshot>) => Promise<boolean>;
  busy: boolean;
  deletionEnabled: boolean;
}) {
  const router = useRouter();
  const nameInput = useRef<HTMLInputElement>(null);
  const p = snapshot.profile;
  const onboarding = !p.onboarded;
  const [name, setName] = useState(p.full_name);
  const [timezone, setTimezone] = useState(
    onboarding ? Intl.DateTimeFormat().resolvedOptions().timeZone : p.timezone,
  );
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [working, setWorking] = useState(false);
  const [destructive, setDestructive] = useState<"reset" | "delete" | null>(
    null,
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [drafts, setDrafts] = useState<
    { key: string; day: string; text: string }[]
  >([]);
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      setName(p.full_name);
      setTimezone(
        onboarding
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : p.timezone,
      );
      setError("");
      setStatus("");
    }, 0);
    return () => clearTimeout(id);
  }, [open, p.full_name, p.timezone, onboarding]);
  const zones = Intl.supportedValuesOf("timeZone");
  if (!zones.includes(timezone)) zones.unshift(timezone);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || name.trim().length > 100) {
      setError("Enter a name of 1–100 characters.");
      nameInput.current?.focus();
      return;
    }
    const ok = await run(() => repo.profile(name, timezone, p.version));
    if (ok) onClose();
    else
      setError(
        "Your changes were not saved. Check the name and timezone, finish any active interval before changing timezone, then try again.",
      );
  }
  async function exportData() {
    setWorking(true);
    setError("");
    try {
      download(await repo.export(), `nensync-${snapshot.day}.json`);
      setStatus(
        "Your records were downloaded. Keep the file somewhere private.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setWorking(false);
    }
  }
  function findDrafts() {
    try {
      sweepDrafts(localStorage, draftPrefix(p.id, repo.demo));
      const prefix = `nensync.draft.${repo.demo ? "demo" : "account"}.${p.id}.`;
      const out = [];
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith(prefix)) continue;
        const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
        if (
          !raw ||
          typeof raw !== "object" ||
          !("savedAt" in raw) ||
          typeof raw.savedAt !== "number" ||
          Date.now() - raw.savedAt > 7 * 86400000
        )
          continue;
        out.push({
          key,
          day: key.slice(prefix.length),
          text: JSON.stringify(raw, null, 2),
        });
      }
      setDrafts(out);
      setStatus(
        out.length
          ? "Protected drafts found. Download or copy these before clearing device data."
          : "No protected device drafts were found.",
      );
    } catch {
      setError(
        "Device drafts could not be read. Check your browser’s storage permissions.",
      );
    }
  }
  async function deleteAccount() {
    if (!password) {
      setError("Enter your current password to verify this request.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          result && typeof result === "object" && "message" in result
            ? String(result.message)
            : "Deletion could not be confirmed. Try again.",
        );
      clearDrafts(p.id);
      setPassword("");
      router.replace("/sign-in?notice=deleted");
      router.refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setWorking(false);
    }
  }
  return (
    <>
      <Dialog
        open={open || onboarding}
        title={
          onboarding ? "Make this workspace yours" : "Your workspace settings"
        }
        onClose={() => {
          if (!onboarding && !busy && !working) onClose();
        }}
        dismissible={!onboarding}
      >
        <p className="supporting">
          {onboarding
            ? "Confirm your name and timezone. Your local day keeps standups and reports in sync."
            : "A few preferences for a calmer workday."}
        </p>
        <form onSubmit={(e) => void save(e)} noValidate>
          <label className="field">
            <span>Your name</span>
            <input
              autoComplete="name"
              ref={nameInput}
              name="full_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              aria-invalid={!!error}
            />
          </label>
          <label className="field">
            <span>Workday timezone</span>
            <select
              name="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <span className="field-help">
              Changes affect future records. Finish an active interval before
              changing timezone.
            </span>
          </label>
          <div className="settings-row">
            <span>Appearance</span>
            <ThemeControl />
          </div>
          {error && <Notice error>{error}</Notice>}
          <div className="dialog-actions">
            {!onboarding && (
              <Button
                variant="outline"
                onClick={onClose}
                disabled={busy || working}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" busy={busy} disabled={working}>
              {onboarding ? "Open my workspace" : "Save preferences"}
            </Button>
          </div>
        </form>
        {!onboarding && (
          <div className="account-tools">
            <h3>Your data stays yours</h3>
            <p className="supporting">
              {repo.demo
                ? "This sample workspace is stored on this browser only."
                : "Export a private copy of your records, or recover unsaved writing on this device."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => void exportData()}
                busy={working}
              >
                Export my records
              </Button>
              <Button variant="ghost" onClick={findDrafts}>
                Find device drafts
              </Button>
            </div>
            {status && <Notice>{status}</Notice>}
            {drafts.map((d) => (
              <div className="draft-download" key={d.key}>
                <span>Protected draft · {d.day}</span>
                <Button
                  variant="outline"
                  onClick={() =>
                    download(JSON.parse(d.text), `nensync-draft-${d.day}.json`)
                  }
                >
                  Download draft
                </Button>
              </div>
            ))}
            <div className="destructive-area">
              {repo.demo ? (
                <>
                  <h3>Start the preview over</h3>
                  <p className="supporting">
                    Reset sample tasks, standup and intervals on this browser.
                  </p>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setDestructive("reset");
                      onClose();
                    }}
                  >
                    Reset demo
                  </Button>
                </>
              ) : (
                <>
                  <h3>Delete your account</h3>
                  <p className="supporting">
                    Delete your live workspace and records. Provider backup
                    expiry follows the published retention policy.
                  </p>
                  <Button
                    variant="danger"
                    disabled={!deletionEnabled}
                    onClick={() => {
                      setDestructive("delete");
                      onClose();
                    }}
                  >
                    Delete my account
                  </Button>
                  {!deletionEnabled && (
                    <p className="field-help">
                      Account deletion is not connected yet. Export your records
                      and contact the workspace owner.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={!!destructive}
        title={
          destructive === "reset"
            ? "Reset this demo?"
            : "Permanently delete your account?"
        }
        onClose={() => {
          if (!working) {
            setDestructive(null);
            setPassword("");
            setError("");
          }
        }}
      >
        <p className="supporting">
          {destructive === "reset"
            ? "This removes your sample changes from this device. Real accounts are not affected."
            : "Your profile, tasks, standups and focus records will be removed. This cannot be undone. Verify with your current password; downloaded copies are not erased."}
        </p>
        {destructive === "delete" && (
          <label className="field">
            <span>Current password</span>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                maxLength={256}
              />
              <Button
                variant="ghost"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((x) => !x)}
              >
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
          </label>
        )}
        {error && <Notice error>{error}</Notice>}
        <div className="dialog-actions">
          <Button
            variant="outline"
            autoFocus
            disabled={working}
            onClick={() => {
              setDestructive(null);
              setPassword("");
            }}
          >
            Keep my workspace
          </Button>
          <Button
            variant="danger"
            busy={working}
            onClick={() => {
              if (destructive === "reset") {
                clearDrafts(p.id, true);
                resetDemo();
                window.location.reload();
              } else void deleteAccount();
            }}
          >
            {destructive === "reset" ? "Reset demo" : "Delete my account"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
