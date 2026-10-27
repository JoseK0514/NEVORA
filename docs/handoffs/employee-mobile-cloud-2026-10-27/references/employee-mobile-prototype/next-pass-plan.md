# Employee mobile: next implementation pass

Continue the audited Employee feature plan in the existing isolated React prototype. Preserve Jose's selected clean teal Owner direction, official wordmark, Phosphor icons, type/spacing/radius tokens, native controls and five destinations. Other chats' Owner, desktop and access sources remain untouched.

## This pass

1. Bring Home's recorded clock status directly beneath the active shift. Remove the duplicate bottom time section. Keep an explicit route to Hours, location Clocker guidance, and separate ready/on-break/off-clock/overnight/empty/unavailable sample states.
2. Requests: full/partial-day time off, waiting/decided history, own Pending cancellation; swaps, cover offers, eligible coverage requests, incoming answers, unable-to-work reports and own activity. The fixture uses manager review for transfers, not a claim that every production policy does.
3. Availability: usual preferences, weekly overrides, submission/deadline distinctions, review/edit/receipt, protection when switching views with unsaved changes, midnight handling and explicit closed/unavailable behavior. Closing the sheet cancels uncommitted draft edits. Published shifts and approved leave stay separate.
4. Verify legacy flows plus the added scenarios in Chromium, WebKit and Firefox. Inspect phone widths, enlarged text, keyboard/focus, blocked/empty/read states and a fresh independent UI/UX review. Fix material findings before delivering.

## Boundaries

All writes are fictional and in memory. No API, real notifications, persistent customer data, credentials, server authorization, deployment or production feature configuration is changed. No phone-punching, manager approval, schedule publishing, team administration or payroll execution is introduced.

This is the next bounded pass, not a claim that all34 audited workflow groups are complete. Remaining Hours/timecards/correction history, communications, complete account tools, gated Pay and integrated revision/session/offline recovery stay in the coverage ledger. The next feature pass follows that ledger after Requests and Availability.

## Design and engineering evidence

The actual desktop source at development46e2027 defines Employee capabilities; it was inspected read-only. Its Home composition places recorded status beneath the underway shift. Existing Owner-derived primitives are reused.21st metadata search returned proposal/sleep/calorie/project trackers, which do not fit this task; no catalog package, hosted generation or subscription was used. Impeccable/premium-layout guidance governs hierarchy and bounded visual checks; React patterns govern controlled forms and honest state transitions. Cleanup follows green behavior checks.

Current implementation status and final verification belong in `next-pass-verification.md` when complete.
