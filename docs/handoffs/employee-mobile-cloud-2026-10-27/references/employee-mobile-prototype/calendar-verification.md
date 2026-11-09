# Employee calendar verification

Final bounded prototype verdict: PASS. Executed 32 grouped scenarios in each of Chromium, WebKit and Firefox (96 browser results) plus 15 pure model scenarios; 111 total, no remaining failures. This does not verify a real server or calendar provider.

Final delivered HTML SHA-256: `d3ee3f1a98a6ef1e386658aabf4bcb72cb50ee8bdbcb0b1e761beb33d9e32a76`.

## Executed checks

| Surface | Invocation | Result | Evidence |
|---|---|---|---|
| chromium | `node work/employee-mobile/calendar-next.cjs --engine=chromium` | 32/32 PASS | [Results](../../work/employee-mobile/evidence/calendar-pass/chromium/results.json), [actions](../../work/employee-mobile/evidence/calendar-pass/chromium/actions.log) |
| webkit | `node work/employee-mobile/calendar-next.cjs --engine=webkit` | 32/32 PASS | [Results](../../work/employee-mobile/evidence/calendar-pass/webkit/results.json), [actions](../../work/employee-mobile/evidence/calendar-pass/webkit/actions.log) |
| firefox | `node work/employee-mobile/calendar-next.cjs --engine=firefox` | 32/32 PASS | [Results](../../work/employee-mobile/evidence/calendar-pass/firefox/results.json), [actions](../../work/employee-mobile/evidence/calendar-pass/firefox/actions.log) |
| Pure lifecycle/session model | `node work/employee-mobile/evidence/calendar-pass/model-check.cjs` | 15/15 PASS | [Results](../../work/employee-mobile/evidence/calendar-pass/model-results.json) |

[Full manualQa matrix](../../work/employee-mobile/evidence/calendar-pass/calendar-manual-qa.md) records every criterion, exact invocation, adversarial class and screenshot artifact. Prior 237 regression checks are owned by the parent executor and are not included in this count.

Coverage includes Profile/More/Schedule closed entry and exact Back focus; initial none/active/revoked/denied/foreign/no-location/loading/unavailable/paused states; deliberate fictional creation; stubbed copy and failed-copy selection; replacement/revocation confirmation, Escape and keyboard trap; retained uncertain operation check/replay; generation conflict and duplicate-receipt rollback protection; stale session/scope guards; blur/offline/pagehide/visibility/navigation/resume and exact 45-second expiry; signout/history/restart cleanup; native provider disclosures; minimum 44px targets; widths 320/390/430/884; Light/Dark and 200% text.

## Finding and recheck

Firefox initially delivered pageshow/focus after Calendar mounted. The resume handler promoted unavailable/loading/paused fixtures to ready before an explicit status check. C12 and C13 failed on build `b811b550195b2cf24e2234a8d9517c176e53011f68083c4ab061f63554d1df27`. [Before results](../../work/employee-mobile/evidence/calendar-pass/firefox/initial-results.json), [unavailable screenshot](../../work/employee-mobile/evidence/calendar-pass/firefox/initial-C12.png), [paused screenshot](../../work/employee-mobile/evidence/calendar-pass/firefox/initial-C13.png).

The implementation owner added a guard allowing automatic refresh only after an actual prior pause. All 96 browser scenarios and all 15 model scenarios were freshly rerun against the final hash above; C12/C13 now explicitly dispatch initial pageshow and assert that mutation remains unavailable. QA made no product source edits.

The harness also needed normal React render waits after injected lifecycle events, and a paused clock before testing the 44,999/45,000ms boundary. Those changes correct measurement timing; product assertions were retained.

## Visual evidence and limits

Directly inspected rendered Light calendar, narrow provider disclosure, 200% Dark confirmation header and scrolled confirmation actions; text wraps, primary actions remain reachable, native content scrolls, and dialog heading does not collide with Close. Browser assertions also inspect overflow and target geometry. C30 explicitly verifies the page title scroll width and DOM Range text bounds at320px/200% in both Light and Dark across all three engines. [320px disclosure](../../work/employee-mobile/evidence/calendar-pass/webkit/C28-320.png), [Light created](../../work/employee-mobile/evidence/calendar-pass/webkit/C29-light.png), [200% Dark actions](../../work/employee-mobile/evidence/calendar-pass/chromium/C30-dark-dialog-actions.png).

No runtime errors or external/API requests were recorded. Clipboard writes were intercepted into an in-page array; no real clipboard, provider subscription, account login, production data, real session or external integration was exercised. Lifecycle browser events and visibility were deliberately injected; expiry used Playwright's browser clock. Viewports model phone sizes; no physical mobile device or operating-system integration is claimed. No deployment, commit or branch mutation was performed by QA. The workspace is a standalone prototype folder, not a Git checkout.
