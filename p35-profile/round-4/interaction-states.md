**Zero in the completed re-check scope — 0 P0, 0 P1, 0 P2.** Round 4 on `829dfe6cf45beb71b77db573c0263c60a5f69856`, a re-check round. The complete matrix is still running; this is not an exit certificate.

## Status of earlier findings

| ID | Status | Measurement |
|---|---|---|
| IS-15 | Fixed | Chromium and WebKit 390/100: after toggling Shift requests, scroll to **0**, blur/focus, focus returns to that switch with scroll still **0**. Desktop 1440: click switch, click blank sidebar, wait **31.5s**; exactly **1** background read, focus remains BODY, scroll **0→0**. |

## Findings

None in the measured scope.

## Checked and correct

- Save answered with **401** in the browser: while focus is kept on the switch, it moves to the on-screen **Sign in** link. If the reader clicks blank space during pending, focus remains BODY after the same response.
- Double press in each held 401 case produces **1 POST**. No save reaches the server.
- Employee and Lead Profile each produce **0 management reads, 0 saves**, render **0** `.premium-manager-profile` roots, and retain the employee Profile.
- Detailed focus/scroll/request measurements are in [evidence.json](evidence.json).

## Gaps

Window blur/focus were dispatched browser events; Playwright cannot perform native app switching. Matrix completion and the later full exit sweep are still required.
