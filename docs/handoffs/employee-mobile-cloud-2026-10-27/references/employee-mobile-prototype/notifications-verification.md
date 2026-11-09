# Employee mobile: notifications and updates

Implemented in the [local interactive prototype](index.html), preserving the approved Owner-derived teal Employee system. Final HTML SHA-256: `f22cdd5636fb14f2c1da8c67d0e8de70348adea2475fcb2875599f0f03a3fcb7`.

## Connected behavior and boundaries

- The bell opens Notifications. More provides separate Notifications and Updates rows. Notifications supports All/Unread/Action needed, type search, dated groups and exact current-record destinations. Unknown receipt state is not presented as unread.
- Local sources cover schedule, own time off, incoming shift requests, Unable to work, weekly availability and permitted updates. A dated callout uses an explicit fixture. Exchange/module-disabled, stale, expired and removed sources are withheld or require refresh. Device-test and Pay-statement destinations remain with their gated account/Pay follow-up work.
- Generic notification Mark read stays excluded for Employees. Opening never confirms a schedule, acknowledges a message or records an automatic read receipt.
- Updates supports All/To review/Reviewed and current message details. Required acknowledgement needs an explicit review checkbox and exact revision/content match; it confirms receipt rather than agreement or attendance. Informational updates use a separate version-bound Mark read action.
- Message today's team requires a current own published, unreleased assignment overlapping the business day at Aguada, including overnight overlap. Title/body, optional future expiration, audience preview, review/edit and explicit local publication receipt use shared components. No broad scope, required-acknowledgement authoring, named coworker receipt list or Employee revision editor is exposed.
- Own eligible today-team posts can be withdrawn after confirmation. Uncertain operations retain the original identifier and payload across in-app navigation; status lookup precedes deliberate original replay. Current local permission, source version and audience checks still apply.
- Lists and actions include loading/error/empty/partial, denied/session-ended, module-off, no-assignment, source revision/audience change and uncertain-result fixtures. These simulate the bounded flow; they do not replace server controls.

## Verification actually run

| Check | Result |
| --- | --- |
| Strict TypeScript |PASS, `work/employee-mobile/evidence/notifications-pass/typecheck.log` |
| Build and saved-byte reproduction |PASS esbuild and `build.mjs --check`; saved/served/source-build bytes agree |
| Existing integrated coverage |149 cases perengine PASS, preserving Home, Schedule, Requests, Availability, Hours/timecards/corrections and prior refinements |
| New notification/update coverage |32 grouped cases perengine PASS in Chromium/WebKit/Firefox; no captured runtime errors or external requests |
| Total integrated coverage |181 cases perengine, all33 result files tied to the final HTML hash; [checks.json](checks.json) |
| Pure communication policy/model |19 assertions PASS, including own recipient/author, revoked/module/expiry, current/overnight assignments, immutable version operations, validation and one-result replay |
| Independent UI/UX review |Initial full review plus bounded final recheck: APPROVE / ship for this local prototype. Both findings resolved; [report](notifications-ui-review.md) |
| Focus regression |Independently reproduced prior offscreen review at320px/200%; final reviewer checked nine viewport/text/browser combinations with the focused heading visible and expiration copy clear |
| 21st review |45 source files;23 informational color advisories in canonical tokens only;0 fixed. Metadata inspiration searched; no catalog code installed or hosted AI generation used |
| Artifact integrity |Five frozen references and25 output screenshot hashes agree; all25 rasters carry origin metadata;45 source modules below250 nonblank/noncomment lines |

Browser coverage includes320/390/430px mobile,660px and the884px review viewport,200% text, internal text-column fit, keyboard/focus, native checkbox, touch geometry, source-specific destinations, receipts, draft retention, permitted own withdrawal, validation and recovery. The only baseline assertion changed was the bell's accessible name from Your updates to Your notifications; its disabled-loading assertion remains intact.

Source authority was inspected read-only at clean detached development `46e202786863279302026ee03a0e225c359fa55c`. Key application anchors are `src/app/app/notifications/page.tsx`, `src/lib/data/employee-notification-list.server.ts`, `src/app/api/notifications/read/route.ts`, and `src/lib/communications/{policy,validation,service.server}.ts`. Source trace and exact commands/results are retained under `work/employee-mobile/evidence/notifications-pass/` and `notifications-review/`.

The finish review and design-documentation roles were supplied by available independent fidelity-review and documenter agents; the skill's exact named agents were unavailable. The [design record](notifications-design-record.md) compares the ordinary extension to the incumbent contract and preserves preexisting metadata drift.

## Limits and handoff

This is a fictional, in-memory mobile prototype. Document refresh resets sample drafts, receipts and operation recovery. No real publication, acknowledgement, notification, API, device permission, subscription, analytics or customer data changed. Session/offline and transport fixtures do not certify live authentication, fresh server grants, persistent operation lookup, real notification coverage/pagination or durable delivery. Native-device keyboards/pickers and screen readers are not certified.

The workspace has no Git repository, branch, commit or PR. The real application checkout remains clean and detached/read-only; no deployment occurred. No standalone lint or security scanner is configured; neither is reported as passing.

No user action is required to finish this local pass. The preview is left on Updates. Next work is Profile/account and gated Pay, followed by live integration and permission verification recorded in the [desktop parity ledger](desktop-parity-audit.md). This is not full production Employee parity.

[Notifications](notifications.png) · [Updates](updates.png) · [Required update](update-detail.png) · [Team-message review](team-message-review.png) · [Uncertain-action recovery](update-recovery.png)
