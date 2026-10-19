**Not zero — 0 P0, 1 P1, 0 P2 verified so far.** Exit round 2 on exact `7679133e5ce239cf5c45b6a890bbd10d35fb2c58`; interim evidence while the full matrix and five-area sweep continue. This commit is not merge-ready.

## Status of earlier findings

- ST-WA-7: the reported 36px Swap collapse is fixed in Chromium at 320/200. Before height 88px; held pending 87.67px (subpixel pressed-size capture), document scroll delta 1px rather than 36px. One held POST. WebKit confirms the fix at 320/200: 88→88px, one held POST.
- ST-WA-1 and ST-WA-3: pending remaining placeholder/filter checks. ST-WA-2/4/5/6 remain shared coordinator findings, excluded from Wave A.

## Findings

| ID | Screen / role / width | Element | Measured defect | Crop | Cause | Specific fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-WA-8 | Edit shift, AUDIT-M, Chromium, 320×844, 200% text | Open Delete shift disclosure → `button[type=submit]` with “Delete this shift” | Before 248×88, top 654.52; held pending “Deleting…” 248×52, top 683.52. Document height 3482→3446 (−36px), scrollY 2631→2602 (−29px). The pressed button moves under the finger. | [Before](crops/chromium-delete-200-before.png), [pending](crops/chromium-delete-200-pending.png) | `src/app/app/schedule/edit/delete-shift-button.tsx:9` replaces the two-line idle label with a one-line pending label; this separate button does not use the new PendingButton height hold. | Preserve the greater idle/pending label height in layout (for example two labels in the same grid cell with the inactive one hidden), or use the same held-height treatment. Keep **88px** in this case and **52px** at 100%, with stable document height/scroll position. | P1 |

WebKit confirms ST-WA-8: 248×88 at y647.52 becomes 248×52 at y683.52; document 3562→3526 and scroll 2718→2682 (both −36px). [Before](crops/webkit-delete-200-before.png), [pending](crops/webkit-delete-200-pending.png).

## Checked and correct

- Exactly one intercepted POST for Swap, Unable to work, Add shift, Time off Approve, Time off Decline, Delete shift, New employee and Clocker PIN, each at 320/100 and 320/200 in Chromium and WebKit (32 cases total). Every mutation was held and aborted; none reached the server.
- Delete failure keeps the edit page and focuses “The shift wasn’t deleted / Check your connection and try again.” [Failure](crops/chromium-delete-200-failed.png).
- 160/160 unchanged automated checker cells pass for ten Wave A management routes at 320, Owner and Manager, four text sizes, Chromium and WebKit.

## Gaps

Remaining widths, axe, WebKit submission checks and the full five-area judgment are in progress. No completed exit or zero verdict is claimed. Source `claude/*` is unchanged; fix belongs to Wave A.
