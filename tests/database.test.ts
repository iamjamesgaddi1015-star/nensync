import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, addUser, asUser, rpc, ALICE, BOB } from "./db-fixture";
import { parseSnapshot } from "../src/lib/domain";

test("NS-01/02: trigger, owner isolation, restricted writes and private helper grants", async () => {
  const db = await createDatabase();
  try {
    await addUser(db, ALICE);
    await addUser(db, BOB);
    await asUser(db, ALICE);
    const s = parseSnapshot(await rpc(db, "public.workspace_snapshot()"));
    assert.equal(s.profile.id, ALICE);
    assert.equal(s.timer.state, "idle");
    assert.equal(
      (await db.query("select id from public.profiles")).rows.length,
      1,
    );
    await assert.rejects(
      db.query("update public.profiles set full_name=$1 where id=$2", [
        "Forged",
        BOB,
      ]),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "insert into public.tasks(user_id,title,active_slot) values ($1,$2,1)",
        [ALICE, "Bypass"],
      ),
      /permission denied/,
    );
    await assert.rejects(
      rpc(db, "private.reconcile($1)", [BOB]),
      /permission denied/,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      rpc(db, "public.workspace_snapshot()"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("NS-04: standup versions, per-day uniqueness, validation and stale-day protection", async () => {
  const db = await createDatabase();
  try {
    await addUser(db, ALICE);
    await asUser(db, ALICE);
    const s = parseSnapshot(await rpc(db, "public.workspace_snapshot()"));
    const save = (v: number, t: string, day = s.day) =>
      rpc(db, "public.save_standup($1,$2,$3,$4,$5)", [
        day,
        v,
        "Yesterday",
        t,
        "",
      ]);
    const first = (await save(0, "Today")) as { standup: { version: number } };
    assert.equal(first.standup.version, 1);
    assert.equal(
      ((await save(0, "Stale")) as { error: string }).error,
      "CONFLICT",
    );
    assert.equal(
      ((await save(1, "Changed")) as { standup: { version: number } }).standup
        .version,
      2,
    );
    assert.equal(
      ((await save(2, "Wrong day", "2000-01-01")) as { error: string }).error,
      "DAY_CHANGED",
    );
    await assert.rejects(save(2, "x".repeat(5001)), /5,000/);
    assert.equal(
      (await db.query("select id from public.standups")).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
test("NS-05/07/08: three slots, stale writes, completion snapshots and same-day deduplication", async () => {
  const db = await createDatabase();
  try {
    await addUser(db, ALICE);
    await addUser(db, BOB);
    await asUser(db, ALICE);
    const ids = Array.from(
      { length: 4 },
      (_, i) => `33333333-3333-4333-8333-33333333333${i}`,
    );
    const task = (
      action: string,
      id: string,
      v: number,
      title = "Priority",
      tag = "Client Work",
    ) =>
      rpc(db, "public.mutate_task($1,$2,$3,$4,$5)", [
        action,
        id,
        v,
        title,
        tag,
      ]);
    for (const id of ids.slice(0, 3)) await task("create", id, 0);
    await assert.rejects(
      task("create", ids[3], 0),
      /three priorities are full/,
    );
    await task("create", ids[0], 0);
    assert.equal(
      parseSnapshot(await rpc(db, "public.workspace_snapshot()")).tasks.length,
      3,
    );
    await task("complete", ids[0], 1);
    await assert.rejects(task("edit", ids[0], 1), /task changed/);
    await task("reopen", ids[0], 2);
    await task("edit", ids[0], 3, "Renamed", "Internal");
    await task("complete", ids[0], 4);
    let s = parseSnapshot(await rpc(db, "public.workspace_snapshot()"));
    assert.equal(s.summary.completed_tasks.length, 1);
    assert.equal(s.summary.completed_tasks[0].title_snapshot, "Renamed");
    await task("delete", ids[0], 5);
    s = parseSnapshot(await rpc(db, "public.workspace_snapshot()"));
    assert.equal(s.summary.completed_tasks.length, 1);
    await asUser(db, BOB);
    assert.equal(
      (await db.query("select id from public.task_completions")).rows.length,
      0,
    );
    await assert.rejects(task("edit", ids[1], 1), /task changed/);
  } finally {
    await db.close();
  }
});
test("NS-06/07: timer state, task ownership, forged/early completions and exactly-once recovery", async () => {
  const db = await createDatabase();
  try {
    await addUser(db, ALICE);
    await addUser(db, BOB);
    await asUser(db, BOB);
    const foreign = "44444444-4444-4444-8444-444444444444";
    await rpc(db, "public.mutate_task($1,$2,$3,$4,$5)", [
      "create",
      foreign,
      0,
      "Foreign task",
      "Client",
    ]);
    await asUser(db, ALICE);
    const id = "55555555-5555-4555-8555-555555555555";
    const timer = (
      action: string,
      v: number,
      secs = 1500,
      task: string | null = null,
    ) =>
      rpc(db, "public.control_timer($1,$2,$3,$4,$5)", [
        action,
        v,
        id,
        secs,
        task,
      ]);
    await assert.rejects(timer("start", 1, 10), /supported interval/);
    await assert.rejects(timer("start", 1, 1500, foreign), /unfinished tasks/);
    let s = parseSnapshot(await timer("start", 1));
    assert.equal(s.timer.state, "running");
    await assert.rejects(timer("start", 2), /already active/);
    await assert.rejects(timer("complete", 2), /not finished/);
    await assert.rejects(timer("pause", 1), /timer changed/);
    s = parseSnapshot(await timer("pause", 2));
    assert.equal(s.timer.state, "paused");
    s = parseSnapshot(await timer("resume", 3));
    assert.equal(s.timer.state, "running");
    await db.exec("reset role");
    await db.query(
      "update public.timer_states set ends_at = clock_timestamp() - interval '1 minute' where user_id=$1",
      [ALICE],
    );
    await asUser(db, ALICE);
    s = parseSnapshot(await timer("complete", 4));
    assert.equal(s.summary.intervals, 1);
    assert.equal(s.summary.focus_minutes, 25);
    assert.equal(s.timer.state, "idle");
    s = parseSnapshot(await timer("complete", 4));
    assert.equal(s.summary.intervals, 1);
    await assert.rejects(timer("start", s.timer.version), /already recorded/);
  } finally {
    await db.close();
  }
});
test("NS-03/06: deadline race pause reconciles at original timestamp; breaks earn no focus", async () => {
  const db = await createDatabase();
  try {
    await addUser(db, ALICE);
    await asUser(db, ALICE);
    const id = "66666666-6666-4666-8666-666666666666";
    await rpc(db, "public.control_timer($1,$2,$3,$4,$5)", [
      "start",
      1,
      id,
      300,
      null,
    ]);
    await db.exec("reset role");
    await db.query(
      "update public.timer_states set ends_at=clock_timestamp()+interval '50 milliseconds' where user_id=$1",
      [ALICE],
    );
    await db.exec(
      "alter function private.reconcile(uuid) rename to reconcile_original; create function private.reconcile(p_actor uuid) returns void language plpgsql security definer set search_path='' as $$ begin perform private.reconcile_original(p_actor); perform pg_sleep(0.08); end; $$; revoke all on function private.reconcile(uuid) from public,anon,authenticated;",
    );
    await asUser(db, ALICE);
    const s = parseSnapshot(
      await rpc(db, "public.control_timer($1,$2,$3,$4,$5)", [
        "pause",
        2,
        id,
        300,
        null,
      ]),
    );
    assert.equal(s.timer.state, "idle");
    assert.equal(s.summary.focus_minutes, 0);
    assert.equal(s.summary.intervals, 0);
    assert.equal(
      (await db.query("select id from public.focus_sessions")).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
