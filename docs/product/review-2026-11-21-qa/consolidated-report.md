# NEVORA senior UI QA: consolidated report (Nov 21, 2026)

Saved to the repository on Nov 22, 2026, from the text Jose shared, so Claude and Codex work from the same report. The
per-agent findings files are in [`findings/`](findings/) (`agent1.md` to `agent5.md`, `solo.md`, `GAPS.md`); the
screenshots and scripts are still in `.ui-work/qa1121/` on Jose's Mac. The fix plan is in
[docs/handoffs/2026-11-22-qa1121-fix-plan.md](../../handoffs/2026-11-22-qa1121-fix-plan.md).

## Source and environment

- **What was tested:** the review branch `origin/claude-codex-collab-nevora` at `6601ee82a`, checked out as a detached
  worktree at `.ui-work/wt/qa1121`. The local branch in the main checkout is 4 commits behind it.
- **How it ran:** locally, on a throwaway Postgres database with the fictional workspace Northside QA Workforce, through
  the `cap-rs.sh` harness running `next dev`. Rondo's switches were on but no AI provider was configured.
- **What was not used:** no shared database, real mail or SMS, payment provider or AI provider. No production build was
  tested.
- **No changes were made:** no source edits, commits or pushes, and no Development or production deployment.
- **Release sequence still applies:** integrate and verify on Development; promote the exact verified release to main
  only after Jose approves.

**How the work was split:** five agents worked in parallel, then one solo agent re-ran every blocked check on an idle
machine.

- In the parallel phase, one shared app served five agents. Load reached a 60 load average, and every agent shared one
  Owner login, which hit the limit of 10 sign-ins per 15 minutes.
- Those load-dependent failures were then re-tested alone (load 2–7). Three of the P1s were refuted that way.

**Evidence labels:**

- chromium-desktop
- chromium-touch-emulation
- webkit-playwright
- ios-simulator (Agent 2 only)
- source-only
- axe
- a11y-tree (the accessibility tree predicts what a screen reader announces; it is not a VoiceOver result)

Nothing ran on a real iPhone or iPad, and no screen reader was used.

Full per-agent findings are in `findings/`: `agent1.md` to `agent5.md`, `solo.md`, `GAPS.md` and the competitor
research files. Screenshots and scripts are in `.ui-work/qa1121/<agent>/`, which git ignores. Copy any shot you want to
keep.

## Verdict

This build is not ready to promote. Twelve P1 findings hold:

- Four on what the app says after a save (A3-01, A3-02, A3-03, A3-06/S-06).
- One permissions gap (A3-05).
- One backend lock problem (A3-07).
- One problem keeping pages on screen over slow connections (S-01).
- One Rondo data bug (S-09).
- Three accessibility issues (A4-01, A4-02, A4-03).

**What's strong:**

- The visual system holds across areas:
  - Inter and Phosphor only.
  - No tinted buttons or labels left.
  - 10px button corners.
  - Plain grey counts.
  - Status shown as a dot plus words.
  - No horizontal overflow at any width.
- The "Check again" recovery flows are honest and never apply anything twice: corrections, time off, Finalize,
  permissions and the Clocker, including a punch that saved but lost its reply.
- Signed-out pages and the Clocker are release-quality in both languages: 0 axe violations in 35 states, with tú and
  infinitive buttons as the voice guide asks.
- The desktop Owner Home answers "what needs me today" on one screen.

## P1: must fix before production

| ID | Area | What happens | Status | Owner |
|---|---|---|---|---|
| A3-01 | Add shift | When the reply is lost or slow, the form says "Changes could not be saved" although the shift was saved. Saving again shows "overlapping shift", which is the person's own shift. | Confirmed in the database 3 times. The lead confirmed it in code: `src/components/configuration-form.tsx:47-51` maps any thrown action to that text, and `readiness-shift-concurrency-browser.integration.ts:187` asserts it for a lost reply after the server answered 200. Other flows say "could not be confirmed". | Claude (UI) |
| A3-02 | Publish | When the reply is lost, the page says "This page didn't load. Nothing was changed." The schedule was published and employees were notified. | Confirmed in the database. | Claude + Codex |
| A3-03 | Time export | The "Export ready" result and its Download button disappear when the page's snapshot expires (about 2 minutes). Creating the export again is refused ("already exported"), and the history has no re-download, so the Owner can lose the file for good. | Confirmed in the database and in the UI. | Codex (re-download) + Claude |
| A3-05 | Scoped Manager publish | A location Manager with "Publish schedules" has no Publish control: the non-company view never renders it (`src/app/app/schedule/page.tsx:137-141`), and that view is still the older layout. The solo agent extended this: the company-wide Manager's publish page also lacks the control after the grant. | Confirmed by the agent and the solo agent; the lead read the code. | Codex + Claude |
| A3-06, S-06 | Permission messages | A missing permission reads "Your session ended. Sign in again", "Correction access ended… Sign in again" or "Operational access is unavailable. Reload and try again". Find cover offers the publish acknowledgement, then refuses. | Confirmed twice, and again by the solo agent. | Claude + Codex |
| A3-07 | Backend: every page load | The layout's payroll-capability read (`app/app/layout.tsx:132` → `src/lib/payroll/store.ts:22-29`) takes workspaces FOR NO KEY UPDATE, employees FOR UPDATE and SHARE locks on about 15 tables just to get three yes/no values. One user: 276 lock waits in 32 s (up to 524 ms). Three tabs: holds of up to 914 ms. Under load it caused all 28 traced timeouts. | Contention confirmed while idle; the timeouts depend on load. | Codex |
| S-01 | Access frame on slow networks | With Fast 3G or a 4 Mbps cap, Owner Schedule, Team and Edit employee never render. Each shows a skeleton, then "Couldn't check your access", although every request returned 200. Timecards flaps about every 28 s. In `src/components/company-access/scoped-read-frame.tsx`, a view lasts at most 15 s including delivery, expiry drops the view, and `STUCK_MS` turns a slow check into a failure. | Provisional: measured on `next dev` bundles only. Repeat on a production build before shipping. A2-01 and A3-04 were the same mechanism under load. | Claude (UI) + Codex |
| S-09 | Rondo day plans | "Save 2 draft assignments" saved 00:00–24:00 shifts for two people. The plans also propose same-day hours that have already passed, and the wording is jargon ("planning ledger", "2880 configured coverage minutes"). | Confirmed in the database. | Codex + Claude |
| A4-01 | Employee Home, 200% text, 390 | Lines draw over each other and labels are clipped (WCAG 1.4.4). | Agent 4 reproduced it twice. The solo agent's 32px default font did not change the text size on that page, so its run neither confirms nor refutes this. Re-test with a matched state and on a real iPhone with Larger Text. Branch `425bdbf85` says it fixes this. | Claude |
| A4-02 | Owner Home, 200% text, 1440 | The overdue-payroll line and the payday date overlap themselves, and quick actions truncate (1.4.4). | Agent 4 reproduced it twice. | Claude |
| A4-03 | Team list | Each row's `aria-label` replaces the visible content. It drops the status ("On break", "Clocked in late · 9 min") and adds a phone number that is not on screen (1.3.1, 2.5.3, 4.1.2). | Seen in the accessibility tree and in axe, 2 runs. | Claude |

**Refuted by the solo run (they were load):**

- A2-01 (pages drop content while idle).
- A3-04 (an in-flight save dropped).
- A1-23 (Schedule day view failing). The day timeline renders and matches DESIGN.MD.

## P2: should fix

**Feedback and resilience**

- A1-01: six different designs for failure and "unavailable" screens; DESIGN.MD names one BState card.
- A1-02: Payroll on the phone shows bare "Request could not be completed." with no card.
- A1-10: the Home headline stays on "Checking today…" whenever the Things to do read fails.
- A1-24: the Rondo failure uses the information circle and shows two near-duplicate notices.
- A3-10: Add shift blanks the whole form about 5 s after a server error.
- A3-11: approving a correction sends no notification; time off does.
- A3-08: a scoped Manager's time off list says "all caught up" while one of his location's requests is pending
  (backend).
- A3-09: a seeded 7-digit phone number blocks unrelated saves, and the role-change note is an amber tinted strip.
- A3-12: the default CSV shows hours in nanoseconds.

**Layout shift and loading**

- A2-02: Timecards jumps while loading (CLS 0.963 at 390, confirmed twice); tapping Last week shifts 0.81.
- A2-03 / S-02: Owner Home briefly shows "First week setup" (CLS 0.13 at 1440, 0.57 at 390).
- A2-04: Next week swaps the band and week switcher for a generic skeleton; ready in 3.5–5.6 s on dev.

**Responsive**

- A1-04: the Team filter becomes a 2x2 grey grid on phones.
- A2-05: Home shortcut labels truncate at 768–803 px.
- A2-06: Schedule capsules truncate at 768 touch, and the "open" chips are 36 px tall (DESIGN.MD B1 sets a 44 px floor
  on touch tablets).
- A2-07: Add shift's Save is only in the non-sticky header, so it scrolls away above the keyboard (confirmed again by
  the solo agent).
- A2-08: the Clocker breaks words mid-word at 667x375 and at 200% text in short landscape ("Continu/e").

**Visual consistency**

- A1-03: Employee Schedule week tiles are filled and tinted, not the white capsules.
- A1-05: Time off policies' empty state mixes three button styles.
- A1-08: Rondo shows four actions per issue row (12 in the first three).

**Accessibility**

- A4-04: 106 accessible names reword the visible label, which breaks voice commands (2.5.3).
- A4-05: in forced colors, the bell, wordmark, selected day, Confirm edge and legend swatches disappear.
- A4-06: Team filter counts are 4.19:1.
- A4-13: closing the shift sheet opened from Home drops focus to `<body>` and leaves the person on Schedule.
- A4-14: the band search field shows almost no focus.
- S-03: a time off approval result is never announced and focus falls to `<body>`.
- S-04: the Delete shift confirm puts focus on the destructive button.

**Language**

- A4-07: an Owner whose device asks for Spanish gets Spanish blocks inside English chrome, including "Políticas de
  tiempo libre", which the glossary bans.

**Ease of use**

- A5-01: on the phone, the missed-payroll card sits 1.3 screens down.
- A5-02 / A5-03: call-outs that leave a shift uncovered are missing from Home, and approving one gives no way to cover
  it (about 8 actions over 5 screens).
- A5-04: Find cover shows no hours-after or overtime cue, and "Best fit" went to someone 5 h over target.
- A5-07: an Employee on shift has to scroll 1.6 screens on the phone to see the next shift.
- A5-09: the Timecards total includes a 113 h open punch with no note.

## P3: polish

All are listed in the findings files:

- Agent 1: A1-06, A1-07, A1-09, A1-11 to A1-22.
- Agent 2: A2-09 to A2-15.
- Agent 3: A3-13 to A3-20.
- Agent 4: A4-08 to A4-12.
- Agent 5: A5-05, A5-06, A5-08, A5-10 to A5-12.
- Solo: S-05, S-07, S-08, S-10.

**Decisions for Jose:**

- A1-06: may the Payroll "Up next" steps keep their tinted numeral circles?
- A2-15: may the Clocker language button keep its light teal fill?
- A1-20: should the sidebar order differ by role?
- A5-08: what wording should the Pay page use when no statement has been published yet?

## Product research: top recommendations (Agent 5)

Scored out of 16 on the TEAM-RULES scorecard. Sources are first-party and dated in `findings/`.

1. "Approve and find cover" on call-outs, with uncovered call-outs placed among the coverage rows (A5-02, A5-03).
   Score 15.
2. Find cover shows hours-after and an overtime cue, says why someone is Best fit, and who was left out (A5-04, A5-05).
   This matches When I Work's OT/Max badge and 7shifts' warnings. Score 15.
3. No-show rows get Call and Find cover. Score 14.
4. On the phone, Owner Home puts an overdue payroll first (A5-01). Score 16.
5. The Employee's on-shift card adds "Next: …" (A5-07). Score 16.

**Strengths to keep:**

- Desktop Home on one screen.
- Find cover is 2 clicks from Home.
- Approvals state their consequences.
- The Timecards integrity model: "Approve N ready" leaves out cards with issues, self-approval is blocked, and
  approve-then-finalize locks the timecard.
- Pay is one tap.

## Coverage matrix (summary)

| Area | Visual | Responsive (320–1440) | Workflows | A11y and language | Research |
|---|---|---|---|---|---|
| Home | ✓ | ✓ (A2-03, A2-05, S-02) | ✓ | ✓ (A4-01, A4-02) | ✓ jobs 1, 3 |
| Schedule (week and day) | ✓ | ✓ (A2-04, A2-06, A2-10) | ✓ (A3-01, A3-02, A3-05) | ✓ (A4-05) | ✓ job 2 |
| Team / person | ✓ | ✓ (A1-04, A2-13) | ✓ invite, roles | ✓ (A4-03) | — |
| Payroll / Timecards / export | ✓ | ✓ (A2-02) | ✓ (A3-03) | ✓ | ✓ job 4 |
| Rondo | ✓ | ✓ | ✓ states a, b, c (S-09) | ✓ | — |
| Settings | ✓ | ✓ | partly | partly | — |
| Clocker | — | ✓ incl. short landscape | ✓ incl. lost reply | ✓ en/es, axe 0 | — |
| Signed-out pages | — | ✓ | — | ✓ en/es, axe 0 | — |

## Not covered, and what is needed

| Gap | Why | Needed |
|---|---|---|
| Real iPhone and iPad | Not connected | A human run of Employee Home, Add shift with the keyboard, and the Clocker in landscape |
| VoiceOver, TalkBack, NVDA, Voice Control | Can't be automated here | The manual list in `findings/agent4.md` |
| Production build | The harness only starts `next dev` (`owned-next-app.ts:302,344`) | A `next build && next start` option in the harness, then re-run S-01, A2-02, A2-04 and A3-07 |
| Manager Rondo, signed-in Spanish (branch `425bdbf85`) | The harness environment hook doesn't reach the app (`NEVORA_MANAGER_ADVISOR_*`, `NEVORA_SPANISH_PREVIEW`) | Pass these through `createOwnedNextApp` options, as the Owner advisor flags already are |
| Invite → activation | Invitations are off locally, and a reset link is refused for a person who is not activated | A local activation-link path in the harness |
| iOS Simulator Clocker and iPad | Access to a device wasn't granted, and the booted devices belonged to other sessions | Grant one simulator to the QA run |
| Elena's time off approval and timecards, and a scoped Manager's publish with a lost reply | Ran out of time; publishing is blocked by A3-05 | Re-run after the A3-05 fix |

## Harness and environment notes for the next run

- **Sign-in limit:** successful sign-ins count toward the limit of 10 per 15 minutes per ID (A3-19). Parallel agents
  must reuse a saved session.
- **Rondo switches:** the rstest harness's spawn-hook check rejects them. The fixture now takes the Owner advisor
  switches as options, so `zz-scan/` in `wt/qa1121` has a one-line local patch. The master copy in `.ui-work/zzkit/rs`
  is unpatched.
- **Subagent reports:** subagents cannot write `.md` report files, so the lead saved every findings file from the
  agents' messages.
