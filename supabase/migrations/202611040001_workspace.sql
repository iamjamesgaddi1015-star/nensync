-- NenSync initial install. Review existing target objects before any hosted use.
-- Local verification bootstraps auth.users/auth.uid with synthetic identities only.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  avatar_url text,
  timezone text not null default 'UTC',
  onboarded boolean not null default false,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
create table public.standups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  timezone_at_creation text not null,
  yesterday_text text not null default '' check (char_length(yesterday_text) <= 5000),
  today_text text not null default '' check (char_length(today_text) <= 5000),
  blockers_text text not null default '' check (char_length(blockers_text) <= 5000),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  tag text not null default 'Unassigned' check (char_length(tag) between 1 and 40),
  is_completed boolean not null default false,
  completed_at timestamptz,
  active_slot smallint,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, active_slot),
  check ((not is_completed and active_slot between 1 and 3 and active_slot is not null and completed_at is null)
    or (is_completed and active_slot is null and completed_at is not null))
);
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid,
  task_key uuid not null,
  task_version integer not null,
  title_snapshot text not null,
  tag_snapshot text not null,
  completed_at timestamptz not null,
  work_date date not null,
  timezone_at_completion text not null,
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete set null (task_id),
  unique (task_key, task_version)
);
create table public.timer_states (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  interval_id uuid unique,
  state text not null default 'idle' check (state in ('idle','running','paused')),
  kind text not null default 'focus' check (kind in ('focus','break')),
  duration_seconds integer not null default 3000,
  remaining_seconds integer not null default 3000,
  ends_at timestamptz,
  task_id uuid,
  task_title text,
  tag_snapshot text not null default 'Unassigned',
  timezone_at_start text not null default 'UTC',
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete set null (task_id),
  check ((kind = 'focus' and duration_seconds in (1500,3000)) or (kind = 'break' and duration_seconds = 300)),
  check (remaining_seconds between 0 and duration_seconds),
  check ((state = 'running' and ends_at is not null and interval_id is not null)
    or (state = 'paused' and ends_at is null and interval_id is not null)
    or (state = 'idle' and ends_at is null))
);
create table public.focus_sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('focus','break')),
  duration_minutes integer not null,
  completed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  work_date date not null,
  timezone_at_completion text not null,
  task_id uuid,
  task_title text,
  tag_snapshot text not null,
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete set null (task_id),
  check ((kind = 'focus' and duration_minutes in (25,50)) or (kind = 'break' and duration_minutes = 5))
);
create index task_completions_day on public.task_completions(user_id, work_date, completed_at);
create index focus_sessions_day on public.focus_sessions(user_id, work_date, completed_at);

alter table public.profiles enable row level security;
alter table public.standups enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.timer_states enable row level security;
alter table public.focus_sessions enable row level security;
create policy owner_read on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy owner_read on public.standups for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_read on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_read on public.task_completions for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_read on public.timer_states for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_read on public.focus_sessions for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.profiles, public.standups, public.tasks, public.task_completions, public.timer_states, public.focus_sessions from anon, authenticated;
grant select on public.profiles, public.standups, public.tasks, public.task_completions, public.timer_states, public.focus_sessions to authenticated;

create function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id);
  insert into public.timer_states(user_id) values (new.id);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger nensync_profile after insert on auth.users for each row execute function private.handle_new_user();

create function private.actor_lock() returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Sign in to continue.' using errcode = '28000'; end if;
  perform 1 from public.profiles where id = actor for update;
  if not found then raise exception 'Account setup is incomplete. Try signing in again.'; end if;
  return actor;
end;
$$;
revoke all on function private.actor_lock() from public, anon, authenticated;

create function private.reconcile(p_actor uuid) returns void language plpgsql security definer set search_path = '' as $$
declare t public.timer_states; stamp timestamptz := clock_timestamp();
begin
  select * into t from public.timer_states where user_id = p_actor for update;
  if t.state = 'running' and t.ends_at <= stamp then
    insert into public.focus_sessions(id, user_id, kind, duration_minutes, completed_at, recorded_at, work_date, timezone_at_completion, task_id, task_title, tag_snapshot)
      values (t.interval_id, p_actor, t.kind, t.duration_seconds / 60, t.ends_at, stamp, (t.ends_at at time zone t.timezone_at_start)::date, t.timezone_at_start, t.task_id, t.task_title, t.tag_snapshot)
      on conflict (id) do nothing;
    update public.timer_states set state = 'idle', remaining_seconds = duration_seconds, ends_at = null, version = version + 1, updated_at = stamp where user_id = p_actor;
  end if;
end;
$$;
revoke all on function private.reconcile(uuid) from public, anon, authenticated;

create function private.workspace_snapshot() returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.actor_lock(); p public.profiles; d date; result jsonb;
begin
  perform private.reconcile(actor);
  select * into p from public.profiles where id = actor;
  d := (clock_timestamp() at time zone p.timezone)::date;
  select jsonb_build_object(
    'profile', to_jsonb(p), 'day', d, 'server_now', clock_timestamp(),
    'standup', (select to_jsonb(s) from public.standups s where s.user_id = actor and s.work_date = d),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t) order by t.is_completed, t.active_slot, t.completed_at desc) from (select * from public.tasks where user_id = actor and (not is_completed or (completed_at at time zone p.timezone)::date = d) order by is_completed, active_slot, completed_at desc limit 50) t), '[]'::jsonb),
    'timer', (select to_jsonb(t) from public.timer_states t where t.user_id = actor),
    'summary', jsonb_build_object(
      'focus_minutes', (select coalesce(sum(duration_minutes), 0) from public.focus_sessions where user_id = actor and work_date = d and kind = 'focus'),
      'intervals', (select count(*) from public.focus_sessions where user_id = actor and work_date = d and kind = 'focus'),
      'completed_tasks', coalesce((select jsonb_agg(to_jsonb(c) order by c.completed_at) from (select distinct on (task_key) task_key, title_snapshot, tag_snapshot, completed_at from public.task_completions where user_id = actor and work_date = d order by task_key, completed_at desc, task_version desc) c), '[]'::jsonb),
      'tags', coalesce((select jsonb_agg(jsonb_build_object('tag', a.tag_snapshot, 'minutes', a.minutes) order by a.minutes desc, a.tag_snapshot) from (select tag_snapshot, sum(duration_minutes) minutes from public.focus_sessions where user_id = actor and work_date = d and kind = 'focus' group by tag_snapshot) a), '[]'::jsonb)
    )
  ) into result;
  return result;
end;
$$;

create function private.save_standup(p_day date, p_version integer, p_yesterday text, p_today text, p_blockers text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.actor_lock(); p public.profiles; s public.standups; d date;
begin
  select * into p from public.profiles where id = actor;
  d := (clock_timestamp() at time zone p.timezone)::date;
  if p_day is distinct from d then return jsonb_build_object('error','DAY_CHANGED', 'message','Your workday changed. Your previous draft is protected on this device.'); end if;
  if p_version is null or p_yesterday is null or p_today is null or p_blockers is null then raise exception 'Standup fields and version are required.'; end if;
  if greatest(char_length(p_yesterday), char_length(p_today), char_length(p_blockers)) > 5000 then raise exception 'Each standup field must be at most 5,000 characters.'; end if;
  select * into s from public.standups where user_id = actor and work_date = d;
  if (found and s.version <> p_version) or (s.id is null and p_version <> 0) then
    return jsonb_build_object('error','CONFLICT', 'standup', to_jsonb(s));
  end if;
  if s.id is null then
    insert into public.standups(user_id, work_date, timezone_at_creation, yesterday_text, today_text, blockers_text) values (actor,d,p.timezone,p_yesterday,p_today,p_blockers) returning * into s;
  else
    update public.standups set yesterday_text = p_yesterday, today_text = p_today, blockers_text = p_blockers, version = version + 1, updated_at = clock_timestamp() where id = s.id returning * into s;
  end if;
  return jsonb_build_object('standup', to_jsonb(s));
end;
$$;

create function private.mutate_task(p_action text, p_id uuid, p_version integer, p_title text, p_tag text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.actor_lock(); t public.tasks; slot smallint; zone text; stamp timestamptz;
begin
  if p_id is null or p_version is null or p_action not in ('create','edit','complete','reopen','delete') or p_action is null then raise exception 'Invalid task action.'; end if;
  select timezone into zone from public.profiles where id = actor;
  select * into t from public.tasks where id = p_id and user_id = actor;
  if p_action = 'create' and t.id is not null then return private.workspace_snapshot(); end if;
  if p_action <> 'create' and (t.id is null or t.version <> p_version) then raise exception 'This task changed. Refresh and try again.' using errcode = '40001'; end if;
  if p_action in ('create','edit') and (p_title is null or char_length(btrim(p_title)) not between 1 and 240 or p_tag is null or char_length(btrim(p_tag)) not between 1 and 40) then raise exception 'Use a title of 1–240 characters and a tag of 1–40 characters.'; end if;
  if p_action in ('create','reopen') then
    select n::smallint into slot from generate_series(1,3) n where not exists (select 1 from public.tasks where user_id = actor and active_slot = n) order by n limit 1;
    if slot is null then raise exception 'Your three priorities are full. Finish or remove one first.'; end if;
  end if;
  stamp := clock_timestamp();
  if p_action = 'create' then
    insert into public.tasks(id,user_id,title,tag,active_slot) values (p_id,actor,btrim(p_title),btrim(p_tag),slot);
  elsif p_action = 'edit' then
    update public.tasks set title = btrim(p_title), tag = btrim(p_tag), version = version + 1, updated_at = stamp where id = t.id;
  elsif p_action = 'complete' and not t.is_completed then
    update public.tasks set is_completed = true, active_slot = null, completed_at = stamp, version = version + 1, updated_at = stamp where id = t.id returning * into t;
    insert into public.task_completions(user_id,task_id,task_key,task_version,title_snapshot,tag_snapshot,completed_at,work_date,timezone_at_completion) values (actor,t.id,t.id,t.version,t.title,t.tag,stamp,(stamp at time zone zone)::date,zone);
  elsif p_action = 'reopen' and t.is_completed then
    update public.tasks set is_completed = false, active_slot = slot, completed_at = null, version = version + 1, updated_at = stamp where id = t.id;
  elsif p_action = 'delete' then
    delete from public.tasks where id = t.id;
  end if;
  return private.workspace_snapshot();
end;
$$;

create function private.control_timer(p_action text, p_version integer, p_interval_id uuid, p_seconds integer, p_task_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.actor_lock(); t public.timer_states; task public.tasks; zone text; stamp timestamptz;
begin
  select * into t from public.timer_states where user_id = actor;
  -- Reconciliation precedes commands so an expired interval cannot be overwritten/canceled.
  perform private.reconcile(actor);
  if p_action = 'complete' then
    if t.interval_id is distinct from p_interval_id then raise exception 'The active interval changed. Refresh to continue.'; end if;
    if t.state = 'running' and t.ends_at > clock_timestamp() then raise exception 'This interval has not finished yet.'; end if;
    return private.workspace_snapshot();
  end if;
  select * into t from public.timer_states where user_id = actor;
  if p_action is null or p_action not in ('start','pause','resume','cancel') then raise exception 'Invalid timer action.'; end if;
  stamp := clock_timestamp();
  if t.state = 'running' and t.ends_at <= stamp then
    perform private.reconcile(actor);
    return private.workspace_snapshot();
  end if;
  if p_version is null or p_version <> t.version then raise exception 'The timer changed on another device. Refresh to continue.' using errcode = '40001'; end if;
  if p_action = 'start' then
    if t.state <> 'idle' then raise exception 'An interval is already active.'; end if;
    if p_interval_id is null or p_seconds is null or p_seconds not in (300,1500,3000) then raise exception 'Choose a supported interval.'; end if;
    if exists (select 1 from public.focus_sessions where id = p_interval_id) then raise exception 'This interval was already recorded.'; end if;
    select timezone into zone from public.profiles where id = actor;
    if p_task_id is not null then
      select * into task from public.tasks where id = p_task_id and user_id = actor and not is_completed;
      if not found then raise exception 'Choose one of your unfinished tasks.'; end if;
    end if;
    update public.timer_states set interval_id = p_interval_id, state = 'running', kind = case when p_seconds = 300 then 'break' else 'focus' end, duration_seconds = p_seconds, remaining_seconds = p_seconds, ends_at = stamp + make_interval(secs => p_seconds), task_id = task.id, task_title = task.title, tag_snapshot = coalesce(task.tag,'Unassigned'), timezone_at_start = zone, version = version + 1, updated_at = stamp where user_id = actor;
  elsif p_action = 'pause' and t.state = 'running' then
    update public.timer_states set state = 'paused', remaining_seconds = greatest(0,ceil(extract(epoch from (ends_at - stamp)))::integer), ends_at = null, version = version + 1, updated_at = stamp where user_id = actor;
  elsif p_action = 'resume' and t.state = 'paused' then
    update public.timer_states set state = 'running', ends_at = stamp + make_interval(secs => remaining_seconds), version = version + 1, updated_at = stamp where user_id = actor;
  elsif p_action = 'cancel' and t.state <> 'idle' then
    update public.timer_states set state = 'idle', ends_at = null, remaining_seconds = duration_seconds, version = version + 1, updated_at = stamp where user_id = actor;
  else
    raise exception 'This timer action is no longer available. Refresh to continue.';
  end if;
  return private.workspace_snapshot();
end;
$$;

create function private.update_profile(p_name text, p_timezone text, p_version integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.actor_lock(); p public.profiles;
begin
  perform private.reconcile(actor);
  select * into p from public.profiles where id = actor;
  if p_version is null or p_version <> p.version then raise exception 'Your profile changed. Refresh and try again.' using errcode = '40001'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 100 then raise exception 'Enter a name of 1–100 characters.'; end if;
  if p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then raise exception 'Choose a valid timezone.'; end if;
  if p_timezone <> p.timezone and exists (select 1 from public.timer_states where user_id = actor and state <> 'idle') then raise exception 'Finish or end your interval before changing timezone.'; end if;
  update public.profiles set full_name = btrim(p_name), timezone = p_timezone, onboarded = true, version = version + 1, updated_at = clock_timestamp() where id = actor;
  return private.workspace_snapshot();
end;
$$;

-- Exposed invoker wrappers; private transaction functions re-derive identity.
create function public.workspace_snapshot() returns jsonb language sql security invoker set search_path = '' as $$ select private.workspace_snapshot(); $$;
create function public.save_standup(p_day date, p_version integer, p_yesterday text, p_today text, p_blockers text) returns jsonb language sql security invoker set search_path = '' as $$ select private.save_standup(p_day,p_version,p_yesterday,p_today,p_blockers); $$;
create function public.mutate_task(p_action text, p_id uuid, p_version integer, p_title text, p_tag text) returns jsonb language sql security invoker set search_path = '' as $$ select private.mutate_task(p_action,p_id,p_version,p_title,p_tag); $$;
create function public.control_timer(p_action text, p_version integer, p_interval_id uuid, p_seconds integer, p_task_id uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.control_timer(p_action,p_version,p_interval_id,p_seconds,p_task_id); $$;
create function public.update_profile(p_name text, p_timezone text, p_version integer) returns jsonb language sql security invoker set search_path = '' as $$ select private.update_profile(p_name,p_timezone,p_version); $$;

revoke all on function private.workspace_snapshot(), private.save_standup(date,integer,text,text,text), private.mutate_task(text,uuid,integer,text,text), private.control_timer(text,integer,uuid,integer,uuid), private.update_profile(text,text,integer) from public, anon;
revoke all on function public.workspace_snapshot(), public.save_standup(date,integer,text,text,text), public.mutate_task(text,uuid,integer,text,text), public.control_timer(text,integer,uuid,integer,uuid), public.update_profile(text,text,integer) from public, anon;
grant execute on function private.workspace_snapshot(), private.save_standup(date,integer,text,text,text), private.mutate_task(text,uuid,integer,text,text), private.control_timer(text,integer,uuid,integer,uuid), private.update_profile(text,text,integer) to authenticated;
grant execute on function public.workspace_snapshot(), public.save_standup(date,integer,text,text,text), public.mutate_task(text,uuid,integer,text,text), public.control_timer(text,integer,uuid,integer,uuid), public.update_profile(text,text,integer) to authenticated;

-- Limit Realtime publication to owner-readable mutable state. No delete payloads
-- are required: reconnect/mutations always refetch canonical state.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.standups, public.tasks, public.timer_states, public.profiles;
  end if;
end $$;
commit;
