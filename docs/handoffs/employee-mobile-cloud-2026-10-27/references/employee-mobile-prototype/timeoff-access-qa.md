# Independent Time off QA

**PASS —96 final browser executions:32 scenarios in each of Chromium, WebKit and Firefox.** No implementation changes or remaining scoped failures/blockers.

HTML SHA256: `30055aa74aaf445b6f8ed793db86206eb3651d868c81fae84722314b2059673d`.

Verified module-off hiding and editable Availability; own actor/workspace/role gates; independent read/proof states; Time off-specific partial-read retry; full/partial-day and note recovery through Close, Escape and navigation; confirmed discard/Keep editing; retained UUID and fields after a known pre-send sample failure, followed by exactly one Pending request on deliberate retry; successful-send draft clearing; all12 module/access/proof/read changes at review/send/cancel in already-open sheets; own Pending cancellation and matching receipt; sign-out/direct re-entry/restart/reload clearing.

Keyboard heading reveal, Edit focus, Tab containment and exact Escape return passed all engines at390px100% and320px200% in Light/Dark. Representative screenshots were visually inspected. Monitored traffic was local HTML GETs only. The sole recorded storage write was the permitted session-ended flag; no private browser persistence or monitored operational/native calls.

EM-A03 is closed for this prototype. EM-R01's local prototype gate contract is addressed; real server authorization remains future integration verification. Only the Time off portion of EM-A05 is addressed; Schedule remains open. This is not full desktop parity, real-device/assistive-technology certification or live transport-uncertainty verification.

The authoritative read-only checkout remains clean at46e202786863279302026ee03a0e225c359fa55c; all11 frozen source files match. No branch, commit or deployment was created.

Evidence: [manualQa matrix](../../work/employee-mobile/evidence/timeoff-access-pass/independent-qa/timeoff-access-manual-qa.md), [machine summary](../../work/employee-mobile/evidence/timeoff-access-pass/independent-qa/summary.json), [runner](../../work/employee-mobile/evidence/timeoff-access-pass/independent-qa/run.cjs). Per-engine raw results, traces and screenshots are in the same evidence directory. Initial harness failures are retained separately and excluded from final counts. No user action is required for this QA slice.
