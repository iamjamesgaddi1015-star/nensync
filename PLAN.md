# NenSync implementation plan

Version 1.2 â€” 2026-11-04 â€” **APPROVED FOR LOCAL IMPLEMENTATION**

NenSync is a private daily-work workspace for remote workers: write a standup, choose up to three Must-Win tasks, run deliberate focus intervals, and copy an accurate end-of-day report. Multiple people can use the application, but each sees only their own records. Team membership and sharing are a later release.

**Approval:** the owner explicitly approved this plan with â€œapproved. let's proceed.â€ The local application, reviewed initial migration, generated types and verification suite are implemented. No hosted service activation, live migration or deployment was performed. This document retains the approved requirements; [VERIFICATION.md](VERIFICATION.md) records actual outcomes and limits. See [PROJECT-START.md](PROJECT-START.md) for separate approval gates.

Visual revision 1.1: the owner approved a dashboard setup, supplied reference-design.jpg, selected the four-color blue/mint palette and requested adaptive units. This supersedes conflicting initial visual constraints; feature/security decisions remain unchanged.

Revision 1.2 adds owner-requested night mode with Light / Dark / System preferences. The revised light mockup is approved; this amendment does not authorize application implementation.

## 1. Approved understanding

Approved feature amendment: [ALARM-PLAN.md](ALARM-PLAN.md) adds the requested completion chime and generic desktop notification while NenSync remains open. Understanding and scoped implementation approval are confirmed. This is the explicit exception to the original notification exclusion; other scope/security boundaries remain in force. Actual NS-14 evidence belongs in VERIFICATION.md.

| Decision               | Agreed behavior                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Name                   | NenSync                                                                                                                                          |
| Audience and ownership | Independent private accounts for WFH users; a user is the tenant in v1                                                                           |
| Stack                  | Next.js App Router, strict TypeScript, Tailwind, direct Supabase Auth/PostgreSQL/Realtime; official SDK, native generated database types, no ORM |
| Authentication         | Email/password, email verification, password recovery and automatic profile creation                                                             |
| Calendar               | Account timezone detected at onboarding, editable and shared across devices                                                                      |
| Standup                | One per local date; autosave with explicit save/error state; compile to Markdown/plain text                                                      |
| Timer                  | 50-minute deep work, 25-minute classic focus, 5-minute break; start/pause/resume; one shared timer per account                                   |
| Recovery               | Reconcile elapsed timers on return and record completion exactly once                                                                            |
| Task stack             | At most three unfinished tasks; carry unfinished work into later days                                                                            |
| Attribution            | Optionally associate a focus interval with a task; otherwise Unassigned; exclude breaks from focus totals                                        |
| Daily reporting        | Completion-day attribution, historical tag preservation and database aggregate totals                                                            |
| Disconnection          | Protect standup drafts locally; recover persisted timers; task changes require a connection                                                      |
| Conflicts              | Offer an explicit choice between conflicting standup drafts; no silent overwrite                                                                 |
| Design | Owner-approved light dashboard direction using supplied reference and #0b3d91 / #3ba7f2 / #7fe7d6 / #e8f6ff; custom primitives, fluid rem/%/fr sizing |
| Appearance | Light / Dark / System; System follows device appearance, with a remembered device preference and an accessible night palette |

The user selected A at each interview step and explicitly signed off on the resulting understanding. The decisions below make that understanding implementable and remain reviewable proposals until this plan is approved.

## 2. Scope, exclusions and success

Include account access, profile name/timezone, today's standup, task CRUD and completion/reopening, persistent focus/break state, private synchronization, daily metrics, EOD compilation and manual copying. Include a bounded completed-task list so users can inspect or reopen work without a separate history product. Account export and deletion preparation are release requirements described below, not an administration dashboard.

Exclude team discovery, invitations, roles, teammate summaries, payroll/productivity scoring, Slack/Teams/email sending, OAuth, magic-link login, custom interval lengths, automatic next intervals, notifications, calendar integrations, uploads, full offline editing, historical browsing, billing and native applications. Keep `avatar_url` nullable for schema compatibility; no avatar upload or arbitrary remote-image fetching in v1.

English-first web UI is proposed; no location, employment relationship or legal jurisdiction is inferred from timezone. No delivery deadline, hosted service tier, region or spending limit has been approved. Local planning incurs no new service activation; paid expenditure authorized by this plan is **none**.

Acceptance means the complete daily loop works for two isolated synthetic accounts, concurrent clients cannot violate task/timer constraints, recoverable failures preserve the correct state, and critical journeys meet the accessibility checks in section 10. Scalability remains an engineering target to measure, not a current certification.

## 3. User journeys

1. **Join and return:** sign up, verify email, sign in, set display name and confirm detected timezone. Invalid/expired links explain how to request another. Recovery permits a new password through the supported Auth flow. A failed profile trigger produces an actionable onboarding failure rather than an empty workspace.
2. **Write the morning update:** enter Yesterday, Today and Blockers. Autosave after a proposed 800 ms idle period, also flushing when appropriate on blur. Display Saving, Saved, Protected on this device, Conflict or Retry. Compile locally into a preview; copying does not publish or message anyone. Blank blockers compile as â€œNone reportedâ€; blank Yesterday/Today appear as â€œNot provided,â€ never invented work.
3. **Choose the work:** add title and optional tag to one of three numbered positions. Completing releases a position; reopening requires available capacity. At capacity, explain which work must first be completed or removed. Deletes require confirmation; removing a task does not erase historical completion/focus facts.
4. **Focus:** select a preset and optionally a task, then start. Pause/resume changes the shared server state. Switching presets or abandoning an active interval requires explicit cancellation confirmation. No interval starts automatically. A break is visible as a break and never increases focus hours.
5. **Switch devices or reconnect:** load canonical timer state and recover elapsed completion once. An offline running timer may continue its local display, marked unconfirmed; starting/pausing/resuming requires server acknowledgment. Resynchronize on return, auth refresh and connection recovery.
6. **Sign off:** reconcile expired timer state, fetch the current-day aggregate, preview EOD and copy Markdown or plain text. Empty days remain honest zero states. Do not label an outdated or failed aggregate as live; retain a selectable last-known preview with a visible timestamp. Clipboard failure offers manual selection.

## 4. Composition and interaction design

NenSync is a **task-focused personal dashboard**, explicitly permitted by the owner for this project. [DESIGN.md](DESIGN.md) revision 3 records the approved light reference, matching night treatment, palette and three composition alternatives. The request authorizes these planning amendments, not full application implementation.

- Use the reference's light rounded white workspace, ice-blue surroundings, pill-shaped top section navigation and airy panels. A compact date/greeting replaces the large slogan.
- Wide containers start with flexible 7:8:5 tracks after gaps: standup left, navy focus card and tasks center, daily summary/EOD right. Rebalance for content, then use two columns or one reading flow as space decreases. No fixed percentage-plus-gap overflow.
- Apply #0b3d91 for ink/primary actions, #3ba7f2 for restrained graphic accents, #7fe7d6 for quiet selected/positive fill, and #e8f6ff for canvas/tints; white and accessible neutral text/error tokens may supplement. Do not place normal white body text on sky blue.
- Use rem for type/spacing/controls, % and fr for layout, ch for readable measure, bounded clamp()/container sizing and content-aware wrapping. Start near 48rem/80rem breakpoints and adjust after fit tests. Avoid authored px dimensions where possible; pc is an absolute print unit and is not the responsive substitute. Root text respects browser settings.
- Header contains NenSync, real section links, local date/timezone, sync status and account access. No left sidebar, invented navigation destinations or decorative medical charts. Daily metrics come from existing aggregates, not new analytics features.
- Preserve visible form labels, save/error context, keyboard-accessible conflict choices, tabular countdown digits and a linear progress bar. No circular countdown or per-second announcements.

Settings is a small focused route for profile, timezone and account lifecycle. Auth/callback/recovery routes surround a single signed-in work surface; â€œsingle-pageâ€ describes the daily workspace, not removal of secure auth routes.

### Light, dark and system appearance

Provide a clearly labeled Light / Dark / System control in account/settings, reachable from the header and authentication screens. System is the initial preference: use the device appearance and react to changes while selected. Explicit Light or Dark overrides system changes. Remember this non-sensitive preference per browser/device across reloads and sign-in/out; cross-device account synchronization is outside this requirement and needs no profile schema change.

Keep the approved light composition. Dark mode uses deep navy canvas/surfaces, ice-colored text and sky/mint accents through shared semantic tokens; it is not a return to the rejected heavy dark-card design or emerald palette. Validate each foreground/background pairing independently, including controls, errors, inputs, selected states, progress and disabled/read-only treatment.

Render the chosen appearance on first paint without a light flash during dark mode or hydration mismatch. An allowlisted preference cookie can inform the server-rendered root; System resolves through CSS prefers-color-scheme before client JavaScript. Use the corresponding color-scheme for native controls. Invalid/missing preference falls back to System; blocked persistence still permits a session-local choice. No arbitrary script or content enters the theme attribute.

Switch appearance without navigation, page reload, lost draft text, focus movement or a timer restart. Honor reduced motion; a theme change needs no animation. All auth, workspace, account, loading, empty, error and conflict surfaces must support both modes with the same fluid rem/%/fr layout.

## 5. Architecture and boundaries

**Proposed ADR-001:** Next.js renders the shell and authenticated entry; small client feature modules own editing, timer display and Realtime subscriptions. Supabase owns identity and durable data. Use `@supabase/supabase-js` plus the official `@supabase/ssr` cookie integration, with generated `Database` types. Do not add Spring Boot, Prisma, a generic API server or an independent authentication system. The user's explicit stack request is the exception to the category backend default.

Use request-scoped server clients and one browser client per authenticated provider. Follow supported cookie refresh and verification patterns; do not trust unverified session objects for server authorization. No private user payload goes into shared static caches. RLS/transaction checks remain the authority even if route protection fails. See the official [Supabase SSR client guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

Data flow: user input -> typed boundary validation -> authenticated SDK/RPC -> ownership and transactional checks -> PostgreSQL -> owner-scoped read/realtime invalidation -> local view and copy preview. Copying transfers text only when the user chooses a destination; NenSync has no messaging integration.

Reads use explicit columns and ownership filters plus RLS. Simple profile fields use restricted updates; business mutations use narrow RPCs to prevent bypassing invariants. Prefer invoker functions; where privileged writes are necessary, use private-schema definer functions with empty/fixed safe search paths, fully qualified objects, verified `auth.uid()` and tightly restricted execution grants. Public wrappers expose only reviewed operations. Never accept an authoritative owner ID from the caller. [Supabase function guidance](https://supabase.com/docs/guides/database/functions) informs the grant/search-path review.

No service-role key is needed for normal application use. A future account-deletion endpoint is a narrowly scoped server-only exception: verify the current identity and recent authentication, reject caller-supplied target IDs, bound retries and never log credentials. Privileged setup is performed through an approved secure mechanism; agents do not read key values.

Exact package versions will be checked and pinned with a lockfile at approved implementation kickoff. Do not copy sibling-project versions or use moving `latest` ranges as the final record. Select a currently patched Next.js/React pair and compatible SDK/SSR/Tailwind versions; inspect installed Next.js guidance before writing code. Review [maintainer advisories](https://github.com/vercel/next.js/security/advisories) at selection and release. The [October 14 security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026) establishes a patch floor for that advisory, not a guarantee against subsequent findings.

## 6. Relational model and invariants

This approved schema contract is implemented by supabase/migrations/202611040001_workspace.sql and exercised in an isolated local PostgreSQL runtime. It has not been applied to a hosted target. All application tables have RLS enabled, deny anonymous access, scope reads to `auth.uid()` and constrain mutation grants. User-owned foreign keys cascade from the account/profile. Public profile visibility is deliberately excluded. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) is the implementation reference.

| Table              | Proposed fields and constraints beyond the original sketch                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`         | `id` references Auth user; bounded `full_name`, nullable unused `avatar_url`, validated IANA `timezone`, `version`, timestamps; automatic signup trigger sets minimal safe defaults                                                           |
| `standups`         | UUID, owner, `work_date`, `timezone_at_creation`, three bounded text fields, `version`, created/updated timestamps; unique `(user_id, work_date)`                                                                                             |
| `tasks`            | UUID default, owner, bounded title/tag, completion flag and `completed_at`, `active_slot`, version, timestamps; unfinished rows require slot 1â€“3; completed rows have no active slot; unique active slot per owner                            |
| `task_completions` | Append-only UUID event, owner/task reference, completion time/date/timezone, title/tag snapshots, task version; unique transition `(task_id, task_version)`; history survives task deletion with nullable source link                         |
| `timer_states`     | One row per owner; interval UUID, focus/break kind, preset seconds, running/paused/idle state, remaining seconds, resume/end timestamps, optional task, attribution snapshots, version and updated timestamp                                  |
| `focus_sessions`   | Immutable completed interval UUID, owner, focus/break kind, preset duration, effective completion timestamp, reconciliation timestamp, saved work date/timezone, optional task and tag snapshot; unique interval ID prevents duplicate credit |

Use actual `timestamptz` timestamps for creation. Replace the original misleading `standups.created_at DATE DEFAULT current_date` with explicit `work_date`; database/server UTC defaults cannot represent every user's local workday. Generate UUID defaults consistently for tasks and sessions as well as standups. Duration checks allow only agreed presets and matching kinds. Database constraints, not TypeScript alone, enforce nonempty bounded titles, valid slot/state combinations and foreign ownership.

Proposed bounds: names 100 characters; task titles 240; tags 40; each standup field 5,000. These are reviewable application limits, enforced in DB and UI. Default task tags are suggestions, not a new taxonomy service.

### Task mutations and history

Serialize task-changing transactions using a per-user profile lock. Allocate an available slot and commit under that lock; the unique slot/range constraints form an additional safety net. Reopening follows the same path. A task UUID plus expected version makes create/retry and state transitions deterministic; no client can directly write completion events or timestamps. Changing owner IDs is forbidden.

Each actual incomplete-to-complete transition appends one event. Reopening removes the current completed flag/date but preserves prior events. For EOD, count distinct task IDs completed that day and display the latest completion snapshot for each; completing/reopening/recompleting on the same day does not inflate task count. Completion on another day is that day's work event. Label reports â€œCompleted today,â€ and show a reopened indicator if currently active. Deleting a task preserves prior event snapshots until account deletion.

### Timer state machine and durable completion

Use `idle -> running <-> paused -> completed/idle`, with cancellation returning to idle without credit. A new interval receives a new UUID. Starting a different interval never overwrites an unreconciled expired interval: reconcile first under the same per-user lock. Lock acquisition, version comparison, clock evaluation and completion insertion occur transactionally.

While running, display time from the persisted end timestamp and a refreshed server clock offset, rather than decrementing a counter as truth. Pause calculates remaining seconds from server time. Resume derives a new end timestamp. Stale commands fail with canonical state for refetch; repeating an already committed completion returns the same result. The database rejects early completion and client-forged durations. A completion insert and timer-state transition succeed or fail together.

When the tab is closed, no browser code executes. On the next authenticated return or related mutation, the server reconciles an elapsed interval. Store its effective completion at the saved deadline, with a separate `recorded_at` for reconciliation time. Credit only one interval; do not invent cycles during an unattended night. Breaks may be recorded for state continuity but are filtered out of focus totals. Preset duration is credited only when complete; canceled/partial sessions earn no focus minutes in v1. This measures scheduled intervals, not verified attention.

Capture task/tag and timezone context when starting an interval and keep it stable through pause/resume. Task deletion does not erase attribution snapshots. Prevent timezone changes while an interval is active unless it is canceled or reconciled first. This resolves otherwise ambiguous mid-session day reassignment.

### Workdays and timezone changes

Validate timezone names against PostgreSQL-supported IANA names. The server computes daily context; do not trust a client date as the current workday. Store dates/timezone snapshots on standups and completion events so changing timezone does not relabel history. Subsequent standups and newly started/completed work use the updated timezone; an already-created standup retains its date/context. Revisiting a date with an existing standup edits that row, never creates a duplicate.

An interval crossing midnight belongs entirely to its effective completion day, as agreed. Never split it into invented partial sessions. Test daylight-saving transitions with calendar date conversion rather than a hard-coded 24-hour subtraction. At midnight, retain the prior draft under its original date, explain the day change and load today's entry separately; never silently move text to a new date.

### Aggregates and indexes

An authenticated daily summary function reconciles expired timer state, then returns completed-task snapshots, focus interval count, total minutes and tag-minute totals for the requested accessible day. The UI derives hours from minutes and renders EOD deterministically; no AI summary generation. Default requests use server-derived current day. Do not aggregate from just the loaded task list or browser state.

Propose `(user_id, work_date)` on standups, `(user_id, active_slot)` uniqueness on tasks, `(user_id, work_date, completed_at)` for completion/focus reads, and appropriate same-owner composite keys for linked records. Inspect plans with representative synthetic histories before adding further indexes. Realtime filters and query filters improve efficiency but do not replace RLS.

## 7. Autosave, synchronization and failure contracts

- Standup writes supply the version last read. An existing newer version returns a conflict with canonical state. An initial insert races safely against unique owner/date. Choosing local text requires a new explicit write against the latest version; choosing remote preserves a local recovery copy until acknowledged. Do not endlessly retry conflicts.
- Store only unsaved standup text locally, keyed by account and work date, with version/time metadata. Proposed expiry is seven days. Clear acknowledged draft buffers and all account buffers on logout/account deletion; never show another account's buffers. Explain local-device storage. Storage denial/quota errors downgrade to a visible unsaved warning and copy option.
- On account switching or auth expiry, cancel writes, unsubscribe, clear private memory and separate draft recovery by authenticated identity. Never replay a former user's pending mutation as the new user.
- Realtime announces owner-scoped persisted changes for refetch; it is not a second state authority or an event-delivery guarantee. Subscribe only to required tables, clean up on logout, resubscribe on reconnect and refetch canonical state on visibility changes. Recompute the summary after relevant writes.
- Proposed request timeout is 10 seconds. Retry transient reads/completion reconciliation at most twice with backoff/jitter; writes require an idempotent identity or explicit retry. Ambiguous task responses refetch by ID/version before retry. Never restart an interval because its completion response timed out.
- A disconnected countdown is advisory; offline pause/start/resume and task edits explain that a connection is required. Unsaved standup text can still compile, but is marked locally protected rather than server-saved. EOD excludes unconfirmed work.
- Timer UI updates once per second without database heartbeats. Screen readers hear start/pause/completion status, not every tick. Auth expiry preserves eligible local drafts while requiring sign-in before database access resumes.

Supabase documents authorization cost and ordering constraints for [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). Start with bounded owner subscriptions and benchmark; do not promise unlimited scale. A future Broadcast change requires its own private-channel authorization design and measurement.

## 8. Proposed source organization

The structure below records the approved architectural proposal. Implementation now exists; README.md and the actual source tree describe the delivered organization.

```text
nensync/
  src/
    app/
      (auth)/                 # sign-in, sign-up, recovery
      auth/                   # confirmation/callback handlers
      (workspace)/            # daily page and settings
      api/account/            # verified export/deletion boundary if required
      layout.tsx
      globals.css
    components/primitives/    # owned native-semantic controls
    features/
      auth/
      standup/
      tasks/
      focus/
      sign-off/
      account/
    lib/
      supabase/               # browser/server clients and generated types
      validation/
      time/
      reports/
  supabase/
    migrations/               # reviewed ordered SQL, grants, RLS and RPCs
    tests/                    # synthetic isolation/concurrency checks
  tests/                      # domain and browser acceptance
  scripts/                    # scoped build/check/evidence helpers
```

Keep domain logic independent of rendering. Explicit utility classes and semantic Tailwind tokens supply styling; no Radix, shadcn, generic admin kit, chart library or animation runtime is required. Native HTML controls can back custom primitives. Account lifecycle endpoints remain exceptional boundaries, not a general REST layer.

## 9. Delivery stages and owners

| Stage                        | Owner                               | Depends on                 | Work and exit evidence                                                                                                                                         |
| ---------------------------- | ----------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0: planning                 | Codex coordinator/product/architect | Understanding sign-off     | This packet, council, security/privacy/service records; owner approves plan and concrete design                                                                |
| P1: foundation               | Engineering                         | P0 approval                | Resolve/pin compatible patched versions; minimal Next.js setup; synthetic-only fixtures; build/type/lint/format scripts and configured audit paths             |
| P2: database contracts       | Engineering, security reviewer      | P1                         | Ordered SQL for schema, profile trigger, RLS/grants, narrow mutations, task slots, timer transactions and aggregate; real PostgreSQL isolation/race tests pass |
| P3: identity                 | Engineering                         | P2                         | Auth forms, verified entry, onboarding timezone, session refresh, reset/expired-link flows; local Auth evidence, explicit hosted mail gap                      |
| P4: daily records            | Engineering/product                 | P3                         | Standup autosave/conflicts/local recovery; task stack and event history; capacity and midnight tests                                                           |
| P5: focus and reporting      | Engineering                         | P4                         | Cross-device timer state, completion reconciliation, tag aggregation and EOD copying; race/retry/clock tests                                                   |
| P6: responsive integration   | Engineering/UX                      | Approved DESIGN plus P4/P5 | Complete dashboard, fluid phone/tablet layouts, Light/Dark/System appearance and all states; inspect both modes and critical journeys |
| P7: independent verification | Separate QA and security reviewers  | Candidate after P6         | Requirement-mapped browser/DB checks, privacy review, bounded load evidence, fixes and final re-review                                                         |
| P8: release proposal         | Release/reliability + owner         | P7 and operational inputs  | Hosting/mail/region/cost/recovery proposal, scoped migration and rollback, GO/NO-GO recommendation; deployment only with separate authorization                |

The owner approved implementation; P1 onward have been implemented locally. No fixed completion dates are invented. Stages are acceptance boundaries, not promises of effort or a permanent agent team. [TASKS.md](TASKS.md) is the live handoff backlog.

## 10. Requirements and acceptance checks

The table below defines acceptance requirements. Actual executed results are tracked in VERIFICATION.md; hosted and hardware-dependent checks remain OPEN until performed.

| Requirement / test group | Positive acceptance                                                                           | Negative/recovery acceptance                                                                                                                      | Owner            |
| ------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| NS-01 / AUTH             | Signup creates one private profile; verification/login/reset/logout work                      | Expired/single-use links, invalid login, failed trigger, unsafe redirect and auth expiry recover without identity leaks                           | QA/security      |
| NS-02 / ISOLATION        | Two accounts can separately use all records                                                   | Anonymous/other-user reads, writes, RPC calls, linked task IDs and Realtime subscriptions expose no foreign content                               | Security         |
| NS-03 / DAY              | Account timezone drives standup/report dates                                                  | UTC boundary, DST, timezone edits, existing date collisions and midnight draft preservation                                                       | QA               |
| NS-04 / STANDUP          | Autosave, reload, compile and copy preserve text                                              | Simultaneous drafts, insert race, storage failure, session switch, timeout and offline retry never silently overwrite                             | QA               |
| NS-05 / TASK             | Add/edit/complete/reopen/delete and carryover work                                            | Parallel requests cannot create four unfinished tasks; direct table writes cannot bypass capacity; stale versions fail safely                     | QA/security      |
| NS-06 / TIMER            | Presets, pause/resume and one shared state behave across clients                              | Simultaneous start, stale pause, early completion, forged duration, closed tab, clock skew and repeated reconciliation produce at most one credit | QA/security      |
| NS-07 / ATTRIBUTION      | Task/tag snapshots persist; unassigned is explicit                                            | Deleting/editing a task cannot rewrite past totals; breaks/partial/canceled intervals add zero focus minutes                                      | QA               |
| NS-08 / EOD              | Database totals match completed-event facts; reports copy in two formats                      | Same-day recompletion does not inflate task count; stale/failed loads are labeled; clipboard denial offers selectable text                        | QA               |
| NS-09 / UX               | Full daily and auth loop works by keyboard and at phone/tablet/desktop widths                 | Long text, zero/huge counts, zoom, contrast, reduced motion, focus handling and offline states remain usable                                      | UX/QA            |
| NS-10 / LIFECYCLE        | Export contains only owner data; verified deletion clears owned live records and local drafts | Unauthenticated/cross-user/CSRF/replayed destructive requests denied; backup residual retention disclosed                                         | Security/release |
| NS-11 / CAPACITY         | Synthetic workload and indexed queries meet approved targets                                  | Reconnect bursts, slow dependencies, subscriber growth and bounded retries do not cause unbounded requests                                        | QA/reliability   |

Testing layers: pure time/report tests; transaction and policy tests against real isolated PostgreSQL/Supabase Auth; browser acceptance with synthetic accounts; separate mocked/disconnected UI checks; manual keyboard, screen-reader, contrast and screenshot review. A mocked client or in-memory DB cannot certify Auth/RLS/Realtime behavior. No live user/customer/employer data is used.

**NS-12 / APPEARANCE â€” owner/acceptance: UX and QA.** Verify Light and Dark selection, System following live OS changes, explicit overrides, remembered choice on reload, first-paint behavior, invalid/blocked preference recovery and accessible keyboard selection. Changing mode must preserve drafts, active countdown state and focus. Inspect all critical journeys/states in both modes at phone/tablet/desktop widths, including zoom/reflow and reduced motion. Current implementation and acceptance evidence is recorded in VERIFICATION.md; unavailable checks remain OPEN.

**NS-13 / INTERACTIONS â€” owner/acceptance: engineering and independent QA.** Inventory every rendered button, link, form action and setting, then exercise its intended outcome by pointer/touch and keyboard. Cover section navigation, account/settings/sign-out, auth/recovery links, standup compile/copy/conflict/retry, task add/edit/complete/reopen/delete, timer preset/start/pause/resume/end, EOD copy/manual fallback and appearance selection. No placeholder destinations, dead controls, success without persistence, or controls omitted from mobile layouts. A disabled action explains its prerequisite and uses correct semantics. Verify pending, error, repeated-click and recovery behavior; redirects/back navigation must remain valid. Run acceptance across supported viewport sizes and both themes; record actual results rather than treating a visual mockup as functional proof.

Responsive acceptance requires all actions reachable without horizontal page scrolling, clipped content or overlapping controls at the planned phone/tablet/desktop widths, enlarged fonts, zoom and landscape. Screenshots establish appearance; browser interaction tests establish behavior. Actual-phone checks remain required before claiming mobile acceptance.

Proposed accessibility target is WCAG 2.2 AA, with manual and automated evidence. Test 20rem/24.375rem phone, 48rem tablet and 90rem desktop widths with default/enlarged root text; 200% zoom and narrow reflow (including the WCAG 320 CSS pixel reference); current stable Chromium/Firefox/WebKit plus actual phone testing before claiming mobile acceptance. Capture sign-in, recovery and conflict/error states as well as the workspace. Aim for 2.75rem interactive targets, verifying actual rendered WCAG target sizes and visible 3:1 control/focus contrast; body text at least 4.5:1. Automated scans alone do not establish conformance.

Proposed performance acceptance for owner review: UI input feedback within 100 ms; canonical mutation/summary p95 below 750 ms in-region under 50 simultaneously active synthetic accounts, each with up to two clients, 365 standups and 10,000 task/focus events. Declare hardware, network, database tier and sample count with results; this is a bounded pilot target, not a forecast. Avoid per-tick writes and whole-history reads. Availability/window, RPO, RTO, production account ceiling and cost bounds are **UNRESOLVED â€” owner/release inputs required before hosted release**, not assumed targets.

Actual npm/SQL commands must come from the created package/configuration at P1/P2. None exist yet. Required check categories are format, typecheck, lint, domain tests, DB/policy/concurrency tests, production build, browser acceptance and dependency/secret review. Store temporary files, browser profiles and generated reports under `audits/nensync/`, with tool outputs explicitly configured before execution. No test run should silently write to sibling projects or use production.

## 11. Security, privacy and lifecycle

See [SECURITY-PRIVACY.md](SECURITY-PRIVACY.md) for the threat/data inventory and [SERVICES.md](SERVICES.md) for external boundaries. Every application control is proposed, not verified. Pin the review checklist to [OWASP ASVS 5.0.0](https://asvs.owasp.org/) with applicable requirement IDs selected by the security reviewer before dependent implementation; do not claim blanket ASVS compliance.

Treat standups/task titles as private free text that may accidentally contain sensitive work information. Collect only needed fields; warn against entering confidential employer/customer material. Do not capture content in logs, URLs, exception payloads, analytics or audit screenshots. Render text as text; no HTML/Markdown execution, remote avatar loads, uploads, AI processing or arbitrary outbound fetches.

Proposed retention: account records remain until owner deletion; unsaved local draft buffers expire after seven days or acknowledgment/logout. Export is an authenticated download, not emailed or placed in a public bucket. Account deletion requires recent authentication and a verified server-side action; cascade owned live records and revoke sessions, with provider backup expiry documented. Backup retention/region and processor deletion limitations must be confirmed for the chosen environment before promising deletion completion. No custom retention cron or external telemetry is introduced in v1.

## 12. Services, costs and operational readiness

Supabase is requested but no project, region or tier is selected. Hosting and production SMTP are unselected. The current [Supabase pricing page](https://supabase.com/pricing) lists a free tier and paid Pro starting at USD 25/month; this is reference pricing, not approved spend or a total operating-cost quote. Paid resources, trials, add-ons, renewals and overages require a concrete owner-approved budget. [Cost controls](https://supabase.com/docs/guides/platform/cost-control) do not replace checking every billable item's exposure.

Verification and password recovery depend on actual mail delivery. Supabase's [SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp) describes default-delivery restrictions; approved production SMTP and tested redirects/delivery are release gates. Local mail capture may validate flows but does not prove public delivery.

Service activation, remote migrations, mail setup, deployment and hosted load testing are not authorized here. Prepare a proposal naming environment/account aliases without secrets, region, permissions, recipients, pricing, quotas, cost stop, artifact, migration preflight and permitted recovery. A GO verdict still requires the owner's deployment authorization.

CI is planned after the repository boundary is chosen: in this monorepo a workflow must live at workspace-root `.github/workflows` with NenSync path filters, working directory, lockfile cache path and audit destinations. A nested app workflow is only a template. Do not modify repository-wide CI or unrelated projects under this planning task. CI should use synthetic isolated services, have no production secrets and never auto-deploy from this plan.

Proposed release/recovery sequence: inspect selected target's existing schema and backup capability; validate non-destructive ordered migrations in isolation; demonstrate synthetic export/delete and restore; obtain candidate-bound QA/security review; present exact deployment actions/cost/recovery; after separate approval deploy and verify target auth, assets, policies, mail and timer recovery. Prefer additive forward fixes and a compatible prior application build; never propose deleting production tables as rollback.

## 13. Risks and remaining gates

| Risk/open input                               | Mitigation or decision needed                                                    | Gate / owner                       |
| --------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| Timer records unattended time                 | Label scheduled intervals honestly; recover one only; cancellation available     | Plan review / product              |
| Original schema lacks concurrency/history     | Extra state/events, transaction locks, restrictive grants and real race tests    | P2 / architect/security            |
| Local draft exposure                          | Minimize, namespace, expire, clear and disclose; no cross-account restoration    | P4 / security                      |
| Production email unavailable                  | Select approved SMTP; test verification/reset end to end                         | Release / owner                    |
| Unknown production scale and service budget   | Approve account/concurrency limits, quotas and bounded load plan                 | Hosted release / owner             |
| Unknown hosting/region/backup objectives      | Choose provider/region; agree SLO/RPO/RTO and prove restore                      | Hosted release / reliability/owner |
| Account lifecycle needs privileged capability | Narrow server-only endpoint, recent auth, scoped secret setup and negative tests | P7/release / security              |
| Dependency/advisory drift                     | Pin after current maintainer review; triage again against final artifact         | P1 and release / engineering       |
| Hosted release not authorized                 | Owner reviews exact environment, cost and migration/recovery proposal             | External release / owner           |

The owner's approval authorizes bounded local implementation and the approved design. Service spending and deployment remain separate. Material changes to team access, data recipients, offline guarantees or core invariants require a scoped review. No additional feature interview is needed for routine implementation of approved decisions.

## 14. Supporting records and research

- [Startup and approval gates](PROJECT-START.md)
- [Full simulated council](COUNCIL-REVIEW.md)
- [Concrete design proposal](DESIGN.md)
- [Threat model and data inventory](SECURITY-PRIVACY.md)
- [Service admission register](SERVICES.md)
- [Owned backlog and verification status](TASKS.md)

Public sources checked 2026-11-04: official Supabase documentation linked above; Next.js maintainer advisories; OWASP ASVS. Reviewed the official [Next.js user-management example](https://github.com/supabase/supabase/tree/master/examples/user-management/nextjs-user-management) for integration shape, not as a UI template or source of public-profile policy. Its upstream [repository license](https://github.com/supabase/supabase/blob/master/LICENSE) is Apache-2.0; copied files, if any, need applicable notices and per-file/dependency review. No source was copied or installed. Package-level licenses and current lockfile vulnerabilities remain P1/P7 checks; public example review is not an app audit.
