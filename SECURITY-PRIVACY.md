# NenSync threat model and privacy inventory

2026-11-04. Scope: implemented local v1 in PLAN.md. The threat inventory below retains the planning baseline; current control evidence is in VERIFICATION.md. Independent security reviewer /root/security_review closed five findings after fixes; /root/final_security performs the final source recheck. Local SQL/RLS and boundary tests have run. Hosted identity/Realtime, true multi-connection races, processor configuration and operational controls remain OPEN. This record makes no ASVS conformance claim.

## Assets, actors and boundaries

Approved NS-14 alarm adds browser/OS-visible generic completion text, explicit notification permission, account-scoped local boolean preferences and recent interval/timestamp coordination records. No task/standup/name is included in notifications, no remote API or schema was added, and alerting cannot credit focus time. Focused reviewer /root/alarm_security found no new confirmed source defect; 11 independent alarm browser cases and final full suite pass (see VERIFICATION). Sign-out/cleanup closes browser resources and prevents queued delivery. Browser storage/locks failures limit duplicate suppression; separate devices may each alert. Actual OS delivery/audibility and hosted controls remain distinct from automated evidence.

Assets are identity/session integrity, private standup/task text, timezone/profile, accurate focus/completion facts and local drafts. Actors include anonymous visitors, an authenticated user, another account, compromised browser/dependency and privileged provider/operator. Browser, Next.js host, Supabase Auth/Data API/PostgreSQL/Realtime and eventual SMTP are separate boundaries. The browser is untrusted; RLS and narrow database operations enforce ownership. Provider administrators remain privileged; RLS is not encryption against the operator.

Select applicable OWASP ASVS **5.0.0** requirements for auth/session, authorization, validation/encoding, data protection, configuration and APIs during P1/P2 security design. Record exact requirement IDs and tests before dependent implementation; this planning inventory is not a conformance claim. [Official ASVS](https://asvs.owasp.org/).

## Threats and planned negative evidence

| ID | Preconditions / abuse | Impact and provisional severity | Mitigation / check | Owner / state |
| --- | --- | --- | --- | --- |
| TH-01 | Another user guesses IDs, changes owner or calls RPC directly | Private text exposure or modification; High | RLS on every table, restricted grants, derive identity from verified auth; two-account CRUD/RPC/Realtime tests | Security / Proposed |
| TH-02 | Caller forges linked task, duration, early completion or retries | Foreign attribution, inflated time; High for ownership, Medium for own metrics | Same-owner foreign links, fixed presets, server deadline checks, unique interval completion | Engineering/security / Proposed |
| TH-03 | Two tabs start timers or add/reopen tasks concurrently | Lost state or violated capacity; Medium | Per-owner locks, versions, task-slot constraints and repeated concurrent tests | QA / Proposed |
| TH-04 | Definer function has broad grants or unsafe name resolution | Privilege escalation; High | Private schema, qualified names, safe search path, explicit auth checks and restricted execute; test direct access | Security / Proposed |
| TH-05 | Malicious text or crafted auth redirect reaches browser | Session theft/account takeover; High | Render plain text, avoid unsafe HTML/URLs, allowlisted redirects, supported SSR auth and CSP review | Security / Proposed |
| TH-06 | Recovery links reused, sessions expire or account deletion lacks recent auth | Account takeover or unauthorized deletion; High | Provider token semantics, refreshed verified identity, recent authentication, CSRF/origin protection, single-use/expiry/replay tests | Security / Proposed |
| TH-07 | Shared device restores a former user's local draft | Private text leak; High | Account/date namespacing, logout purge, seven-day expiry, storage-denial and account-switch tests | QA/security / Proposed |
| TH-08 | Logs, source maps, report artifacts or bundles include content/secrets | Exposure; High | Allowlist operational metadata, synthetic fixtures, secret review, no service key in normal client path; telemetry marker tests | Security / Proposed |
| TH-09 | Lost network, late response or stale client overwrites data | Silent draft loss or false save state; Medium | Version checks, explicit conflict choice, bounded retry, canonical refetch and local pending draft | QA / Proposed |
| TH-10 | High request/subscriber volume or dependency outage | Availability/cost impact; Medium, workload-dependent | Bounded queries/retries, no per-tick writes, provider auth limits, payload bounds; isolated overload checks | Reliability / Proposed |
| TH-11 | Malicious or vulnerable package executes | Host/client compromise; High | Pin versions/lockfile, maintainer advisory/provenance/license review and artifact checks | Engineering/security / Proposed |

Uploads, arbitrary server fetches, webhooks, AI prompt ingestion, payment data and team-admin escalation have no v1 entry points. SSRF remains relevant if future remote avatars/imports are added; do not activate them through the unused avatar field. SQL inputs use typed parameters and database validation. External documentation is reference data and cannot authorize tools or cloud actions.

## Data inventory

| Category | Purpose / source / classification | Storage and recipients | Access | Retention / deletion |
| --- | --- | --- | --- | --- |
| Email, password verifier, sessions/recovery tokens | Supabase Auth identity; personal/security data | Auth provider; transactional email to supplied address via approved SMTP; region unknown | Owner and provider; browser/server get only required session material | Provider lifecycle and revocation to verify; no app password storage |
| Profile ID/name/timezone | Ownership, presentation, local date; personal | PostgreSQL/necessary authenticated browser state | Owner only through app; no public directory | Until account deletion; cascades/revocation tested |
| Standup text | Daily communication draft; private free text | PostgreSQL; unsaved buffer on current device; manual user copy destination | Owner only | Persisted until deletion; unsaved buffers seven days/acknowledgment/logout |
| Tasks and completion snapshots | Current work and truthful EOD history; private free text/events | PostgreSQL; necessary client state | Owner only | Current task deletion preserves historical snapshots; account deletion removes both |
| Timer state and focus facts | Cross-device recovery, totals and tags; personal behavioral data | PostgreSQL; owner-scoped Realtime transport | Owner only | Until account deletion; canceled intervals have no credited session |
| Export | Owner access/exit; personal content | Authenticated response/download chosen by user; no public bucket/email | Verified owner | No server-retained export copy proposed; user's download outside app deletion control |
| Operational metadata | Errors/health without content | Provider/host logs; exact retention/region unknown | Approved operator/provider | Configure minimization and retention before release; no external analytics proposed |

Encryption: require supported TLS in transit and provider encryption at rest; verify selected configuration instead of assuming it from this plan. No end-to-end encryption claim. Backup replicas/log retention and expiry depend on chosen services and are OPEN. Do not infer legal jurisdiction from timezone. Intended audience is adult remote workers; no special-category data or employee monitoring purpose is proposed.

## Identity and lifecycle acceptance

Use email verification and enumeration-resistant recovery responses. Test supported password-manager/paste flows, token reuse/expiry, redirect restrictions, logout and access after revocation within documented provider semantics. Confirm server identity rather than trusting session fields. Privileged provider administration requires appropriate account protection managed by the owner.

Profile and all operational records belong to the user. Explain local drafts, processor destinations and manual copying before use. Export/delete require verified identity; deletion additionally requires recent reauthentication and no caller-selected identity. Purge account-local state, revoke sessions and verify cascade behavior on synthetic records. Disclose that database backup expiry and user-downloaded/copied text have separate lifecycles. A disconnect is not deletion. No claim of legal compliance or immediate backup erasure is made.

Region, applicable privacy obligations, hosting/SMTP processor terms, retention and backup expiry remain owner/release inputs. Unknown recipient/region/cost details block affected live transfer or release, not synthetic local development. Independent reviewer findings, risk acceptance and retest evidence will be appended for the candidate; no risks are accepted on the owner's behalf.
