# Solo verification run: review tip 6601ee82a (Nov 21, 2026, 19:02–about 21:00)

Saved by the lead from the solo agent's hand-back.

## Setup
- **Conditions:** one agent alone, on its own held app (`cap/qa-solo-live`) with a fresh fictional database. The app was restarted once, with punches and the PIN key turned on.
- **Load:** the load average was 2.2–4.6 during Tier 1 and 4–7 later, when other apps became active.
- **Sign-ins:** every role stayed under the sign-in limit.
- **Evidence:** in `shots/` and `data/`, with the scripts at the top level. Labels used: chromium-desktop, chromium-touch-emulation, webkit-playwright, source-only. Nothing was run on a real device.
- **Cleanup:** both held apps are stopped, and the temporary Spanish worktree `wt/qa-solo-es` was removed.

## Verdicts on earlier findings
| ID | Verdict | Notes |
|---|---|---|
| A2-01 | REFUTED: it was load | 12 watch windows of 90 s each on the idle app, 0 drops. The access check took 13–543 ms. With 400 ms of latency and no bandwidth cap, 0 drops. It is replaced by S-01. |
| A3-04 | REFUTED: it was load | Two runs with the save held 12 s. The save landed and the done mark showed. |
| A3-07 | CONFIRMED (contention) | One tab: 29 locking transactions, holds of 14.9 / 62.7 / 128.5 ms (median / p90 / max), 276 waits of up to 524 ms. Three tabs: holds of up to 914 ms and waits of up to 1054 ms on the `workspaces` row. No timeouts while idle, but the 1.5–3 s lock timeouts elsewhere would be reached under more load. |
| A1-23 | REFUTED: it was load | The day timeline rendered 2 of 2 times at 1440 and 390 and matches DESIGN.MD. P3: open shifts from midnight to 6 AM fall outside the axis and show only as a "4 open" chip. |
| A1-10 | CONFIRMED | Deterministic when the Things to do read fails: the headline stays on "Checking today…" (`home-b.tsx:142-143` has no "unavailable" title). |
| A1-24 | CONFIRMED | The failure-state design on Rondo. The read has a 10 s client timeout (`controller.ts:120`). |
| A2-02 | CONFIRMED at 390 | CLS 0.963 twice. The desktop value is 0. "Last week" still shifts by 0.81 + 0.23. |
| A2-03 | CONFIRMED | CLS 0.132 twice. |
| A2-04 | CONFIRMED | Next week: first visible change at 229–371 ms, ready at 3.45–5.6 s. The band and week switcher are still replaced by a generic skeleton. |
| A3-05 | CONFIRMED and extended | Elena (company-wide Manager) got "Company-wide access needed… Sign in again" for a grant that was missing. After the Owner granted it, the publish page still had no Publish control. Publishing worked from Schedule. |
| A3-06 | CONFIRMED | See S-06. |
| A3-01, A3-02, A3-03 | Not re-run | They do not depend on load, because Agent 3 forced the lost replies. The lead confirmed A3-01 in the code: `configuration-form.tsx:47-51` turns a thrown action into "Changes could not be saved", and `readiness-shift-concurrency-browser.integration.ts:187` asserts that message for a lost reply after the server answered 200. |
| A4-01 | Not reproduced | With the default font at 32px, Employee Home text stayed at 100% on both the tip and branch 425bdbf85. The state differed from Agent 4's run. Still open. |
| A4-02, A4-03 | Not re-verified | — |

## New findings
| ID | Sev | Area | Role | Viewport | What happens vs expected | Evidence | How verified |
|---|---|---|---|---|---|---|---|
| S-01 | P1 (provisional: dev build only) | Owner pages behind the access check | Owner | 390 touch, 1440 | **On Fast 3G or a 4 Mbps cap:** Schedule, Team and Edit employee never render. They show a skeleton for 25–75 s, then "Couldn't check your access", although every request returned 200. Timecards flaps about every 28 s. A bandwidth-only control fails the same way.<br>**Cause:** in `scoped-read-frame.tsx` a page view lasts at most 15 s, delivery included; the refresh starts at 65%; at expiry the view drops to the skeleton; `STUCK_MS` 2.5 s then shows the failure card.<br>**Expected:** keep the view, and show an error only when access is refused. | `data/watch-throttle.out`, `data/diag-*`, `shots/watch-*ACCESSERROR*` | chromium + touch, CDP throttling |
| S-02 | P2 | Owner Home load | Owner | 390 touch | CLS 0.57, measured twice. The missed-payroll card appears, is replaced by Today, then gets pushed down. | `shots/S-home-390-load-sequence.png` | touch |
| S-03 | P2 | Time off Approve result | Owner | 1440, 390, WebKit | The result is never announced; only "Saving your decision…" is. Focus falls to `<body>`. | `data/decide-own-approve-*.json` | chromium, webkit |
| S-04 | P2 | Delete shift confirm | Owner | 1440 | Focus lands on the red "Delete this shift" button, so pressing Enter deletes at once. DESIGN.MD says focus goes to the question. | `shots/S-decide-own-delete-shift-1440-1-confirm.png` | chromium |
| S-05 | P3 | Timecards after a batch approval | Owner | 1440 | The tab counts "Needs review 11 / Approved 6" stay stale. | `shots/S-tc-batch-approve-1440-5-result.png` | chromium |
| S-06 | P2 | Find cover save | Manager (no publish grant) | 390 | The flow offers the publish acknowledgement, then refuses with "Operational access is unavailable. Reload and try again." (`schedule/actions.ts:43`). It should say the grant is missing, before the review step. | `shots/S-findcover2-mgr-390-result.png` | touch |
| S-07 | P3 | Timecards inspector | Owner | 1440 | It is a non-modal `<dialog>`: Tab leaves it for the skip link and sidebar while it stays open. | `data/axe-kbd.json` | chromium |
| S-08 | P3 | More page | Owner, Employee | 390 | The two roles' versions are built differently. The Employee's Notifications count "9" sits in a teal tinted pill. | `shots/S-more-390-owner-employee.png` | touch |
| S-09 | P1 (proposed; raises A3-13) | Rondo day plans | Owner | 1440 | "Save 2 draft assignments" saved 00:00–24:00 shifts for Maria and Ana, checked in the database. | DB rows; `shots/S-rondo-c-*` | chromium + DB |
| S-10 | P3 | Owner Home | Owner | all | `GET /api/commerce/status` returns 404 on every Home load while commerce is off. | `data/render-*.json` | chromium |

## Also verified
- **Owner 390 baselines:** Home, Schedule, Payroll, person and Rondo all render. A5-01, A1-06, A1-12, A1-18 and A1-21 still hold. A1-08's four actions per row remain. The "View paused" notice was load.
- **Success marks and confirms:**
  - Time off approve: the mark appears in the row.
  - Timecards batch approve: an ask block with "I checked these hours", then a result 0.7 s later. Focus falls to `<body>` at several steps, including Review selected, where DESIGN.MD says focus goes to the question.
  - Delete shift: the mark appears.
  - Employee time off request: focus goes to the "Request sent" heading, which is correct.
- **Finalize through Select and the menu:** finalized 9 timecards, with the result 0.6 s after commit.
- **Find cover at 390:** 4 taps.
- **Employee off-shift Next shift card:** it comes first and renders in 0.4–0.7 s.
- **Clocker, saved but reply lost:** PASS twice, once with reduced motion. "Check if it saved" showed it recorded, and the database had no duplicate.
- **Rondo (b) and (c) in a browser:** the "Coverage · Draft only" card with its acknowledgement, and the "Draft saved" receipt. Focus goes to the heading.
- **Elena (company-wide Manager):** Add and Edit shift saved.
- **390 and WebKit workflows:** Add shift (A2-07 confirmed), time off approval and the Employee's time off request all worked.
- **WebKit spot check:** Home, Schedule, Timecards and Employee Home render with no sideways overflow.

## Measured times (system time only, warm `next dev`, load 5.9–7.1)
| Job | 1440 | 390 touch |
|---|---|---|
| Owner headline | 3.4–6.2 s | 2.9–6.7 s |
| Find cover, Owner end to end | 6.1 s | 4 taps; review screen at 4.7 s |
| Employee next shift | 0.5–0.7 s | 0.36–0.43 s |
| Timecards batch approve | 4 taps, 6.2 s end to end | — |

## Could not do
- **Production build:** the harness always starts `next dev` (`owned-next-app.ts:302,344`).
- **iOS Simulator:** access was not granted, and the booted devices belong to other sessions.
- **Manager Rondo and signed-in Spanish:** the harness's environment hook does not reach the app, so Manager Rondo is "Page not found" and Spanish stays "Sign-in pages only".
- **Invite → activation:** invitations are off locally, and a reset link is refused for a person who is not activated.
- **Not run:**
  - Elena's time off approval and timecards.
  - A scoped Manager's publish with a lost reply.
  - Repeat runs of A3-01, A3-02 and A3-03.
- **Real devices only:** VoiceOver and real-device text size.
