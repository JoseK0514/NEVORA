**Not zero — 0 P0, 0 P1, 1 P2 confirmed.** Exit round 5 on `227150bb2658cb5a30db3c644b6b8f76031d3c79`. The reported Availability label floor is repaired; the full TC exit sweep remains outstanding.

## Status of earlier findings

**Cloud TC-P3-32 (Availability From/Until; chat's TC-P3-33): fixed** in the re-checked cells. Employee/Lead specific-week editable labels now render at **15/20px** at 390/100 and **30/40px** at 320/200, in Chromium and WebKit. [Exact label metrics](label-fonts.json).

The chat's TC-P3-32 refers to dates, a different ID collision. That date item and the remaining TC IDs remain under full re-check. **TC-P3-25 is partly fixed:** six read surfaces provide Try again, but failed Timecards keeps Refresh, as measured below.

**TC-P3-28: fixed in the measured controls, remainder pending.** Timecards Choose a period is **19/25px**; Time off Full day/Partial day are **15/20px** (**30/40px** at 200%); More Close is **15/20px**, **30/40px** at 200%, in both browsers and all four shell roles. [Re-check metrics](type-rechecks.json). My schedule Today and the remaining kit-role scope still need exact-source judgment.

**TC-P3-31: partly fixed.** Time off retains its entered dates/note, but Availability loses the checkbox’s DOM value after failure; that is counted once as IS-P3-03.

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| TC-P3-25 | Timecards, Employee/Lead, 390/100; both browsers | Failed-read Refresh control | After a browser-answered **503**, the message says “Couldn’t load timecards. Check your connection, then try again.” There are **0 Try again controls**; the visible recovery remains **Refresh**, unlike the other six read surfaces. Judgment: the action still works, but it misses the brief’s shared failure pattern. | [Chromium](crops/TC-P3-25-chromium-timecards-503-390.png), [WebKit](crops/TC-P3-25-webkit-timecards-503-390.png) | `src/components/timecards.tsx:84,164` changes only the message; the button labels depend on viewport rather than read outcome. | Store a failed-read state and show **Try again**, with accessible name **Try again to load timecards**, on the existing retry control. Retain **Refresh** for a current ready period. | P2 |

## Checked and correct

- Actual editable From/Until spans meet the phone floor, including Lead after enabling Monday in local form state.
- The new shared Time off submit reserves both labels: idle and pending are **211×52px** at 390/100. This closes the incidental width-change observation from the earlier source.

## Suggestions for Jose

My pay’s 503 reads “Statements unavailable / Payroll could not complete this request.” Consider the shared failure pattern “Couldn’t load your pay statements.” This is payroll wording and **is not counted**.

## Gaps

Remaining copy, contrast, dates, times, role fixtures and the complete matrix/axe are incomplete. No full-round zero verdict is claimed.
