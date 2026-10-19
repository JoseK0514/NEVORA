**Not zero — 0 P0, 1 P1, 0 P2 newly verified.** Exit round 4 on `ea58610bf3bdc85319895689c3d88e064f6a76d5`. IS-16's alerts retry is repaired, but session recovery can focus a Sign in link below the viewport. Full exit coverage remains incomplete.

## Status of earlier findings

- **IS-16: fixed in the re-checked scope.** Alerts-panel Try again focuses **`UL#profile-alerts-list`** after success; the next Tab reaches the first switch. At 390/100 the list is **308…676** for Owner and **376…676** for Manager, in both browsers. At 320/200 the longer list intersects the viewport and Tab reveals the first switch.
- **IS-15: fixed in the completed phone return samples.** Tap/keyboard use, scroll to top, simulated leave/return: **scrollY 0→0** for both roles, both engines and 390/100 plus 320/200. Desktop background-read behavior still needs this exit re-check.
- The earlier save-401 focus claim is **partly fixed**: target selection works, but large-text visibility fails (IS-PROFILE-17).

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| IS-PROFILE-17 (IS-17) | Profile, Owner and Manager, 320/200; Chromium and WebKit | `.pmp-topics-note a[href="/login"]` after an alert save and read both return 401 | Focus moves to Sign in, but its **52px** box is entirely below the viewport. Chromium: Owner **1059.52…1111.52**, Manager **920.52…972.52**. WebKit: Owner **1079.52…1131.52**, Manager **940.52…992.52**. Viewport ends **844** and tab bar starts **761**. The user sees a blank held alert panel, with no visible focused recovery action. | [Chromium Owner](crops/IS-PROFILE-17-chromium-QAOWNER-320-t200.png), [Manager](crops/IS-PROFILE-17-chromium-AUDIT-M-320-t200.png); [WebKit Owner](crops/IS-PROFILE-17-webkit-QAOWNER-320-t200.png) | `src/components/manager-profile/manager-profile-live.tsx:339` restores the denied-state link using `focus({preventScroll:true})` without revealing it. Its centered position in the held tall panel is far below the previously focused switch. | Only for this user-initiated denied-save outcome, reveal the selected Sign in link if its box is outside the usable viewport. Use the measured header/tab bar and **8px** clearance, then `focus({preventScroll:true})`. Keep the existing “reader moved on” guard and ready/background return behavior. Plain `scrollIntoView` still leaves about **3px** under the 83px bar because current root padding is 80px; account for the actual bar height. | P1 |

## Checked and correct

- Eight role/browser/phone-text state samples: alerts retry recovery, held save + double Space, failed save, paused return, offline return and ended session. Each double Space produced **1 intercepted save**, with switch focus retained through pending and a 500 response.
- [Focused-session proof](session-focus.json) uses fresh contexts: each sends **1 mocked save**, answers its read with 401, measures the off-screen link before any scrolling, then performs a browser-only reveal. No server data changes or sign-outs.
- At 390/100, denied-save recovery is visible: Owner link **596…648**, Manager **562…614** in Chromium.

- [Twelve ready large/empty fixture captures](extra-fixtures.json) include reduced motion in Chromium landscape. The four desktop blur/return/poll cases retain the same focused details and **scrollY 0** for **31s**; no passive focus jump reproduces there. Native blur remains a Mac check.

## Gaps

Other controls/topics, card-head retry, slow/success/timeout behavior, larger fixtures, desktop polling/focus, role regressions and the full matrix remain incomplete. Native blur/keyboard checks stay on the Mac. The old exact-source report is retained in [history](history/829dfe6/interaction-states.md).
