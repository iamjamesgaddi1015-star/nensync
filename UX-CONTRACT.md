# NenSync interaction contract

Canonical behavior follows PLAN.md requirements NS-01 through NS-13, approved ALARM-PLAN.md NS-14 and DESIGN.md revision 3. Approved composition and theme tokens own all auth, workspace and settings surfaces.

| Concern | Canonical owner / behavior |
| --- | --- |
| Buttons/fields/dialogs | src/components/primitives.tsx; native semantics, visible focus, shared busy/disabled states, inline persistent errors; native select popup accepted |
| Navigation | Next routes for auth/settings, same-page anchors for Standup/Focus/Sign-off; no placeholder destinations |
| Async state | src/features/workspace/use-workspace.ts; confirmed mutations, explicit stale/error/retry; no success before persistence |
| Standup | Versioned writes, local per-user/day draft buffer, explicit conflict choice, saved/local-only distinction |
| Timer/task rules | PostgreSQL RPC is authority; one timer, three active slots, version checks and idempotent completion |
| Completion alarm (NS-14) | Approved ALARM-PLAN; focus/completion-alarm.ts owns browser sound/permission/resources and account/interval coordination; use-completion-alarm bridges observation; focus panel owns compact controls/status. Alerting does not certify persistence; no permission prompt on load or stale recovery alarm. |
| Appearance | src/components/theme-control.tsx plus globals.css; allowlisted per-device cookie, CSS system resolution before JS, no reload |
| Feedback | Inline status/errors with live region; no browser alerts/confirm/prompt; confirmation dialog restores focus |
| Demo | Explicit /demo synthetic local workspace; never claims authenticated/cloud persistence; own local storage, no real accounts |
| Locale | English messages and Intl formatting using saved IANA timezone; preserve IME composition |
| Scroll/layout | Document owns scrolling; natural panels, fluid rem/%/fr sizing; no fixed page canvas |
| Privacy/lifecycle | No sensitive text in logs/URLs; export own records only; account deletion needs verified identity and reauthentication |

Verify every action and failure path across both themes, default/enlarged fonts and phone/tablet/desktop sizes. Shared primitives and repository methods define repeated behavior; avoid equivalent screen-local implementations. A disconnected preview cannot certify hosted identity, mail or Realtime delivery.
