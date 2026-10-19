# Candidate finding onb9567ab

Exact source `b9567abc26b977a517b77622a1661b16172f5b16`. The unchanged supplied checker has SHA256 `e1324bcdafee65f70142a35e3cc27edd205e03b2fd13618835b8eb74a802ff2d`. All four failed cells are retained verbatim in [payroll-type-floor-failed-cells.json](payroll-type-floor-failed-cells.json), plus the full8-cell Payroll batch and console log. No real payroll operation is sent.

| ID | Severity | Screen and measured defect | Minimum correction |
|---|---|---|---|
| TC-RC-PAYROLL-01 | P2 | Owner, `/app/payroll`,1440×900 at100% and200% text, Chromium and WebKit: `.pw-workflow-guidance` and its nested `strong` (“Next step:”) compute **13px**, below the14px desktop kit floor. The other checks in those cells pass; all four phone Payroll cells pass. Named filename/document/job labels independently pass their earlier repair. | Scope the desktop legacy Payroll guidance and its strong lead to the existing14px kit callout role; preserve the phone rule and wording. Recheck all8 Payroll cells unchanged. |

The four concrete failures are `smallText` only: no overflow, undersized target, unexpected console/page error or axe violation. These are retained as a failure at this checkpoint; the whole72-cell b956 sample cannot be called green. Cause: `src/app/app/payroll/payroll-workflow.css:148` assigns `font-size:calc(13 * var(--type-unit, 1px))` to `.payroll-workflow .pw-workflow-guidance`; `src/components/payroll/payroll-runs.tsx:38` renders its strong lead. [Context crop](crops/chromium-payroll-guidance-1440x900-t100.png), [close-up](crops/chromium-payroll-guidance-closeup.png), and `payroll-type-floor-crop.json` are captured read-only after the checker closes and before owned preview shutdown.
