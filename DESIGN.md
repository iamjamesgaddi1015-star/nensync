# NenSync design direction

Revision 3, 2026-11-04. The owner approved the current UI direction and implementation plan, including night mode, responsive behavior and working buttons/links. The application is implemented locally; VERIFICATION.md records rendered checks and remaining hosted/hardware gaps.

## Reference and previews

- [Owner-supplied reference](../../../audits/nensync/design/reference-design.jpg): light surroundings, rounded white workspace, airy modular panels, pill top navigation and concentrated blue emphasis. Medical content, branding, people and social overlays are not NenSync requirements.
- [Revised desktop concept v2](../../../audits/nensync/design/nensync-desktop-concept-v2.png): current visual direction, generated using the supplied image as a style reference.
- [Earlier concept v1](../../../audits/nensync/design/nensync-desktop-concept-v1.png): superseded history; the owner liked the concept but rejected its visual design.

These generated images use synthetic content; they are not working screens, CSS geometry evidence or passed accessibility tests. Prompt direction: a light NenSync daily dashboard with white rounded surfaces, the exact navy/sky/mint/ice palette, a navy focus card, three numbered priorities, standup writing and EOD reporting. Borrow styling without copying the medical product.

## Product and three composition options

NenSync is a task-focused personal dashboard: today's intentions, timer, priorities and summary help decide what to do next. The owner explicitly approved this project-specific dashboard direction. Private accounts and deferred team sharing still apply.

| Option | Hierarchy and navigation | Mobile | Decision |
| --- | --- | --- | --- |
| A: Light daily dashboard | Standup left, navy timer/tasks center, summary/EOD right; pill section links above | One reading flow with anchors to daily sections | Selected revised proposal; follows reference and retains approved daily loop |
| B: Guided day | Prepare, Focus and Close phase tabs hide other phases | Single phase at a time | Less density but more switching; not selected |
| C: Work log | Chronological transcript with utility timer | Inline daily transcript | Emphasizes historical browsing beyond v1; not selected |

Dashboard permission, reference use, palette, revised light mockup, night-mode direction and implementation plan are approved. Executed checks and limits belong to VERIFICATION.md.

## Selected composition

- Approved alarm amendment: the focus panel includes compact Sound, Test alarm and Enable/Turn off desktop notifications controls plus persistent inline status. Reuse Button, native checkbox semantics and focus-panel typography/palette; wrap controls at narrow widths. No new header notifications icon, navigation surface or dashboard tile. Browser permission is requested only by its named control; system notifications contain generic completion text.

- Ice-blue page surrounds a generous white rounded shell with a subtle neutral shadow. On small screens, reduce surrounding gutters/radius to preserve useful writing space. Panels use white/pale-blue surfaces and delicate separation rather than heavy outlines.
- Header: NenSync; Overview, Standup, Focus and Sign-off section links; profile/settings. These navigate the same daily workspace, not unbuilt routes. No decorative search, notifications, team avatars or historical date filters.
- Compact greeting/date row follows the reference's hierarchy; include timezone and real save/sync status without a marketing hero.
- Wide layout starts with 7:8:5 fractional tracks after gaps, allowed to rebalance for content rather than fixed percentage widths. Left: standup editor. Center: navy focus card above three numbered tasks. Right: daily facts/tag-minute rows and EOD preview.
- Show focus minutes, interval count and completed-task count only from actual daily aggregates. Direct-labeled tag bars are useful; medical/trend charts and fabricated weekly history are excluded.
- Tablet uses two columns with reporting beneath; phone uses one flow in consistent DOM/visual order: Standup, Focus/tasks, Summary, EOD. Compact section links make the timer reachable, with no left sidebar or nested scrolling.

## Palette and typography

| Role | Color / treatment |
| --- | --- |
| Ink, filled primary action, focus card | **#0b3d91** navy; white text on navy |
| Data/progress accent | **#3ba7f2** sky; selected underlines and restrained graphic details |
| Quiet positive/selected fill | **#7fe7d6** mint with navy text and explicit state labels |
| Canvas and tinted surfaces | **#e8f6ff** ice |
| Neutral support | White surfaces plus accessible neutral text/border/error tokens as needed |
| Typography | System sans for writing/navigation, tabular system numerals for countdown and minutes |

Computed opaque sRGB contrast: navy/white **10.04:1**, navy/ice **9.12:1**, navy/mint **6.84:1**. Navy/sky is **3.82:1** and white/sky **2.63:1**, so neither is suitable for normal body labels on saturated sky. Use navy/white primary buttons and navy/mint secondary treatments. Sky is an accent, or needs a darker verified neutral foreground. Decorative pale separators are not the sole indication of controls. Actual opacity/compositing and meaningful control/focus boundaries require rendered checks.

## Night mode and appearance settings

Offer **Light / Dark / System** through an accessible settings control reachable from the header and auth screens. Default to System, follow live device changes only when System is selected, and remember explicit preference per browser/device. This preference is non-sensitive and needs no account database field or cross-device synchronization in v1.

Retain the approved composition and spacing in both modes. Proposed night tokens: deep navy canvas around #07162b, raised navy surfaces around #102443, ice #e8f6ff primary text, and sky #3ba7f2 / mint #7fe7d6 accents. Preserve navy branding while keeping foregrounds readable; do not reuse navy-on-white text tokens unchanged on navy surfaces. These dark surface candidates require rendered contrast review and are not approved measurements. The earlier rejected dark mockup remains superseded.

Use semantic canvas/surface/text/action/border/status tokens across every surface, including sign-in/recovery, inputs, errors, conflict choices and reports. Validate both modes independently. A selected mode is identified by label/state, not just an unlabeled moon icon. Avoid blanket color inversion and decorative gradients/glows.

Prevent an incorrect-theme flash and hydration mismatch: server-render an allowlisted saved preference, let CSS prefers-color-scheme resolve System before JavaScript, and set the matching color-scheme for native controls. Missing/invalid preference uses System; denied persistence keeps a session-local choice. Switching preserves keyboard focus, drafts and the running timer and requires no reload or animation. Honor reduced motion.

Verification maps to PLAN.md NS-12: saved choice/reload, System change, explicit override, invalid/blocked storage, first paint, native controls, and every critical state at mobile/tablet/desktop sizes. Night mockup and implemented checks have not been produced.

## Fluid sizing contract

Use **rem**, **%**, **fr**, **ch** and bounded viewport/container units. Prefer no authored px dimensions. CSS pc means picas, an absolute print unit; rem and percentage widths fulfill the adaptive intent. Narrow unavoidable vendor/platform exceptions must be documented.

- Root font size respects browser settings at 100%; no fixed-pixel root reset or blanket page scaling.
- Text/control sizes use rem and unitless line-height. Body/editable phone text is at least 1rem. Timer type may use clamp(3rem, 7cqi, 6rem) with a rem/viewport fallback, tested for available space.
- Use fractional grids, minmax(0, ...) tracks, shrinkable children, wrapped text and natural card heights. A shell can use min(100%, 100rem) and fluid rem gutters; no fixed canvas in application CSS.
- Padding/gaps typically span 1rem–1.5rem; card radii 1rem–1.5rem; shell up to 2rem. Use bounded clamp() values where useful, not viewport-only typography.
- Starting breakpoints are approximately 48rem for two columns and 80rem for three; adjust to actual fit. Use container queries where card width determines layout.
- Target at least 2.75rem interactive hit areas. Prefer rem border widths, overflow wrapping for unbroken text and no fixed height clipping of prose/report content.
- dvh can support full-height layouts without disabling page scroll; preserve zoom, safe areas and native scrolling.

Relative units alone do not guarantee responsiveness. Test widths of 20rem/24.375rem phone, 48rem tablet and 90rem desktop with default/enlarged browser text, landscape, 200% zoom and narrow reflow. WCAG defines some criteria in CSS pixels; measurement terminology does not require authored px layout.

## Signature, components and states

Three numbered Must-Win positions and a large linear countdown remain the signature. Concentrate navy on the timer; mint/sky progress adds clarity. Keep preset/task context, Pause and End session controls. No circular countdown or invented attention score.

Engineering/UX owns native-semantic Button, Field, Textarea, Checkbox, SegmentedControl, Status, ConfirmDialog and ConflictChoice primitives. Dashboard permission does not authorize shadcn, Radix, generic admin templates or a chart library.

| Surface | Required states |
| --- | --- |
| Auth | Idle/submitting/invalid/verification pending/expired/recovery/dependency unavailable; password managers and paste |
| Standup | Empty/typing/saving/saved/local-only/retry/conflict/day rollover |
| Tasks | Empty/one–three active/full/completing/reopening denied/deleting/stale/offline |
| Timer | Idle/running/paused/reconciling/completed/canceled/stale/disconnected |
| Report | Zero/ready/updating/stale/error/copied/manual copy |
| Settings | Validation/active-timer timezone guard/export/recent-auth deletion confirmation |

## Accessibility and verification handoff

Persistent labels, semantic landmarks/headings, keyboard operation, skip link, visible focus, inline errors and accessible conflict/confirmation controls remain required. Announce state changes, not every timer tick. Verify normal text at 4.5:1 and meaningful control/focus contrast at 3:1; statuses need text as well as color. Respect reduced motion and retain draft/error context. No hover-only actions or overlays hiding focused controls.

The local implementation now has browser acceptance and light/dark/mobile screenshot evidence; final candidate results and limitations are recorded in VERIFICATION.md. Save browser evidence under audits/nensync/. Actual phones, screen readers, cross-engine and true browser zoom checks remain OPEN. A raster mockup cannot validate rem usage or responsiveness. Python recommendation CLI was unavailable in initial planning; no installation was attempted.

## Revision record

Auth redesign amendment, 2026-11-07: the owner explicitly approved a local sign-in/sign-up redesign using the centered split-card structure and minimal styling at https://school-service-payment.vercel.app/. Reference capture: [card reference](../../../audits/nensync/evidence/auth-reference.png). Use a quiet tinted NenSync brand panel beside a minimal form, collapsing to one column on narrow screens. Retain semantic palette/theme tokens, readable controls, existing authentication and recovery behavior. This auth-only exception to normal document scrolling locks the shell to the dynamic viewport and permits card-local scrolling at short heights or enlarged text. Other application pages retain normal document scrolling. No backend or deployment change is included. Actual checks are recorded separately in VERIFICATION.md.

Revision 1 proposed dark slate/emerald cards and excluded a dashboard. Revision 2 records the owner's explicit dashboard exception, supplied reference, four-color palette and relative-unit requirement. This visual refinement changes no feature, security or backend contract. Overall implementation approval remains separate.

Revision 3 records approval of the revised light mockup and adds matching night mode with Light / Dark / System preference. No app code or cloud changes are authorized by this documentation amendment.
