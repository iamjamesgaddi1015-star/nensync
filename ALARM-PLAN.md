# NenSync timer alarm amendment

Status: APPROVED FOR LOCAL IMPLEMENTATION. The owner chose A (implement and test) after reviewing this amendment. Understanding and scoped approval are recorded separately. The tested PLAN.md v1.2 baseline remains approved. Existing-project feature only; retain the approved architecture and dashboard.

## Confirmed understanding

The owner requested an alarm, selected C (one chime plus desktop notification), then A (NenSync stays open, including a background tab). Team tasks remain private; the capability question did not authorize team-sharing implementation. No closed-tab or locked-phone push is included.

## Proposed behavior

- Play one gentle chime when an observed running focus or break reaches its trusted deadline. Pause/cancel must not trigger it. Alerting is independent of persistence: offline completion must remain labeled unconfirmed until reconciliation succeeds.
- Add compact Sound, Test alarm and Enable desktop notifications controls within the existing focus panel. Sound starts enabled and is prepared by an explicit Start/Resume/Test interaction. Remember mute and notification choices in this browser; no account fields or database writes.
- Ask notification permission only after Enable desktop notifications is clicked. With granted permission, show a generic "Focus interval finished" or "Break finished" notification. Include no task, standup, name or team content. Clicking focuses the existing app and focus section.
- Permission refusal, unsupported APIs, blocked audio and unavailable storage must not stop the timer. Explain limitations inline; retain visible completion feedback. Never repeatedly prompt after refusal. Test alarm verifies the chime directly.
- Prevent repeated alerts during retries, rerenders and same-browser tab synchronization. Coordinate same-origin tabs locally, preferring an active-capable tab; test unavailable coordination APIs. Separate enabled devices may each alert; cross-device suppression is not promised.
- Suppress historical alarm replay on reload/recovery. For an already observed running interval, allow a delayed alert up to one minute after its deadline, then retain normal recovery without a stale alarm. This proposed grace period is not a delivery-time guarantee.

Browser/OS sleep, suspension, notification settings and autoplay policy may delay or suppress alerts. Keeping the app open does not guarantee OS delivery. Desktop notifications target supporting desktop browsers. Unsupported mobile notification paths retain permitted sound and visible feedback; no service-worker/push setup is included.

## Stages and acceptance

1. Engineering adds browser-only alerts and bounded cleanup; preserve existing deadline, completion-credit, idempotency and RLS contracts. Use platform Web Audio/Notifications APIs; no new dependencies, service, remote calls or migration.
2. UX/engineering adds custom keyboard-accessible controls, labels and status using relative sizing and approved Light/Dark/System tokens. Preserve layout hierarchy and responsive reachability.
3. QA tests chime/notification attempts, mute/test/permission choices, denied/unsupported paths, pause/cancel, retries, two tabs, offline deadlines, account switching and stale recovery. Use synthetic browser API spies, plus actual Edge sound/notification smoke checks where possible. Spies prove API calls, not audibility or OS delivery.
4. Security reviews notification privacy and account/interval isolation. Run affected lint/type/build and timer/browser regressions; inspect narrow/wide light/dark states. Update README, interaction/design notes, VERIFICATION, TASKS and RESUME; bind new reviews to the changed artifact. Prior reviews cover the baseline only until this amendment is verified.

NS-14 passes when eligible focus/break completion produces one chime attempt and, with explicit granted permission, one generic notification attempt per browser. Mute/denial must not prevent completion logging. Counts remain correct after retries and multiple tabs. No load-time permission prompt, private notification content, cancellation alarm, historical recovery alarm or repeated uncontrolled alert is acceptable.

Local storage and cross-tab coordination are best-effort; failures must not block the timer and limitations must be recorded. Other browsers/phones and OS delivery remain distinguished from automated checks. No new cost, cloud activation or third-party integration is proposed. Generic notification content is processed/displayed by the user's browser/OS. Existing live-service/release gates remain unchanged.

Rollback: revert only the amendment's source/test changes and close alert resources; preserve timer data and unrelated work. This plan does not authorize team sharing or deployment. The owner approved this exact amendment; implementation and independent reviews are complete. Full browser suite 26/26 and domain/database suite 14/14 pass. See VERIFICATION.md for final candidate identity, executed commands and platform limitations.

## Sources

Read 2026-11-04: [Notifications permission and usage](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API), [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices). Feature-detect browser support; do not promise guaranteed background delivery.
