# Agent 3: workflows and business logic. Review tip 6601ee82a (Nov 21, 2026)

Saved by the lead from Agent 3's hand-back. The subagent could not write report files.

**Evidence:** `s*.mjs` scripts and `s*.log` logs, `shots/A3-*.png`, the exported CSV in `downloads/`, and `db.cjs` (a read-only query helper). The Clocker run is in `../../cap/qa-a3-clocker/`.

**Setup:**
- Tested on the live app at :59493 with fictional data, headless Chromium at 1440.
- Every finding was confirmed by reading the database or the server's own reply.
- Nothing was committed or sent.

**Load caveat:**
- One `next dev` server was serving all five agents. Pages took 10 s to 3 min, and the server logged 70 statement timeouts.
- The sign-in limit was hit once.
- No private copy of the app was possible, because Agent 2 held the second capture slot.

## P1
| ID | Finding | Evidence |
|---|---|---|
| A3-01 | **Add shift says it failed when it saved.** Seen 3 times: a dropped reply, a 25 s delay, and a naturally slow server. The form said "Changes could not be saved…", but the database had the shift every time (Maria Dec 13, Ana Dec 11, James Dec 12). Saving again shows "Employee already has an overlapping shift", which is the person's own shift. No duplicate was created. | `A3-lost-addshift-*.png`, `A3-slow-addshift-*.png`; logs s09e, s35, s09d |
| A3-02 | **Publish says "Nothing was changed" when it published.** With the reply dropped, "Publish Calle Loíza anyway" showed "This page didn't load. Nothing was changed." The database had Dec 7–13 as PUBLISHED, and employees were notified. A reload shows it published, so there is no double publish. | `A3-lost-publish-*.png`; s10r |
| A3-03 | **A time export can be lost for good.** The server generated the Nov 9–15 CSV, but about 2 min later the result and its Download button were gone, because the page clears them when its snapshot expires. Creating the export again is refused ("already exported… use your original downloaded files"), and the history has no re-download. Nov 2–8 worked when Download was clicked within 2 s. | `A3-03-export-result-gone.png`; s27c, s27d, s27f |
| A3-04 | **A save can vanish without a word.** In Edit employee (Luis to Lead), the save request was sent, then the periodic access re-check (about every 10 s) replaced the page with "Couldn't check your access". The save never reached the server and nothing told the Owner. A retry worked. Same mechanism as A2-01 and as the third run of A3-01. | `A3-04-inflight-save-dropped.png`; s06f, s34 |
| A3-05 | **A Manager limited to one location cannot publish, even with "Publish schedules" granted.** Daniel (Condado) has no Publish control, and `/app/schedule/publish` says "Company-wide access needed". That view never renders the controls (`schedule/page.tsx` line 141 against 535). The page still says publishing needs the grant he already has. These scoped Manager screens also use the older, pre-Direction B layout. | `A3-05-scoped-manager-no-publish.png`; s12, s17 |
| A3-06 | **A missing permission is shown as a sign-out.** Daniel's Things to do says "Your session ended. Sign in again" with the toast "Your access changed", while the APIs answer 403. Elena's Time corrections says "Correction access ended… Sign in again" when she simply lacks the permission. Seen twice. | `A3-06*.png`; s18, s32, s36 |
| A3-07 | **Backend, for Codex: every page load locks the whole workspace.** The app layout reads payroll capabilities through code that takes `workspaces FOR NO KEY UPDATE`, `employees FOR UPDATE` on every row and SHARE locks on about 15 tables (`src/lib/payroll/store.ts:22-29`), just to get three yes/no flags. All 28 traced timeouts were waiting on the workspaces row from `app/app/layout.tsx:132`. This is the likely cause of the load failures in A2-01 and A3-04. Not yet confirmed on a production build. | next.log |

## P2
| ID | Finding |
|---|---|
| A3-08 | Daniel has "Approve time off" but his list says "You're all caught up", while Carlos (Condado) has a pending Dec 2 request. His "Review time exceptions" grant still leads to "Company-wide access needed". Needs a backend check. |
| A3-09 | A seeded 7-digit phone number shows as "(555) 012-6" and blocks every unrelated save ("Enter all 10 digits"). The role-change note is a light amber tinted strip, which breaks Jose's rule. |
| A3-10 | On Add shift, a server error appeared ("approved time off during this shift"), then about 5 s later the whole form reset to blank. |
| A3-11 | Approving a time correction creates no notification. Approving time off does. |
| A3-12 | The default CSV ("Opens in Excel or Numbers") gives hours in nanoseconds (for example 87480000000000) plus a fingerprint hash. The values themselves are correct. |
| A3-13 | Rondo's day plans propose 24-hour "All day" assignments. At 6:42 PM on Nov 21 it proposed 12:00–9:00 AM for that same day. The wording is jargon ("planning ledger", "2880 configured coverage minutes"). |

## P3
- **A3-14:** The correction lost-reply note stays on screen after the item has left the list, the other rows stay disabled while it shows, and "didn't load" appears after the success.
- **A3-15:** After a lost time off approval, the person who just approved it sees the title "Already approved".
- **A3-16:** The handoff reported that a replayed lost Finalize came back "Blocked". That did **not** reproduce: "Check again" returned finalized.
- **A3-17:** Rondo's "Review source" opens Home or the whole week instead of the shift or day. "Track this issue" only changes the button to "Tracking".
- **A3-18:** Employees and Leads get a generic "Page not found" on `/app/ai-manager`. Other denied pages have designed messages.
- **A3-19:** Successful sign-ins count toward the limit of 10 per 15 min per ID, so an Owner using several devices can lock themselves out.
- **A3-20:** The Time exports page polls period-close about every 7 s while it is open.

## Task × role matrix
✅ = saved and verified after reload · ⚠ = done, with a finding · ⛔ = blocked in the UI

| Task | Owner | Company-wide Manager (Elena) | Location Manager (Daniel) | Lead (Luis) | Employee (Maria, James) |
|---|---|---|---|---|---|
| Role setup in the UI | ✅ (A3-04, A3-09) | — | ✅ grants saved (lost reply, then "Check again" showed Saved) | — | — |
| Add or edit a shift | ⚠ A3-01, A3-10 | not run | ✅ draft | ⛔ designed denial | — |
| Publish | ⚠ A3-02 | not run | ⛔ A3-05 | ⛔ designed denial | ✅ sees the shifts and is notified |
| Time correction | ✅ approved; a retry did not apply it twice | ⚠ A3-06 | ⛔ A3-08 | — | ✅ ⚠ A3-11 |
| Time off | ✅ | not run | ⚠ A3-08 | — | ✅ |
| Finalize | ✅ (lost reply recovered) | — | ⛔ | — | — |
| Invite | ✅ QA-A3-ROSA added, "Not activated", no mail sent | — | ⛔ designed denial | — | — |
| Time export | ⚠ A3-03, A3-12 | — | ⛔ | ⛔ | ⛔ |
| Clock in and out | — | — | — | — | Self clock-in on the phone doesn't exist; ✅ Clocker tablet |
| Denied actions | — | ⚠ A3-06 | ✅ "Outside the locations you manage"; ⚠ A3-06 | ✅ ⚠ A3-18 | ✅ ⚠ A3-18 |

## Lost reply and retry
| Action | What the UI said | True state | After retry |
|---|---|---|---|
| Add shift, reply lost or 25 s slow | "could not be saved" (false) | Saved | "overlapping shift"; no duplicate |
| Add shift, failed before sending | "could not be saved" (true) | Not saved | — |
| Publish, reply lost | "Nothing was changed" (false) | Published | No double publish |
| Time off, reply lost | "Already approved" | Approved | — |
| Time off, failed before sending | "isn't confirmed yet…" | Pending | "decide again" |
| Correction, reply lost | "couldn't confirm… won't be applied twice" | Approved | Applied once |
| Finalize, reply lost | "isn't confirmed yet… Check again" | Finalized | "finalized" |
| Permission toggle, reply lost | "Not confirmed · Check again" | Saved | 1 revision |
| Edit employee (A3-04) | Page replaced by the access error | Not saved, and nothing said so | A manual redo saved |

The pattern: flows that send a request ID and offer "Check again" report honestly. Add shift and Publish treat an unknown result as a definite failure.

## Clocker tablet
- The run exited 0 with 52 screenshots: 39 steps passed and the 24 accessibility scans found 0 violations.
- Clock in, recovery ("won't record it twice"), the saved-punch help, Send it again, Clock out, and both lockouts all showed.
- **Gap:** a punch that saved but whose reply was lost was not tested.

## Rondo (no AI provider)
- **Honest about what's off.** It says typed questions need an approved AI service, and Ask is disabled. The question box and starter buttons still look active.
- **(a) Recommendation:** "Compare day plans" was verified live. It is clearly hypothetical. Quality problems are in A3-13.
- **(b) Awaiting approval:** checked in the source only ("Coverage · Draft only", an acknowledgement checkbox, Save disabled until it is ticked). Every live plan included a published location, so this card never appeared.
- **(c) Saved change:** checked in the source only (done mark, "Draft saved", receipt).
- **Verdict:** the three states are designed distinctly, but only (a) was verified in a browser.

## Not checked
- Most of Elena's (company-wide Manager) actions.
- A lost reply on a scoped Manager's publish, because publishing is blocked for that role.
- A Lead's team message.
- Activating the invited person.
- Mobile, WebKit and keyboard.
- Marked-up screenshots.

## Fictional data changed on the live app
- Daniel became a Condado-only Manager.
- Luis became a Lead.
- Shifts added: James Dec 12, Maria Dec 13, Ana Dec 11, Sofía Dec 8 (draft).
- Calle Loíza Dec 7–13 published.
- Corrections approved: Maria Nov 19 and Valeria Nov 9.
- Maria's Dec 14–15 time off approved.
- Nov 9–15 finalized for Maria and James.
- Exports generated for Nov 9–15 and Nov 2–8.
- QA-A3-ROSA invited.
- One Rondo item set to "Tracking".
