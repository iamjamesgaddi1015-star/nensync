import type { Timer } from "@/lib/domain";

type Preferences = { sound: boolean; notifications: boolean };
type AlarmState = Preferences & {
  permission: NotificationPermission | "unsupported";
  requesting: boolean;
  status: string;
};
type Claim = { at: number; owner: string; done: boolean };
export const INITIAL_ALARM_STATE: AlarmState = {
  sound: true,
  notifications: false,
  permission: "default",
  requesting: false,
  status: "Keep NenSync open for completion alerts.",
};
const GRACE_MS = 60_000;
const RETENTION_MS = 2 * 86_400_000;

// Owns browser resources only. Timer persistence and credited minutes stay in
// the repository/database; an alert never implies a successful completion write.
export class CompletionAlarm {
  private state = INITIAL_ALARM_STATE;
  private listeners = new Set<() => void>();
  private audio: AudioContext | null = null;
  private channel: BroadcastChannel | null = null;
  private notification: Notification | null = null;
  private handled = new Set<string>();
  private observed: { id: string; deadline: number; kind: string } | null =
    null;
  private active = false;
  private owner = "";
  private storageAvailable = true;
  private readonly preferenceKey: string;
  private readonly claimPrefix: string;

  constructor(private readonly scope: string) {
    this.preferenceKey = `nensync.alarm.preferences.${scope}`;
    this.claimPrefix = `nensync.alarm.claim.${scope}.`;
  }

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(change: Partial<AlarmState>) {
    if (!this.active) return;
    this.state = { ...this.state, ...change };
    for (const listener of this.listeners) listener();
  }
  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      this.storageAvailable = false;
      return null;
    }
  }
  private write(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      this.storageAvailable = false;
      return false;
    }
  }
  private permission(): AlarmState["permission"] {
    return window.isSecureContext && "Notification" in window
      ? Notification.permission
      : "unsupported";
  }
  private loadPreferences = () => {
    let sound = true;
    let notifications = false;
    try {
      const raw = this.read(this.preferenceKey);
      const value: unknown = raw ? JSON.parse(raw) : null;
      if (value && typeof value === "object") {
        if ("sound" in value && typeof value.sound === "boolean")
          sound = value.sound;
        if (
          "notifications" in value &&
          typeof value.notifications === "boolean"
        )
          notifications = value.notifications;
      }
    } catch {
      /* Invalid device preferences use safe defaults. */
    }
    this.update({ sound, notifications, permission: this.permission() });
  };
  private persist() {
    const { sound, notifications } = this.state;
    if (
      !this.write(this.preferenceKey, JSON.stringify({ sound, notifications }))
    )
      this.update({
        status:
          "Your browser cannot remember alarm choices. Alerts are limited to this tab.",
      });
  }
  connect() {
    this.active = true;
    this.owner = crypto.randomUUID();
    this.loadPreferences();
    // Keep only bounded, recent identifiers; never store task/standup content.
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key?.startsWith(this.claimPrefix)) continue;
        const record = this.readClaim(key);
        if (!record || Date.now() - record.at > RETENTION_MS)
          localStorage.removeItem(key);
      }
    } catch {
      this.storageAvailable = false;
    }
    if (!this.storageAvailable)
      this.update({
        status:
          "Browser storage is unavailable. Alarm choices and duplicate suppression across tabs are limited.",
      });
    try {
      this.channel = new BroadcastChannel(`nensync.alarm.${this.scope}`);
      this.channel.onmessage = (event: MessageEvent<unknown>) => {
        if (typeof event.data === "string" && event.data.length < 100)
          this.handled.add(event.data);
      };
    } catch {
      /* Storage/locks can still coordinate without a channel. */
    }
    const storage = (event: StorageEvent) => {
      if (event.key === this.preferenceKey) this.loadPreferences();
    };
    const visibility = () => this.update({ permission: this.permission() });
    const signout = () => this.disconnect();
    window.addEventListener("storage", storage);
    window.addEventListener("nensync-signed-out", signout);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener("nensync-signed-out", signout);
      document.removeEventListener("visibilitychange", visibility);
      this.disconnect();
    };
  }
  private disconnect() {
    this.active = false;
    this.observed = null;
    this.channel?.close();
    this.channel = null;
    this.notification?.close();
    this.notification = null;
    const audio = this.audio;
    this.audio = null;
    if (audio && audio.state !== "closed") void audio.close().catch(() => {});
  }
  async prepare(force = false) {
    if (!this.active || (!this.state.sound && !force)) return false;
    try {
      if (!this.audio || this.audio.state === "closed")
        this.audio = new AudioContext();
      if (this.audio.state === "suspended") await this.audio.resume();
      if (!this.active || this.audio?.state !== "running")
        throw new Error("blocked");
      return true;
    } catch {
      this.update({
        status:
          "Sound is unavailable or blocked. Try Test alarm and check your browser sound settings.",
      });
      return false;
    }
  }
  private chime() {
    const audio = this.audio;
    if (!audio || audio.state !== "running") return false;
    try {
      const gain = audio.createGain();
      gain.connect(audio.destination);
      const at = audio.currentTime;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.12, at + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.8);
      const oscillator = audio.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, at);
      oscillator.frequency.setValueAtTime(880, at + 0.28);
      oscillator.connect(gain);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(at);
      oscillator.stop(at + 0.85);
      return true;
    } catch {
      return false;
    }
  }
  setSound = (sound: boolean) => {
    this.update({
      sound,
      status: sound
        ? "Sound on. Use Test alarm to check your volume."
        : "Sound muted. Desktop notification settings are unchanged.",
    });
    this.persist();
    if (sound) void this.prepare();
  };
  test = async () => {
    if (await this.prepare(true)) {
      const played = this.chime();
      this.update({
        status: played
          ? "Test chime played. If you heard nothing, check your volume and browser sound settings."
          : "The chime could not play. Check your browser sound settings.",
      });
    }
  };
  toggleNotifications = async () => {
    if (!this.active || this.state.requesting) return;
    if (this.state.notifications && this.permission() === "granted") {
      this.update({
        notifications: false,
        status: "Desktop notifications off for NenSync.",
      });
      this.persist();
      return;
    }
    const permission = this.permission();
    if (permission === "unsupported" || permission === "denied") {
      this.update({
        permission,
        status:
          permission === "denied"
            ? "Notifications are blocked. Allow them in your browser site settings, then try again."
            : "Desktop notifications are unavailable here. Sound and the completion message still work where supported.",
      });
      return;
    }
    void this.prepare();
    this.update({ requesting: true });
    try {
      const result =
        permission === "granted"
          ? permission
          : await Notification.requestPermission();
      this.update({
        permission: result,
        notifications: result === "granted",
        status:
          result === "granted"
            ? "Desktop notifications on. Keep NenSync open."
            : "Notifications were not enabled. Sound and the completion message remain available.",
      });
      if (this.active) this.persist();
    } catch {
      this.update({
        status:
          "Notifications could not be enabled. Check your browser site settings.",
      });
    } finally {
      this.update({ requesting: false });
    }
  };
  observe(timer: Timer, serverNow: number) {
    if (!this.active) return;
    const previous = this.observed;
    if (timer.state === "running" && timer.interval_id && timer.ends_at) {
      const deadline = Date.parse(timer.ends_at);
      if (deadline > serverNow) {
        this.observed = { id: timer.interval_id, deadline, kind: timer.kind };
        return;
      }
      if (previous?.id === timer.interval_id) {
        this.observed = null;
        if (serverNow - deadline <= GRACE_MS)
          void this.deliver(previous.id, timer.kind);
      }
    } else {
      this.observed = null;
      if (
        timer.state === "idle" &&
        previous &&
        serverNow >= previous.deadline &&
        serverNow - previous.deadline <= GRACE_MS
      )
        void this.deliver(previous.id, previous.kind);
    }
  }
  private readClaim(key: string): Claim | null {
    try {
      const raw = this.read(key);
      const record: unknown = raw ? JSON.parse(raw) : null;
      if (
        record &&
        typeof record === "object" &&
        "at" in record &&
        typeof record.at === "number" &&
        Number.isFinite(record.at) &&
        "owner" in record &&
        typeof record.owner === "string" &&
        "done" in record &&
        typeof record.done === "boolean"
      )
        return record as Claim;
    } catch {
      /* Ignore malformed local coordination data. */
    }
    return null;
  }
  private async claim(id: string, locked: boolean) {
    if (!this.active) return false;
    const key = this.claimPrefix + id;
    if (this.readClaim(key)?.done) return false;
    const candidate = { at: Date.now(), owner: this.owner, done: false };
    const stored = this.write(key, JSON.stringify(candidate));
    if (!locked && stored) {
      // Best-effort lease election when Web Locks is unavailable.
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      if (this.readClaim(key)?.owner !== this.owner) return false;
    }
    if (!this.active) return false;
    if (stored) this.write(key, JSON.stringify({ ...candidate, done: true }));
    try {
      this.channel?.postMessage(id);
    } catch {
      /* Local-only fallback. */
    }
    return true;
  }
  private async deliver(id: string, kind: string) {
    if (this.handled.has(id)) return;
    // Prefer a tab with user-armed audio over a passive synchronized tab.
    const soundReady = this.state.sound && this.audio?.state === "running";
    if (!soundReady)
      await new Promise((resolve) => window.setTimeout(resolve, 200));
    if (!this.active || this.handled.has(id)) return;
    const available =
      soundReady ||
      (this.state.notifications && this.permission() === "granted");
    if (!available) {
      this.update({
        status: this.state.sound
          ? "Interval finished. Sound was not armed; use Test alarm before your next interval."
          : "Interval finished. Sound is muted.",
      });
      return;
    }
    const attempt = async (locked: boolean) => {
      if (this.handled.has(id) || !(await this.claim(id, locked))) return;
      this.handled.add(id);
      if (!this.active) return;
      const title =
        kind === "break" ? "Break finished" : "Focus interval finished";
      let sound = false;
      if (this.state.sound) sound = this.chime();
      let notified = false;
      if (this.state.notifications && this.permission() === "granted") {
        try {
          this.notification?.close();
          const notification = new Notification(title, {
            body: "Return to NenSync when you're ready.",
            tag: `nensync-interval-${id}`,
            silent: true,
          });
          notification.onclick = () => {
            if (this.active) {
              window.focus();
              document.getElementById("focus")?.scrollIntoView();
            }
            notification.close();
          };
          this.notification = notification;
          notified = true;
        } catch {
          /* Mobile and blocked constructors degrade to inline feedback. */
        }
      }
      this.update({
        status: !this.storageAvailable
          ? `${title}. Cross-tab duplicate suppression is limited because browser storage is unavailable.`
          : !sound && this.state.sound
            ? `${title}. Sound was blocked; use Test alarm before the next interval.`
            : this.state.notifications && !notified
              ? `${title}. Desktop notification unavailable; check your browser settings.`
              : `${title}.`,
      });
    };
    if (navigator.locks?.request) {
      try {
        await navigator.locks.request(this.claimPrefix + id, () =>
          attempt(true),
        );
      } catch {
        if (this.active && !this.handled.has(id)) await attempt(false);
      }
    } else await attempt(false);
  }
}
