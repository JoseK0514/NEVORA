# Phase 3 / coordinator — ac99ed31 recheck

**Not zero: retained TC-P3-09, P2.** Fresh evidence is bound to `ac99ed311a4ef07b61175fa9f926c0862121a1e5`. This is a named-ID regression pass during the open exits, not a completed full exit or an independent release certificate.

| ID | Current evidence | Disposition |
| --- | --- | --- |
| TC-P3-09 | Last-updated dates are whole after 4f666237. The context-card range still splits `Nov 1` at 390px / 200% for Employee and Lead in both engines. Chromium y539.016 → y599.016; WebKit y579.516 → y639.516: 60px between the month and day. | Partly fixed; keep the existing ID open. |
| TC-P3-32 | Home has zero split date/time atoms in eight Employee/Lead, 320/390, 200% observations across Chromium/WebKit. | Checked criterion passes. |
| TC-P3-34 | Notifications renders `Notifi-` / `cations` at 320/200 with deliberate soft hyphens; no document overflow in eight observations. | Checked title criterion passes; other historical surfaces retain their own status. |
| AL-47 | Selected Availability section and Specific week pill remain horizontally visible after 200% text reflow and eight subsequent portrait/landscape/width changes. | Checked criterion passes. |
| P3-ST-01 | Both payroll actors: Chromium card 155 → 155px, read-arrival CLS 0.000567; WebKit 154.5 → 154.5px. WebKit does not support the CLS observer; its zero is not a CLS measurement. | Checked compact-card criterion passes. |
| IS-WA-12 / IS-P4-11 shared portions | Clean field names and both sides of the selected Inbox item round-trip are exercised separately in the naming/interaction evidence. | Checked criteria pass. |

TC-P3-09 cause: `src/app/app/availability/page.tsx:165` still renders the context `formatWeekRange(selectedWeek)` without the existing `keepWhole` wrapper. The Last updated line at 167 has the new wrapper. Apply `keepWhole` to the displayed context range, and recheck 320/390 at 150/200%; keep breaks after the range dash. No new application patch was applied here.

Evidence: [named observations](../evidence/named-rechecks.json), [resize observations](../evidence/supplementary.json), [Chromium range crop](../crops/chromium-TC-P3-09-week-context-390-200.png), [WebKit range crop](../crops/webkit-TC-P3-09-week-context-390-200.png).

The 135-ID/full-state/large-data Phase 3 exit scope remains open. Earlier source reports are preserved under their actual SHA; no full-round pass counts are inherited.
