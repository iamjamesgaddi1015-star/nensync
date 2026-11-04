import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

export const ALICE = "11111111-1111-4111-8111-111111111111";
export const BOB = "22222222-2222-4222-8222-222222222222";

export async function createDatabase() {
  const db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  await db.exec(
    await readFile("supabase/migrations/202611040001_workspace.sql", "utf8"),
  );
  return db;
}

export async function addUser(db: PGlite, id: string) {
  await db.query("insert into auth.users(id,email) values ($1,$2)", [
    id,
    `${id.slice(0, 4)}@example.test`,
  ]);
}

export async function asUser(db: PGlite, id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}

export async function rpc(db: PGlite, sql: string, params: unknown[] = []) {
  const r = await db.query<{ result: unknown }>(
    `select ${sql} as result`,
    params,
  );
  return r.rows[0].result;
}
