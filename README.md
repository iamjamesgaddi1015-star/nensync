# NenSync

A private standup, three-priority and focus workspace. The approved light dashboard and matching night mode are implemented with Next.js App Router, strict TypeScript, Tailwind and custom native-semantic controls. Supabase integration and an ordered initial migration are included.

## Run locally

From this directory:

```text
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:3210/demo**. The explicitly labeled interactive preview uses synthetic data and this browser's storage. No real authentication or cloud persistence is implied. Without public Supabase configuration, the root redirects to this preview and account forms explain the setup limitation.

`npm run dev` starts development on the same port. A pinned project-local Node 24 runtime is installed as a development dependency; the Next launcher also puts it first on worker PATH. Your system Node installation is unchanged. A production installation omitting development dependencies must supply a supported Node 24 runtime itself.

## Implemented daily loop

- Standup autosave, local draft recovery/expiry, explicit version conflicts, Markdown/plain-text compilation and clipboard fallback.
- Three active task slots, task editing/completion/reopening/deletion and historical completion snapshots.
- Shared durable timer contracts, start/pause/resume/end, deadline recovery and duplicate-proof interval logging. Breaks earn no focus time.
- Database-derived daily totals/tag minutes and copyable EOD reports.
- Profile/timezone onboarding, account export and guarded deletion integration.
- Light/Dark/System preference, correct initial theme, fluid relative units and responsive single/two/three-column layouts.

## Completion alarms

Keep NenSync open, including in a background tab. Starting/resuming a timer prepares a short chime for focus and break completion. Use **Test alarm** to check your volume; **Sound** mutes automatic chimes. The test button deliberately previews sound even when automatic chimes are muted.

Click **Enable desktop notifications**, then allow your browser's permission request. Notifications use generic text and contain no task or standup content. Their button can turn them off again. Denied permission is explained inline; change your browser's site settings to allow it. Notification permission is never requested on page load. Preferences are local to this browser/account and separate from timer data.

Alerts do not imply that a completion has saved while offline. Completed time is reconciled by the existing persistence rules. Historical intervals recovered after reopening do not replay alarms. Browsers/OS settings, sleep and suspended tabs can delay or block sound/notifications; no closed-tab or locked-phone push is provided. Unsupported mobile notification APIs retain available sound and visible completion feedback. Cross-tab duplicate suppression uses browser locks/storage and is best-effort when those are unavailable; separate enabled devices can each alert.

## Connect an approved Supabase environment

No hosted project was created or changed during implementation. The owner must separately approve the exact project, region, cost and actions before an agent applies migrations or configures services. Never paste secrets into chat or commit credential files.

1. Review the selected target's existing objects. The ordered initial install is [the migration](supabase/migrations/202611040001_workspace.sql); it creates six owner-isolated tables, profile trigger, restricted functions and owner-readable Realtime publication entries. Do not apply it blindly to an existing database. No destructive reset script is supplied.
2. Supply the actual reviewed public URL and publishable key through `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. [.env.example](.env.example) lists names with blank values; agents did not inspect runtime credential files. Restart/rebuild after changing public build configuration.
3. Set a separate, owner-generated random **server-only** `NENSYNC_RECOVERY_SECRET` of at least 32 characters through the hosting secret manager. It signs a ten-minute HttpOnly recovery context; never prefix it with NEXT_PUBLIC. No working secret is invented in source.
4. Configure Supabase email verification, password rules, abuse limits and production SMTP through a separately approved setup. Set the actual Site URL and allowlisted redirect origins; do not invent a domain or assume default mail delivery works.
5. **Recovery template is required:** direct the recovery email link to the configured application Site URL with `/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`. Use the provider's template variables and verify the actual template/delivery in the selected environment. The handler verifies a recovery OTP before issuing signed context. An ordinary PKCE `redirectType` or a query-string `next` never authorizes password changes. The ordinary auth callback remains for sign-up/session exchange.
6. Configure/test provider-side secure password-change and recovery controls. `/update-password` and `/api/password` require a verified current identity plus matching short-lived recovery context; an ordinary signed-in session cannot use the app route to replace a password. Test expiry/reuse/wrong-account links and secure-password-change behavior against the real provider.
7. Optionally supply a server-only `SUPABASE_SERVICE_ROLE_KEY` for the account-deletion endpoint. Normal workspace queries never need it. Without it, deletion is disabled with an explanation. The endpoint verifies the current account, reauthenticates its password and deletes only that identity; no caller-selected target ID is accepted.
8. Verify signup, email delivery, profile trigger, two-user RLS/RPC/Realtime isolation, refresh/logout, recovery, export/delete and concurrent tabs in the approved environment using synthetic accounts. Local embedded PostgreSQL and the demo do not close these gates.

Supabase sign-out revokes refresh sessions; previously issued access JWTs can remain valid until expiry. Do not promise immediate backend JWT revocation. Provider account deletion/disablement, expiry and operational response must be tested according to the selected configuration.

Exports are owner-filtered and paginated, with an explicit size error rather than silent truncation. They reflect sequential reads, not a transactional whole-account backup. Account deletion removes live owned records; provider backup/log expiry and downloaded/copied text have separate retention boundaries. No sensitive work content belongs in operational logs.

## Checks and evidence

Signup troubleshooting: a request canceled at about ten seconds can come from the old client deadline, leaving no response body. The current source gives `/auth/v1/signup`, `/auth/v1/recover` and `/auth/v1/resend` 30 seconds; other Supabase calls retain 10 seconds. Deploy a fresh build containing this change before expecting it on Vercel. Cancellation does not establish whether an account was created: check your verification inbox and Supabase Authentication status before retrying. If the request still fails, use the Auth error code and provider logs to distinguish password policy, email setup, rate limits and backend failures. Share only sanitized error codes/messages, never credentials or user records.

The signup form shows allowlisted corrective errors without reflecting arbitrary provider text or exposing account existence. Password-policy feedback can show the provider's numeric minimum even when it exceeds the form's 12-character floor. The minimum is configured in Supabase; SMTP configuration is independent. A longer client deadline does not prove mail delivery or fix a broken provider configuration.

```text
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Browser acceptance requires the running app on port 3210 and installed Edge. Set TEMP/TMP to workspace `audits/nensync/tmp` before running browser tools. Playwright outputs are configured under `audits/nensync/evidence`; no production credentials are needed. `npm run db:types` regenerates table types from the reviewed migration's ephemeral PostgreSQL catalog, then `npm run format` normalizes generated formatting. No hosted database is queried by that generator.

See [VERIFICATION.md](VERIFICATION.md), [RELEASE-REVIEW.md](RELEASE-REVIEW.md) and [TASKS.md](TASKS.md) for actual executed results and limits. Browser emulation does not certify hardware phones, screen readers, Firefox/WebKit or hosted email/Realtime. No repository-root CI or branch protections were activated; a workflow nested in this app would be only a template in this monorepo.

## Project records

[Plan](PLAN.md), [design](DESIGN.md), [interaction contract](UX-CONTRACT.md), [startup and approval](PROJECT-START.md), [security/privacy](SECURITY-PRIVACY.md) and [services](SERVICES.md) retain scope and external-action boundaries. Local implementation approval does not authorize deployment, billing changes, SMTP activation or live SQL execution.
