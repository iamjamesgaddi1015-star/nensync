import test from "node:test";
import assert from "node:assert/strict";
import {
  workDate,
  countdown,
  compileStandup,
  compileEod,
  remaining,
  parseSnapshot,
} from "../src/lib/domain";
import { safeTheme } from "../src/lib/theme";
import { signRecovery, verifyRecovery } from "../src/lib/recovery-crypto";
import { sweepDrafts, draftPrefix } from "../src/lib/draft-storage";
import { boundedJson } from "../src/lib/bounded-body";
import { signupErrorMessage } from "../src/lib/auth-errors";

test("signup explains the actual provider password minimum without reflecting its message", () => {
  const result = signupErrorMessage({
    code: "weak_password",
    message:
      "Password should be at least 43 characters. synthetic-private-marker",
  });
  assert.match(result, /at least 43 characters/);
  assert.doesNotMatch(result, /synthetic-private-marker/);
});

test("signup exposes corrective configuration feedback without private provider text", () => {
  const result = signupErrorMessage({
    code: "email_address_not_authorized",
    message: "synthetic-owner@example.invalid is not authorized",
  });
  assert.match(result, /Contact the workspace owner/);
  assert.doesNotMatch(result, /synthetic-owner|example.invalid/);
  assert.match(
    signupErrorMessage({ code: "over_email_send_rate_limit" }),
    /Wait before trying again/,
  );
});

test("unconfirmed signup preserves unknown outcome and account-existence privacy", () => {
  assert.match(
    signupErrorMessage({ name: "AuthRetryableFetchError", status: 0 }),
    /account may already have been created/,
  );
  assert.equal(
    signupErrorMessage({
      code: "email_exists",
      message: "synthetic-existing-account",
    }),
    signupErrorMessage({ code: "unknown", message: "synthetic-secret-value" }),
  );
});

test("local workdays handle UTC boundaries and daylight-saving transitions", () => {
  assert.equal(
    workDate(new Date("2026-11-04T16:30:00Z"), "Asia/Taipei"),
    "2026-11-05",
  );
  assert.equal(
    workDate(new Date("2026-11-04T00:30:00Z"), "America/Los_Angeles"),
    "2026-11-03",
  );
  assert.equal(
    workDate(new Date("2026-11-01T05:30:00Z"), "America/New_York"),
    "2026-11-01",
  );
  assert.equal(
    workDate(new Date("2026-11-01T06:30:00Z"), "America/New_York"),
    "2026-11-01",
  );
  assert.throws(() => workDate(new Date(), "Not/A_Zone"));
});
test("countdown clamps overdue intervals and formats hours as minutes", () => {
  assert.equal(countdown(-10), "00:00");
  assert.equal(countdown(3000), "50:00");
  assert.equal(countdown(59.2), "01:00");
});
test("standup compilation is explicit about absent content and preserves literal text", () => {
  const report = compileStandup(
    {
      yesterday_text: "",
      today_text: "<script>literal</script>",
      blockers_text: "",
    },
    "2026-11-04",
    false,
  );
  assert.match(report, /Not provided/);
  assert.match(report, /None reported/);
  assert.match(report, /<script>literal/);
  assert.doesNotMatch(report, /\*\*/);
});
test("EOD marks reopened tasks and never fabricates completed work", () => {
  const sample = {
    day: "2026-11-04",
    summary: {
      focus_minutes: 75,
      intervals: 2,
      completed_tasks: [
        {
          task_key: "a",
          title_snapshot: "A real task",
          tag_snapshot: "Client",
          completed_at: "2026-11-04T01:00:00Z",
        },
      ],
      tags: [],
    },
    tasks: [{ id: "a", is_completed: false }],
    standup: null,
  };
  assert.match(compileEod(sample), /A real task \(reopened\)/);
  assert.match(compileEod(sample), /1h 15m across 2 intervals/);
  assert.match(compileEod(sample), /Next: Not provided/);
  sample.summary.completed_tasks = [];
  assert.match(compileEod(sample), /No completed tasks recorded/);
});
test("remaining time uses deadline and server offset rather than tab tick count", () => {
  const timer = {
    state: "running",
    ends_at: "2026-11-04T01:00:00Z",
    remaining_seconds: 3000,
  };
  assert.equal(remaining(timer, Date.parse("2026-11-04T00:59:00Z"), 10000), 50);
  assert.equal(remaining(timer, Date.parse("2026-11-04T01:00:01Z")), 0);
});
test("theme preference is allowlisted and malformed server responses are rejected", () => {
  assert.equal(safeTheme("dark"), "dark");
  assert.equal(safeTheme("bad-value"), "system");
  assert.throws(() => parseSnapshot({ tasks: [] }));
});

test("recovery context rejects forged, expired and other-account requests", () => {
  const synthetic = "synthetic-unit-test-signing-material-not-a-service-key";
  const value = signRecovery("alice", synthetic, 1000);
  assert.equal(verifyRecovery(value, "alice", synthetic, 1001), true);
  assert.equal(verifyRecovery(value, "bob", synthetic, 1001), false);
  assert.equal(
    verifyRecovery(value + "tampered", "alice", synthetic, 1001),
    false,
  );
  assert.equal(verifyRecovery(value, "alice", synthetic, 602000), false);
});
test("draft expiry removes prior-day content only inside the current account namespace", () => {
  const prefix = draftPrefix("alice");
  const other = draftPrefix("bob");
  const now = 1000000000;
  const value = (age: number) =>
    JSON.stringify({
      savedAt: now - age,
      version: 1,
      text: { yesterday_text: "synthetic", today_text: "", blockers_text: "" },
    });
  const map = new Map([
    [prefix + "2026-10-01", value(8 * 86400000)],
    [prefix + "2026-11-04", value(1000)],
    [other + "2026-10-01", value(8 * 86400000)],
    [prefix + "invalid", "bad-json"],
  ]);
  const store = {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
  sweepDrafts(store, prefix, now);
  assert.equal(map.has(prefix + "2026-10-01"), false);
  assert.equal(map.has(prefix + "invalid"), false);
  assert.equal(map.has(prefix + "2026-11-04"), true);
  assert.equal(map.has(other + "2026-10-01"), true);
});
test("JSON body limits reject oversized streamed payloads", async () => {
  await assert.rejects(
    boundedJson(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ text: "x".repeat(5000) }),
      }),
    ),
    /too large/,
  );
  assert.deepEqual(
    await boundedJson(
      new Request("http://localhost", { method: "POST", body: '{"ok":true}' }),
    ),
    { ok: true },
  );
});
