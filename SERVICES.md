# NenSync service admission register

2026-11-04. Owner/stop authority: project owner. Candidate: planning v1. No accounts connected, resources created or service configurations inspected. Admission for all live integrations: **PROPOSED; activation pending scoped approval**. No new spend, trial, paid API call or auto-renewal is authorized.

## Proposed services

Approved alarm amendment uses only built-in browser Web Audio/Notifications APIs. It introduces no subscription, external API integration, push server, background service, dependency or new chargeable call. Generic completion text may be displayed/processed by the user's browser/OS with explicit notification permission; no task/standup/profile content is included. Preferences/coordination remain browser-local, not a new Supabase schema or recipient integration. No hosted service activation follows from alarm approval.

| Service | Purpose / alternative | Access, recipients and lifecycle | Costs and controls | Admission gap |
| --- | --- | --- | --- | --- |
| Supabase Auth/PostgreSQL/Realtime | Requested identity/data/sync; local Supabase with synthetic fixtures for development | Owner-scoped data read/write through public publishable key plus verified session; server-only account deletion privilege if enabled; private profile/text/events; region/account alias unknown | Free/pilot versus paid production not selected; monitor database/egress/auth/realtime usage; no per-tick writes | Owner must select environment/region/tier, approve secure setup and bounded tests, confirm terms/retention/backup limits |
| Next.js hosting | Run SSR/auth endpoints; local host first, deployment provider unselected | Necessary request/session processing, minimized logs; no private shared caching; processor/region unknown | No provider price or plan assumed | Concrete hosting proposal, applicable use terms, traffic/limits and deployment approval required |
| Transactional SMTP | Verification/reset mail; local mail capture for synthetic testing | Recipient email and minimal authentication message/link; no standup/task content; provider/retention/region unknown | Separate subscription/message charges and overage unknown | Select provider with approved costs/permissions; test delivery, sender configuration, redirects and revocation |
| GitHub Actions, if chosen | PR quality checks; local checks first | Source and synthetic test artifacts only; no production access or live user data | Repository plan/minutes/storage allowance unknown | Repository-root workflow and scope need deliberate approval; no CI change in this task |

## Official sources checked 2026-11-04

- [Supabase pricing](https://supabase.com/pricing): Free is listed at USD 0; Pro starts at USD 25/month. Free lists 500 MB database storage, limited egress and inactivity pausing. Paid total depends on compute/add-ons/usage. These are reference terms, not approved purchase or a full quote.
- [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase): organization/project and usage charges must be considered separately; do not assume one subscription covers unlimited projects.
- [Supabase cost controls](https://supabase.com/docs/guides/platform/cost-control): verify coverage and bounded exposure per item; alerts and a spend-cap label alone do not establish a hard total budget.
- [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp): default email delivery has restrictions and does not establish production readiness. Custom SMTP selection/configuration is an external action.

Recheck sources before activation. No paid tier recommendation is final until the owner supplies workload and budget. SMTP/hosting pricing cannot be verified until a provider is selected. No chat subscription/API entitlement is assumed. No AI provider, storage upload service, Slack/Teams connector, payment service or analytics vendor is needed for v1.

## Activation checklist for each selected environment

1. Record provider/account alias, environment, region, pinned tool/SDK version, source/provenance, package licenses and any executable hooks; never record secrets.
2. Record approval message, actions, permitted data/recipients and validity window. A stack request permits planning the service, not provisioning an account or changing production.
3. Record currency, recurring charges, per-run/aggregate ceilings, overage/add-on exposure, trial/renewal/cancellation and stop owner. Keep retries/concurrency/time limits bounded. If exposure cannot be bounded within approval, do not activate.
4. Confirm least-privilege access, redirect/domain configuration, approved secure credential setup and revocation owner. Normal UI needs no private service key. Agents must not inspect credentials.
5. Confirm processors/subprocessors, residency/transfers, retention/training terms where relevant, backup expiry, export/delete and exit behavior. No prohibited data is permitted, even for sanitization.
6. Exercise synthetic auth/isolation/revocation, usage-stop, deletion and restore checks; bind results to artifact/environment. Record control state separately from approval. No account disconnection or billing cancellation without appropriate authorization.

## Planned operating limits

Application payload bounds and proposed 10-second timeout/two transient retries are in PLAN.md. Production account ceiling, service quotas, rate limits, per-run/aggregate costs, concurrency for hosted testing, SLO, RPO and RTO are unresolved. Configure them only after the owner-approved proposal; do not claim billing caps, backups, encryption settings or alerts were installed by this document.

Exit path: owner exports data; verify live-account deletion and session revocation; report processor backup/log retention separately. No silent provider migration or paid fallback. Installation/runtime licenses and dependency vulnerabilities remain candidate-specific checks; none were audited through a nonexistent lockfile.
