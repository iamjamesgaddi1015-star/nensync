# Project instructions: NenSync

Shared rules: [workspace](../../../AGENTS.md) and [personal projects](../../AGENTS.md).

## Scope

Private multi-user daily standup, three-task focus and EOD workspace. Understanding, UI direction and PLAN.md v1.2 are explicitly approved for local implementation/testing. Production/service approval gates remain in PROJECT-START.md. Team sharing is deferred.

## Architecture

Next.js App Router/strict TypeScript/Tailwind with direct Supabase Auth/PostgreSQL/Realtime, official SDK/SSR integration and generated database types. The user explicitly selected this stack instead of the category Java backend default. Custom primitives; no shadcn/Radix or ORM. Follow DESIGN.md revision 3 for the approved dashboard, Light/Dark/System modes, palette and fluid relative units. Local implementation is present; hosted integration remains unverified. PLAN.md owns contracts and VERIFICATION.md owns actual evidence.

## Commands

Run from this directory; package.json is authoritative. `npm run dev` / `npm start` use port 3210 and the project-local Node 24 launcher. Checks: `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`. Browser tests require the running app and Edge; set TEMP/TMP under workspace `audits/nensync/tmp`. Playwright outputs are configured there. `npm run db:types` uses an ephemeral migration catalog, never a hosted target.

## Project restrictions

- Preserve separate understanding, council, plan and production-authorization gates; planning PROCEED is not implementation or deployment approval.
- Enforce ownership, three unfinished task positions, one shared timer and exactly-once completion in database transactions; client filtering is insufficient.
- Treat stored work dates and historical snapshots as durable facts; follow PLAN.md for timezone edits, reconciliation and reopened tasks.
- Use synthetic fixtures and approved public configuration. Production service setup, paid features and remote mutations need scoped approval.
- Recovery context may be issued only after verified recovery-type OTP, never from editable PKCE redirect metadata. README documents the required template and server-only signing secret; agents never read secret values.

## Documentation

- Planning/review: [PLAN.md](PLAN.md), [DESIGN.md](DESIGN.md).
- Gate/ownership evidence: [PROJECT-START.md](PROJECT-START.md), [COUNCIL-REVIEW.md](COUNCIL-REVIEW.md).
- Before identity/data/service work: [SECURITY-PRIVACY.md](SECURITY-PRIVACY.md), [SERVICES.md](SERVICES.md).
- Resuming delivery: [RESUME.md](RESUME.md); recording work: [TASKS.md](TASKS.md).
- Setup and actual checks: [README.md](README.md), [VERIFICATION.md](VERIFICATION.md), [RELEASE-REVIEW.md](RELEASE-REVIEW.md).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
