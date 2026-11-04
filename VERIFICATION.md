# NenSync verification record

Candidate: local application 0.1.0, 2026-11-04. Source identity is recorded in the final source manifest under `audits/nensync/evidence`. No commit or deployment was created. Working directory for commands: this project. All fixtures and screenshots are synthetic.

## Baseline execution evidence (before the alarm amendment)

| Check | Command / procedure | Result and scope |
| --- | --- | --- |
| Table type generation | `npm run db:types` | PASS; generated from ephemeral PostgreSQL migration catalog, not a hosted Supabase project |
| Domain and database behavior | `npm test` | PASS, 14 cases: trigger/RLS/grants, standup conflicts/day bounds, task capacity/history/ownership, timer lifecycle/expiry/idempotency, date/DST/report logic, recovery signatures, draft expiry and bounded bodies |
| Initial production build | `npm run build` | PASS after toolchain/runtime fix and permitted worker execution; final rebuilt candidate recheck recorded below |
| Production dependency review | `npm audit --omit=dev --audit-level=high --offline=false --json` with workspace cache/output | PASS; report contains zero production advisories at check time; not a guarantee of absence of vulnerabilities |
| Independent browser acceptance | `npm run test:e2e -- --output ../../../audits/nensync/evidence/qa-results` | 12 cases passed across initial run and focused selector/accessibility reruns; final single-suite result recorded below |
| Automated accessibility | QA axe scan in light and dark | PASS in Edge for rendered demo; manual/hardware/cross-engine checks remain open |
| Visual review | Independently inspected `qa-1440-light.png`, `qa-1440-dark.png`, `qa-390-light.png`; coordinator inspected light desktop/mobile | Approved composition retained; no observed clipping/missing daily controls in inspected states |
| Responsive behavior | QA widths 320/390/768/1440 and enlarged root text | PASS for simulated Edge viewports; enlarged text is not a substitute for actual browser zoom or phone hardware |
| Type/lint/format | Project scripts | Final results recorded below; initial findings fixed rather than suppressed |

The initial browser run passed 11 cases; an EOD test label selector timed out. The independent reviewer confirmed the accessible combobox role, corrected only that selector and passed the focused rerun. This was a test-selector correction, not a changed acceptance requirement. The final full suite must bind to the rebuilt application.

## Independent reviews

QA owner: `/root/qa_review`, separate from implementation. It authored `tests/qa.spec.ts`, derived cases independently, executed them and inspected light/dark/mobile captures. Scope: explicitly labeled local demo, navigation/interaction, appearance, offline/conflict recovery and simulated viewport accessibility.

Security owner: `/root/security_review`, separate from implementation. It reviewed SQL, identity/RPC boundaries, account switching, draft retention and account/recovery handlers. Confirmed findings were fixed and re-reviewed:

- Timer expiry between reconciliation and pause: trusted transition now reconciles the original deadline; deterministic delayed-helper test passes.
- Account switch with an open draft: requests verify identity, bind a fixed verified token, validate returned owners and invalidate stale views; a fully mocked account-switch regression rejected the foreign session before any RPC.
- Expired prior-day draft storage: the active namespace is swept and stale/malformed records actually deleted; other accounts are untouched.
- Password update from an ordinary session: server recovery context is required; a direct ordinary-session page redirects to recovery request.
- Editable PKCE redirect metadata: callback no longer issues recovery context. Only successful recovery-type OTP verification can issue it; the final removal was checked in source.

All findings in that focused review were closed. This is not a full security audit or production-readiness certification. Hosted provider controls, actual multi-connection races and Realtime delivery remain unverified.

## Tooling and boundaries

Pinned project-local Node 24.22.2 resolves the system Node 22.10 Tailwind ESM incompatibility. The launcher puts the same runtime first on worker PATH. Initial sandbox `spawn EPERM` failures for compiler/browser workers were rerun through the normal approval mechanism. They are tooling failures, not passing application checks.

Impeccable CLI context could not run because its engine was not installed in the permitted cache; existing product/design context and craft guidance were read directly. The Design Taste browser inspector was invoked separately with an explicit audit output/temp boundary; its actual result is recorded below. No tool badge or empty scan is treated as proof of design quality.

## Final candidate results

Resumed 2026-11-04 after the credit-limit halt. All commands below run from the project directory against synthetic data. Local tooling/build/browser processes required the normal sandbox approval mechanism; a stalled sandbox runner was stopped and not counted as evidence.

| Check | Final result |
| --- | --- |
| `npm run format:check` | PASS, exit 0; final changed files additionally formatted/checked |
| `npm run lint` | PASS; full source run after alarm implementation; focused post-race-fix check recorded in the alarm section |
| `npm run typecheck` | PASS, exit 0; the subsequent corrected production build also passed its TypeScript phase |
| `npm test` | PASS, exit 0; 14/14, zero skipped; log `evidence/final-test.log` |
| `npm run build` | PASS, exit 0; rebuilt after the relative auth-redirect fix |
| `npm run test:e2e` | PASS, exit 0; latest complete run 26/26 (15 baseline + 11 alarm), zero skipped, 1.8 minutes; machine-readable `evidence/browser-results.json` |
| Design Taste `inspect.mjs ... --app --widths 1440,768,390 --json` | PASS, exit 0; zero FAIL findings; latest report `evidence/alarm-taste/report.json` |
| Source identity and Markdown links | PASS, exit 0; explicit 58-file SHA-256 manifest and valid project Markdown targets; `evidence/source-manifest.json` and `evidence/handoff-check.json` |

Browser regressions initially caught two issues: the invalid-form test used synchronous checkbox checking for an asynchronous task transition, and auth callbacks changed the browser origin from 127.0.0.1 to localhost. The test now waits for the confirmed task count. Callback success/error paths now return fixed allowlisted relative Location headers, preserve the browser origin and set no-store; security independently re-reviewed the helper and both routes. A subsequent test expected an exact Cache-Control value and rejected the stronger existing `private, no-store` policy; the assertion now checks the required directive. Acceptance requirements were retained.

The initial Design Taste run failed heavy-shadow and tiny-text checks; the rendered final run confirms those fixes. Its remaining WARN, colour-sprawl on desktop/tablet, reflects the owner-approved blue focus card and supplied palette. That composition is intentionally retained; no rule was suppressed. The UI and its styles did not change in the subsequent auth-only fix, so the final visual inspection remains applicable.

Independent final QA `/root/final_qa` inspected all six `final-{1440,768,390}-{light,dark}.png` captures. The coordinator inspected desktop dark, tablet light and mobile dark. No confirmed clipping, missing daily controls or horizontal overflow was observed. An initial image-view discrepancy in the dark focus panel was not reproduced when reopened; a separate browser check confirmed visible controls and nonzero dimensions. Independent final security `/root/final_security` rechecked the five original fixes and the relative redirects, with reviewed file hashes. Reports: `evidence/final-qa-review.md` and `evidence/final-security-review.md`.

No live Auth/SMTP/Realtime, real accounts, hardware phone, manual screen-reader certification, restore or cloud mutation was performed. The user-bound recovery cookie is stateless, not a consumed server nonce: hosted replay/revocation behavior remains OPEN. Local embedded PostgreSQL is not proof of multi-connection concurrency or the full hosted Supabase stack.

## Approved alarm amendment: NS-14

The owner selected a chime plus desktop notification, selected open/background-tab operation, then explicitly approved ALARM-PLAN.md for implementation/testing. Source is browser-only: no migration, dependency, provider configuration or network integration was added. Team sharing remains deferred.

Independent QA `/root/alarm_qa` authored 11 cases in `tests/alarm.spec.ts`. Initial focused run exited 1 (9 pass, 2 fail) and exposed AQ-01: two tabs could both miss an alarm when a reconciled idle snapshot arrived ahead of the observer's one-second clock. Feeding the latest trusted snapshot server time immediately into observation fixed it without changing persistence/counts. The unchanged two-tab cases passed 2/2 on independent rerun, then all 26 browser cases passed together on the corrected build. Coverage includes focus/break generic payloads, mute persistence/test sound, permission denial/unsupported APIs, blocked audio/storage, offline completion, pause/cancel, historical recovery, queued sign-out cleanup and cross-tab delivery with/without Web Locks.

Independent security `/root/alarm_security` re-reviewed final source, prompt busy protection, storage fallback, account/interval namespaces, notification privacy, cleanup and the AQ-01 timing fix. No new confirmed security defect was found in that bounded scope. Reports `evidence/alarm-qa-review.md` and `evidence/alarm-security-review.md` record reviewed hashes; review is not a full audit.

The production rebuild after AQ-01 exited 0 and passed TypeScript. Full lint/format and 14 domain/database tests completed successfully after alarm implementation. Final `npm run typecheck`, focused ESLint on the changed timer integration and `npm run format:check` completed with no findings (combined runner exit 0). Python-dependent premium static audit could not run: `python --version` exited 1 because Python is unavailable; no runtime installation was attempted and no premium audit pass is claimed. Project-owned browser, accessibility, source and design checks remain the actual evidence.

Native Edge smoke on the corrected build exited 0: an actual running AudioContext at 48000 Hz, two real oscillator creations (Test + completion), and one real Notification constructor call with isolated test-context granted permission. Result `evidence/alarm-native-smoke.json`. This proves platform API execution, not that a person heard the sound or an OS popup was visible. Native notification permission for the owner's browser was not changed.

QA inspected six latest desktop/tablet/mobile light/dark captures; the coordinator inspected desktop light and phone dark. New controls fit/wrap without horizontal overflow. The updated Design Taste inspector exited 0; only colour-sprawl WARN remains (18% desktop), attributable to the approved blue focus panel. No UI rule or test assertion was suppressed.

Browser suspension/OS settings may block output, and closed-tab/locked-phone delivery is excluded. Cross-tab suppression is best-effort when storage/locks/channel coordination is unavailable; separate enabled devices can each alert. These limitations are disclosed in README and inline where relevant. They do not alter exactly-once database completion credit. The local preview remains suitable for synthetic use; hosted release gates remain OPEN.
