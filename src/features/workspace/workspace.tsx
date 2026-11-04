"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Brand, Button, Dialog, Notice } from "@/components/primitives";
import { Icon } from "@/components/icons";
import { ThemeControl } from "@/components/theme-control";
import { displayDate, focusTime, compileEod, message } from "@/lib/domain";
import { browserClient } from "@/lib/supabase/browser";
import { useWorkspace } from "./use-workspace";
import { StandupDesk } from "@/features/standup/standup-desk";
import { FocusEngine } from "@/features/focus/focus-engine";
import { TaskStack } from "@/features/tasks/task-stack";
import { CopyReport } from "@/features/sign-off/copy-report";
import { Settings, clearDrafts } from "@/features/account/settings";

export function Workspace({
  demo,
  userId,
  deletionEnabled = false,
}: {
  demo: boolean;
  userId: string;
  deletionEnabled?: boolean;
}) {
  const router = useRouter();
  const { repo, snapshot, error, busy, online, refresh, run } = useWorkspace(
    demo,
    userId,
  );
  const [settings, setSettings] = useState(false);
  const [signout, setSignout] = useState(false);
  const [signoutError, setSignoutError] = useState("");
  const [signoutBusy, setSignoutBusy] = useState(false);
  const [format, setFormat] = useState("markdown");
  const saved = useCallback(() => {
    void refresh();
  }, [refresh]);
  const initials = (snapshot?.profile.full_name ?? "You")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="app-wrap" id="overview">
      {demo && (
        <div className="demo-banner">
          <span>
            <strong>Interactive preview</strong> · Sample data. Changes stay on
            this browser.
          </span>
          <Link href="/sign-in">
            Use my account
            <Icon name="arrow" />
          </Link>
        </div>
      )}
      <div className="workspace-shell">
        <header className="app-header">
          <a href="#overview" aria-label="NenSync overview">
            <Brand />
          </a>
          <nav aria-label="Workspace sections">
            <a className="nav-overview" href="#overview">
              Overview
            </a>
            <a href="#standup">Standup</a>
            <a href="#focus">Focus</a>
            <a href="#sign-off">Sign-off</a>
          </nav>
          <div className="header-actions">
            <ThemeControl />
            <Button
              variant="ghost"
              className="icon-button"
              onClick={() => setSettings(true)}
              disabled={!snapshot}
              aria-label="Workspace settings"
              title="Workspace settings"
            >
              <Icon name="settings" />
            </Button>
            <Button
              variant="ghost"
              className="avatar"
              aria-label={demo ? "Profile settings" : "Account and sign out"}
              onClick={() => (demo ? setSettings(true) : setSignout(true))}
            >
              {initials}
            </Button>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <h1>
                {snapshot
                  ? `Good ${Number(new Intl.DateTimeFormat("en", { timeZone: snapshot.profile.timezone, hour: "numeric", hourCycle: "h23" }).format(new Date())) < 12 ? "morning" : "afternoon"}, ${snapshot.profile.full_name.split(" ")[0] || "there"}`
                  : "Your space to focus"}
              </h1>
              <p>
                {snapshot
                  ? `${displayDate(snapshot.day)} · ${snapshot.profile.timezone}`
                  : "Opening your daily workspace…"}
              </p>
            </div>
            <div className="connection-status">
              <span className={online ? "status-dot" : "status-dot offline"} />
              {!online
                ? "Offline · some actions need a connection"
                : error
                  ? "Needs your attention"
                  : snapshot
                    ? demo
                      ? "Saved on this device"
                      : "Workspace connected"
                    : "Connecting…"}
            </div>
          </div>
          {error && (
            <div className="workspace-error">
              <Notice error>{error}</Notice>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => void refresh()}>
                  Refresh workspace
                </Button>
                {!demo && (
                  <Link className="text-link" href="/sign-in">
                    Sign in again
                  </Link>
                )}
                {demo && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      try {
                        localStorage.removeItem("nensync.demo.v1");
                        window.location.reload();
                      } catch {}
                    }}
                  >
                    Reset unavailable demo
                  </Button>
                )}
              </div>
            </div>
          )}
          {!snapshot ? (
            <div className="loading-workspace" role="status">
              <Icon name="sync" />
              <p>
                {error
                  ? "Your workspace could not be opened. Use the recovery actions above."
                  : "Getting your day ready…"}
              </p>
            </div>
          ) : (
            <>
              <div className="workspace-grid">
                <StandupDesk
                  key={`${userId}:${snapshot.day}`}
                  standup={snapshot.standup}
                  day={snapshot.day}
                  userId={userId}
                  repo={repo}
                  online={online}
                  onSaved={saved}
                />
                <div className="work-column">
                  <FocusEngine
                    snapshot={snapshot}
                    repo={repo}
                    run={run}
                    busy={busy}
                    online={online}
                  />
                  <TaskStack
                    snapshot={snapshot}
                    repo={repo}
                    run={run}
                    busy={busy}
                    online={online}
                  />
                </div>
                <div className="report-column">
                  <section
                    className="panel summary-panel"
                    aria-labelledby="summary-title"
                  >
                    <h2 id="summary-title">Today at a glance</h2>
                    {error && (
                      <p className="field-help">
                        Last confirmed snapshot · refresh to confirm recent
                        changes.
                      </p>
                    )}
                    <dl className="daily-facts">
                      <div>
                        <dt>Focus time</dt>
                        <dd>{focusTime(snapshot.summary.focus_minutes)}</dd>
                      </div>
                      <div>
                        <dt>Intervals</dt>
                        <dd>{snapshot.summary.intervals}</dd>
                      </div>
                      <div>
                        <dt>Tasks completed</dt>
                        <dd>{snapshot.summary.completed_tasks.length}</dd>
                      </div>
                    </dl>
                    <div className="tag-summary">
                      <h3>Time by tag</h3>
                      {snapshot.summary.tags.length ? (
                        snapshot.summary.tags.map((tag) => (
                          <div className="tag-row" key={tag.tag}>
                            <div>
                              <span>{tag.tag}</span>
                              <span>{tag.minutes}m</span>
                            </div>
                            <progress
                              value={tag.minutes}
                              max={Math.max(snapshot.summary.focus_minutes, 1)}
                              aria-label={`${tag.tag}: ${tag.minutes} minutes`}
                            />
                          </div>
                        ))
                      ) : (
                        <p className="supporting">
                          Your first completed focus interval will appear here.
                        </p>
                      )}
                    </div>
                  </section>
                  <section
                    className="panel eod-panel"
                    id="sign-off"
                    aria-labelledby="eod-title"
                  >
                    <h2 id="eod-title">End-of-day report</h2>
                    <p className="supporting">Your day, ready to share.</p>
                    <label className="format-picker">
                      <span>Format</span>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                      >
                        <option value="markdown">Markdown</option>
                        <option value="plain">Plain text</option>
                      </select>
                    </label>
                    <CopyReport
                      text={compileEod(snapshot, format === "markdown")}
                      label="Copy EOD Report"
                    />
                    <p className="fine-print">
                      {error ? "Last confirmed totals" : "Confirmed totals"} ·{" "}
                      {new Intl.DateTimeFormat("en", {
                        timeZone: snapshot.profile.timezone,
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(snapshot.server_now))}
                    </p>
                  </section>
                </div>
              </div>
              <Settings
                open={settings}
                onClose={() => setSettings(false)}
                snapshot={snapshot}
                repo={repo}
                run={run}
                busy={busy}
                deletionEnabled={deletionEnabled}
              />
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>A little structure. A little more space.</span>
          <span>Private by default{demo ? " · Demo workspace" : ""}</span>
        </footer>
      </div>
      <Dialog
        open={signout}
        title="Sign out of NenSync?"
        onClose={() => {
          if (!signoutBusy) setSignout(false);
        }}
      >
        <p className="supporting">
          Saved records stay in your account. Unsaved device draft copies will
          be cleared; save or copy any writing you need before signing out. Your
          timer keeps its saved state.
        </p>
        {signoutError && <Notice error>{signoutError}</Notice>}
        <div className="dialog-actions">
          <Button
            variant="outline"
            autoFocus
            disabled={signoutBusy}
            onClick={() => setSignout(false)}
          >
            Stay here
          </Button>
          <Button
            busy={signoutBusy}
            onClick={async () => {
              setSignoutBusy(true);
              setSignoutError("");
              try {
                const { error } = await browserClient().auth.signOut();
                if (error) throw error;
                clearDrafts(userId);
                router.replace("/sign-in");
                router.refresh();
              } catch (e) {
                setSignoutError(message(e));
                setSignoutBusy(false);
              }
            }}
          >
            Sign out
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
