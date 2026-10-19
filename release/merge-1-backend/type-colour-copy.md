# Merge 1 · backend · type, colour and copy

**Unpublished diagnostic snapshot, superseded by the concurrent Wave A candidate.** These measurements belong to `2fafc1a`, not published `0e01046` or the current coordinator refresh `25dca8d`. The protected push was rejected when the remote moved; no newer candidate was overwritten.

**Not zero: 0 P0, 1 P1, 1 P2 verified in this combined sample.** Both are existing UI consistency issues visible in the merged build; neither is attributed to the mechanical confirmation cleanup. The rest of the area remains incomplete.

Source: `2fafc1aa84f43a120d2f8fff4c3855ebf4b15dcf`; backend merge `29ebdc5`, coordinator base `634795d`. These are combined checks of the initial backend integration and its separate authorized confirmation cleanup. No UI chat is admitted as zero. Later coordinator commits are queued and do not inherit this result.

## Earlier findings

Inherited shell text below the floor (notably the 10px platform credit) is already assigned to the shared shell/Desktop owner in the inspection brief. It is acknowledged once below and is not refiled for every page.

## Findings, worst first

| ID | Screen · role · width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity · owner |
|---|---|---|---|---|---|---|---|
| TC-RCBE-01 | Schedule · Employee AUDIT-E · Chromium, 768px, 100% (checker repeats at larger text) | `.my-week-title p`, `.employee-agenda-date small`, `.my-shift-options-body .my-schedule-link` | The year/time-zone line is 13px, Today is 12px, and Request a swap / Unable to work are 13px, below the desktop 14px floor. The first two larger-text cells still report those fixed pixel sizes. | `crops/schedule-small-text-crop.png`; `evidence/schedule-small-text.json` | `src/app/app/schedule/employee-schedule.css:16`, `:42`, `:49` | Desktop override at >=768px to at least 14px, preferably 0.875rem so enlarged root text actually grows; preserve the phone 15px floor and the existing 44px targets. | P1 · Desktop chat, coordinating with Phase 3 for Employee/Lead styles |
| TC-RCBE-02 | Home and Inbox · Manager AUDIT-M · Chromium, 390px, 100%, forced failed action-center read | `.premium-pending-failed .premium-note`; `.inbox-status [role=status]` | The same intercepted read produces “What needs you isn’t available right now.” on Home and “The Inbox isn’t available right now.” on Inbox. Both show Try again; neither follows the brief's “Couldn’t load {thing}.” wording. Exactly one read was aborted per page; no mutation was sent. | `crops/failure-home-crop.png`, `crops/failure-inbox-crop.png` | `src/components/premium-home.tsx:277`; `src/components/manager-inbox.tsx:23` | Use the agreed failure pattern, e.g. “Couldn’t load tasks.” for Home's failed task read and “Couldn’t load Inbox.” for Inbox. Preserve ready Today content and the existing retry handlers. | P2 · Phase 3/coordinator, Home/Inbox owner |

## Shell (for the coordinator)

Schedule's checker also sees “Powered by VELANI LLC” at 10px on desktop. This is the known shared-shell finding, not a new backend-page issue. Owning chats: Desktop/shared shell; keep it on their existing list.

## Checked and correct

- 390px/100% Home and Inbox smoke cells have no text-floor, target or axe flags; the single redirect context race passed its one retry.
- Backend Profile read returns four Manager topics and five Owner topics, matching the approved topic set; no payroll/legal wording changed.
- The wording finding is a browser-only failed-read state, not evidence of an actual backend outage.

## Gaps

Full route/text-size/type/contrast sweeps remain incomplete. Axe at the sampled size does not establish every state's contrast. Schedule matrix completed: 80/128 original cells passed; all 48 desktop cells flag small text after the one timeout retry. Raw results and retry are included. No zero verdict.
