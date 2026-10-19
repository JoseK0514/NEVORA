**Incomplete — no zero verdict.** Wave C exit round 4, exact `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. The limited recheck covers seven dialogs and blocked save bars; full state/role coverage remains unfinished. No additional IS finding is counted separately from WR-WC-25 and ST-13.

## Earlier findings

| ID | Status | Evidence |
|---|---|---|
| IS-6 | Fixed in fresh destructive-dialog cases | Archive break,Replace tablet and Revoke access start on Cancel in all 24 sampled combinations. Add/Edit break and Add/Rename device start in the name field. |
| IS-15 | Fixed in prior exact-SHA ST-02 scope | Toasts clear the measured bar in both engines, 320/390, 100/200%. Fresh large-error bar issue remains ST-13. |

## Checked and correct

- [56 dialog combinations](evidence/dialog-proof.json): all seven dialogs, 320/390, 100/200%,Chromium and WebKit. Initial focus as above; 56/56 Escape dismissals return focus to the exact opener.
- Source and browser-proof dialogs lock root scrolling (`overflow:hidden`). Pending and blocked-failure states are captured for each case. Every double activation produces **one intercepted request**; all are held and aborted locally.
- [28 pending-label centering cases](evidence/dialog-center-summary.json): all seven dialogs at 320/390 and 200%, both engines. Ready/pending bounds remain unchanged; no label/text overflow, page or hydration errors. Every double activation produces one held, locally aborted POST; 28/28 Escape dismissals restore the opener.
- [16 guarded save-bar cases](evidence/bars.json): both engines, 320×568/390×844,100/200%,Features and Policies; one request per double activation,zero hydration warnings. No save reaches the server.
- [Initial unchanged checker](evidence/checks-initial.json): 26/26 samples, all 13 Owner routes, 320/100, both browsers, axe.

## Findings counted elsewhere

- WR-WC-25: source dialog labels collapse; the phone flex repair is proven for bounds. The separately authorized centering completion also passes the limited phone proof in [Widths/roles](widths-roles.md).
- ST-13: the source's large-text error bar can hide its notice above the viewport; guarded reproduction and bounded-feedback proof are in [Stability](stability.md).

## Gaps

Full validation, Tab cycles,401/403,offline,paused,ready/empty/large mocked receipts,issued-code presentation,reduced motion and role variants remain queued. Earlier partial focus-trap/scroll-return evidence is preserved in `../round-4/dialogs.json`; it is not substituted for unrun fresh cases. The coordinator authorized only the additional pending-label centering proof after the initial freeze; broader coverage remains stopped for the candidate test gate.

Zero open P0–P2 in this area: **not certified; incomplete**.
