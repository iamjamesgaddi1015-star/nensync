# NenSync delivery record

## Current delivery status (resumed 2026-11-04)

CURRENT OUTCOME: after the Gmail port/app-password corrections, the owner explicitly confirmed, "Now, it is working." The signup/email incident is resolved by owner report; the agent did not independently inspect live credentials/configuration or certify all hosted features. PLAN.md section 15 now records the database migration, exact Vercel variable names, URLs/templates, final Gmail setup, error sequence and corrections. Historical OPEN/pending-retest entries below are superseded by this confirmation. Password reset, account deletion, multi-user isolation/Realtime and broader operations remain separate checks.

LATEST CONFIRMED LIVE DIAGNOSIS: Gmail SMTP returns 535 / 5.7.8 BadCredentials. The connection reaches Gmail, which rejects the SMTP login. Next owner action: create/use a Google app password for the same account as the full SMTP username, match the sender address, save in Supabase and perform one controlled verification test. Google 2-Step Verification is required; normal Gmail password is unsuitable for this SMTP setup. No credential values were supplied/inspected. No further application code change is indicated. Successful signup/email remains UNVERIFIED until owner retest; older diagnostic steps below are historical.

LIVE SIGNUP INCIDENT OPEN: after the timeout repair, the owner now reports seeing the new connection-ended feedback after waiting. This suggests the updated feedback reached their deployment; the exact deployed artifact and backend state are not independently verified. Longer client time did not establish successful signup. Await sanitized Supabase Auth error code/message for the matching request, corresponding provider email status and account-presence metadata. Do not keep increasing timeouts or automatically repeat signup. No new source/service/database mutation was made for this latest report. Prior local passing checks remain local evidence only.

Latest evidence: owner supplied Supabase Auth log metadata for 2026-11-04 20:26:58: POST /signup, HTTP 504, `context deadline exceeded`. The request reached Auth and timed out server-side. Owner clarified that SMTP is Gmail, not Resend: smtp.gmail.com, port 586, personal account credentials (no actual email/password values supplied or inspected). Google/Supabase document ports 465 or 587. A configuration error is identified; instruct the owner to change 586 to 587 and use a Google app password with 2-Step Verification, matching sender/username. Successful signup/delivery remains UNVERIFIED until the owner retests. No further source or cloud mutation is indicated yet.

Subsequent owner report after the SMTP correction: `unexpected_failure` / `Error sending confirmation email`. This identifies a verification-email failure but not the underlying SMTP/network/authentication cause. Requested only the detailed sanitized Auth-log error/SMTP number for the matching attempt. Reconfirm app-password use and matching Gmail sender/username; do not assume the connection or authentication succeeded, change application code again, or mark signup resolved without the detailed result.

Current support fix READY LOCALLY, NOT DEPLOYED: owner reported live signup `weak_password` requiring 43 characters, then generic failure with an empty canceled response at about 10 seconds. Reproduced the old 10-second client cutoff with a synthetic local 12-second signup response. Source now allows 30 seconds only for email-auth endpoints, retains workspace deadlines and caller cancellation, and shows safe corrective signup feedback. Independent reviewer /root/signup_review found an explicit-null signal edge; reproduced, fixed and re-reviewed. Final 21 domain/database/transport/error cases, full lint, production build/TypeScript, formatting and 3 focused auth/form/origin browser regressions PASS. Same-origin test now derives the original request origin rather than hardcoding port 3210, preserving its assertion on the isolated 3211 fixture. No live signup/SMTP call, deployment, user creation or remote setting change has been performed by the agent. Next: deploy this source through the owner's approved Vercel process, inspect account/email state before retrying, then capture the real Auth error code if the backend still fails. SMTP health remains UNVERIFIED.

Alarm amendment COMPLETE: owner selected chime plus desktop notification with open/background-tab scope, then explicitly approved implement/test (A). [ALARM-PLAN.md](ALARM-PLAN.md) is implemented and independently reviewed. Complete final suite: 26 browser tests and 14 domain/database tests PASS; production build, typecheck, lint, format and design inspector PASS. QA caught AQ-01 (two-tab missed alert); fixed and unchanged regressions re-passed. Native Edge audio/notification API smoke PASS; audibility/OS delivery remains a separate manual check. Team visibility remains deferred.

The owner approved PLAN.md v1.2 and the UI, then requested a checkpoint at the credit limit and requested continuation. The app, local demo, Supabase integration source, migration, approved NS-14 alarm amendment and tests are implemented. Final local candidate checks PASS: production build, types/lint/format, 14 domain/database tests and all 26 browser tests. Independent QA/security rechecks are complete within their recorded scope. Local preview GO; live integration and deployment remain unapproved. Earlier planning entries below are historical and do not reopen completed approvals.

Resume from [RESUME.md](RESUME.md). Actual checks belong in [VERIFICATION.md](VERIFICATION.md); operational gates belong in [RELEASE-REVIEW.md](RELEASE-REVIEW.md).

| Stage | Current state |
| --- | --- |
| P0 approval | COMPLETE: understanding, council, plan and UI approved separately |
| P1 foundation | IMPLEMENTED: pinned toolchain, launcher and check commands |
| P2 data/security | IMPLEMENTED; local PostgreSQL/RLS tests pass; hosted and multi-connection checks OPEN |
| P3 identity/profile | IMPLEMENTED; actual provider/email lifecycle acceptance OPEN |
| P4 standup/tasks | IMPLEMENTED; demo acceptance and database contracts tested |
| P5 timer/EOD | IMPLEMENTED; lifecycle, recovery and duplicate-credit tests pass |
| P6 responsive UI | IMPLEMENTED: Light/Dark/System; six desktop/tablet/phone captures inspected, inspector exit 0 |
| P7 independent review | COMPLETE for local scope; final QA/security reports and source hashes in audit evidence |
| P8 operations/release | Local preview GO; public release NO-GO pending environment/operational checks |

Final correction: auth callbacks now use fixed relative redirects to preserve the browser origin. The complete rebuilt-app suite passed after this fix and asynchronous task/cache-directive test corrections. No source acceptance criteria were relaxed. The production preview was left running at http://127.0.0.1:3210/demo for owner review; restart with `npm start` if the session has ended. No credentials were read, hosted changes applied or commit made.

## Historical planning record

2026-11-04. Candidate: planning packet v1.2. Current UI direction approved, including planned night mode. Owner requires responsive layouts and working buttons/links; NS-13 records explicit interaction acceptance. Overall implementation plan remains for review. Application implementation is NOT STARTED.

Latest handoff: record UI approval separately from full implementation approval. Test every rendered control and destination, plus responsive reachability in both themes, before claiming completion. These are planned checks; no functional app exists yet. Documentation update only; no external actions taken.

## Durable decisions and gates

- Name is NenSync. Private accounts first; no team sharing.
- Understanding explicitly signed off after interview. User requested completion of remaining planning while away.
- Five simulated advisor perspectives recorded; verdict PROCEED to planning. They are not independent reviewers.
- PLAN.md v1.1 and supporting startup/design/privacy/service records prepared. Initial plan/design approval PENDING.
- No dependencies installed, cloud resources accessed/created, SQL executed, external messages sent or production settings changed.

## Owned backlog

| ID | Owner | Deliverable / prerequisite | State |
| --- | --- | --- | --- |
| P0 | Codex -> user | Planning packet, documentation checks; owner plan/design review | PREPARED; approval pending |
| P1 | Engineering | Pinned reviewed toolchain and actual check commands; needs P0 approval | PENDING |
| P2 | Engineering + security reviewer | SQL contracts, policies/grants and real DB concurrency/isolation checks | PENDING |
| P3 | Engineering | Auth, profile and timezone onboarding; local mail evidence | PENDING |
| P4 | Engineering/UX | Standup autosave/conflicts and three-task stack/history | PENDING |
| P5 | Engineering | Durable timer, attribution, summaries and copy outputs | PENDING |
| P6 | Engineering/UX | Responsive concrete design, state coverage and screenshot inspection | PENDING |
| P7 | Independent QA/security | Candidate-bound negative tests, review, fixes/re-review | OPEN |
| P8 | Release/owner | Operational inputs, scoped external-action proposal and readiness review | PENDING; deployment not authorized |

Full requirement/test bindings and dependencies are in PLAN.md sections 9–10. Every future evidence record must name artifact, environment, exact command, exit code, result, reviewer and limitations. No passed checks are inherited from sibling projects.

## Control ledger

| Control | Implementation state | Verification |
| --- | --- | --- |
| Approval/document routing | Configured in planning records | Documentation only; not runtime enforcement |
| Auth/tenant isolation/grants | Proposed | NOT TESTED |
| Task capacity/history and timer idempotency | Proposed | NOT TESTED |
| Private synchronization and local drafts | Proposed | NOT TESTED |
| Accessible responsive critical journeys | Proposed | NOT TESTED |
| Dependency/provenance/secret controls | Proposed | No manifest/artifact yet |
| Mail, cost limits, monitoring, backups/restore | Proposed | Environment unknown; OPEN |
| CI/protected release/deployment controls | Proposed | No repository configuration change |

## Planning checks

Public read-only research: official Supabase, Next.js maintainer/GitHub example and OWASP sources recorded in PLAN.md. No external account was connected. Python UI search CLI unavailable; written guidance used and no installation attempted.

Local documentation validation on 2026-11-04, working directory `04-Personal-Projects/Projects/nensync`: PowerShell Markdown-link resolution, advisor-section whitespace word counts and file-extension inventory exited 0. All local links resolve; council responses contain 189/200/199/199/192 words, within the required 150–200 each. Exactly eight Markdown files exist and no non-document files were created. Initial length validation caught overlong responses; they were shortened and the complete check passed. No external HTTP availability or application behavior was certified by these checks.

`git status --short -- .` reports the new project directory as untracked. `git diff --check -- .` exited 0 but does not inspect untracked file contents; a separate direct trailing-whitespace/conflict-marker check across all eight files exited 0. Application build/tests/manual visual review: NOT RUN because no app exists. Independent review: OPEN. Production readiness: NOT ASSESSED.

## Recovery and continuation

Design-preview follow-up: user requested a mockup. Generated and visually inspected a desktop concept with the built-in image generation tool, then saved it to `audits/nensync/design/nensync-desktop-concept-v1.png` and linked it from DESIGN.md. This is synthetic concept art, not implemented UI or passed visual/accessibility testing. Application implementation and plan/design approval remain pending.

This task added only `Projects/nensync/*.md`. To withdraw the proposal, preserve unrelated work and review/remove only these newly added planning files; no service/data rollback is needed. To continue, record the owner's explicit plan/design approval in PROJECT-START.md, then load team-deliver and phase-specific guidance. Do not treat the user's absence as approval. Resolve production region, mail, budget, workload and recovery objectives before the affected external activation/release.

## Visual revision 2

Owner requested reference-guided redesign and explicitly allowed a dashboard for NenSync. Updated PLAN, DESIGN, PROJECT-START and AGENTS to use the light reference, #0b3d91 / #3ba7f2 / #7fe7d6 / #e8f6ff palette and rem/%/fr fluid sizing, avoiding authored px where possible. Original preview remains superseded history. Feature/security scope unchanged; exact new mockup and full implementation approval pending. New preview target: audits/nensync/design/nensync-desktop-concept-v2.png.

Palette calculation (opaque sRGB) gives navy/white 10.04:1, navy/ice 9.12:1, navy/mint 6.84:1, navy/sky 3.82:1 and white/sky 2.63:1. DESIGN restricts normal text pairings accordingly; these are computed tokens, not rendered accessibility evidence. Reference inspected locally. Generated v2 with the built-in image tool and the reference image, visually inspected the desktop/mobile concept board, and saved the selected PNG beside the reference; v1 was preserved. The narrow companion is illustrative and not complete mobile acceptance evidence; implementation must retain all compile/copy/cancel actions in the scrollable layout.

Revision checks: local Markdown-link resolution and conflict-marker scan across the eight project documents exited 0; all links including the reference/v2 image resolve. Targeted search confirmed updated plan version, approved dashboard amendment, palette and relative-unit rules; remaining dark/emerald mentions describe superseded history. No package/build/browser tests exist to run. The first contrast shell invocation failed on quoting without modifying files; the calculation was rerun directly in JavaScript and succeeded. Helper script at audits/nensync/design/revise-design-v2.cjs records the applied documentation revision and is not an application runtime or a repeatable migration.

## Night mode planning amendment

Owner approved the revised light design and explicitly requested night mode in the plan. PLAN v1.2 and DESIGN revision 3 add Light / Dark / System, a remembered device preference, system-change behavior, semantic night tokens, correct first paint and NS-12 appearance acceptance. Updated startup/instruction pointers accordingly. Theme switches must preserve drafts, focus and timers; no new account field, dependency, runtime or service was created. Overall plan approval remains pending; night visuals and implementation checks remain OPEN.

Documentation validation: local Markdown links and conflict-marker checks exited 0; targeted search confirmed the appearance requirement and removal of the theme-switching exclusion. No application tests were run for this documentation-only amendment.
