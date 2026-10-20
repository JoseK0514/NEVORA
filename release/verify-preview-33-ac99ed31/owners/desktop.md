# Desktop — ac99ed31 recheck

**Not zero: TC-P4-25, P2.** Owner: `claude/p4-desktop-240fe0`. Coordinate with Phase 3 for the shared Availability selectors.

| ID | Screen / role / size | Measured issue | Cause / specific correction | Evidence |
| --- | --- | --- | --- | --- |
| TC-P4-25 | Specific-week Availability, AUDIT-E, 1440px, 100% and 200%; Chromium and WebKit | `Weekly submission` and `These hours apply to this schedule week.` are 12px, below the 14px desktop floor. Both remain 12px at 200%. Manual 100% measurements are 12/18px. | `src/app/app/availability/availability.css:55,57` set 12px; the corrected phone rules do not cover desktop. Add these two selectors to the desktop kit callout role (`--nv-t-callout` / .875rem at desktop), preserving the phone role and root text scaling. | [Raw checker](../evidence/checker-phase3.json), [manual values](../evidence/supplementary.json), [Chromium crop](../crops/chromium-TC-P4-25-1440.png), [WebKit crop](../crops/webkit-TC-P4-25-1440.png) |

This extends the old TC-P3-18 context-text history to a new desktop surface; it is separate from TC-P4-22's From/Until labels. The desktop reports and current ledger were checked before assigning TC-P4-25.

IS-P4-11 passes four Owner/Manager round trips: outgoing review URL preserves `filter=requests` and `item=TIME_OFF:audit-timeoff`, Back preserves both, and Inbox reselects the same row. AL-WA-10's measured desktop card width is the required 720px.

The full Desktop exit matrix, all prior IDs, and state/large-data work remain open. This bounded check is not a zero verdict.
