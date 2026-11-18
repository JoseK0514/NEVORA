# Phase 8: final verification (Nov 18, 2026)

Phase 8 of the Nov 11 plan. Fix commit `ba762c0fea7fc14e1de357fadd8b61e76fa09775` on `claude-codex-collab-nevora`,
built on `e79ccdff` (Phases 1 to 7, the Phase 4/5 follow-ups from the other session, and the Phase 7 decisions). Not
pushed. Development had not moved (`22107a24`).

Jose's standard for this phase, in his words: "everything must look premium, clean and profesional … ensure that on the
final verification you catch anything that is not in accordance to the quality we are implementing".

## How it was run

1. **Capture.** Every Owner (39 pages), Manager (14), Employee (17) and Lead (17) page, at 1440, 900, 390, 320 and phone
   landscape; the signed-out pages in English and Spanish; the Clocker journey in both languages. 1,216 pictures.
2. **Review.** Five reviewers, one per surface group, judged every picture against `DESIGN.MD` with the
   `nevora-ui-readiness`, `tastemaker`, `better-interface` and `stop-slop` skills: [A](reviews/review-a.md) Owner work
   pages, [B](reviews/review-b.md) Owner settings and Manager, [C](reviews/review-c.md) Employee and Lead,
   [D](reviews/review-d.md) signed-out pages, [E](reviews/review-e.md) the Clocker kiosk.
3. **Fix.** Six builders, one per area, no shared files: [F1](fixes/f1.md) shell and frame, [F2a](fixes/f2a.md) Owner
   work pages, [F2b](fixes/f2b.md) settings and Clocker owner pages, [F3](fixes/f3.md) Employee, Lead and account
   deletion, [F4](fixes/f4.md) signed-out pages, [F5](fixes/f5.md) the Clocker.
4. **Verify.** Combined, checked, captured again in full, and looked at by eye.

Two things the first capture got wrong and the second fixed: "844" had been a short desktop window with a mouse, not a
phone held sideways (now a touch phone at 844x390 as well), and the signed-out bad links, finishes, Welcome and Access
help had not been reached (now captured, the finishes with forced replies, marked forced).

## What the review found and what was fixed

| | Blockers | Visible | Polish |
|---|---|---|---|
| A Owner work pages | 6 | 31 | 11 |
| B Owner settings and Manager | 4 | 31 | 11 |
| C Employee and Lead | 3 | 21 | 14 |
| D Signed-out pages | 0 | 13 | 13 |
| E Clocker kiosk | 4 | 19 | 11 |
| **Total** | **17** | **115** | **60** |

Every blocker is fixed. Each fix report has its row table (fixed, partly, needs Codex, needs Jose, not a defect).

The ones you would notice first:
- **Phone landscape.** The rail lists every entry with its label and scrolls with a visible fade; the band shrinks so the
  first card is on the first screen; the Employee screens no longer open on a blank canvas.
- **Truth on Home.** When a payroll is missing, Owner Home leads with Payroll's own red notice in Payroll's words, so the
  two pages no longer disagree.
- **One set of status words and colours.** "Clocked in late" is amber on Home and Team; Home says "Clocked in", never
  "Working"; dates from the pay schedule say "Scheduled payday".
- **Nothing cut or crushed.** "Calle Loíza" no longer loses its "C"; Payroll rows read at 320; to-do titles wrap instead
  of "Conf…"; counts never break; a time range never splits.
- **Account deletion for every role.** A working red "Delete my account", the "access ends" icon in red.
- **Signed-out pages.** One name for setting up an account in both languages (no "activate" left), Spanish policy
  chrome, one show-password eye, one header and one footer everywhere.
- **The Clocker.** It names the Owner as the one who sets a tablet up again, never shows a done mark when nothing was
  recorded, and its saved-punch help fits the tablet with Back in view.

## Checks on the committed tree

| Check | Result |
|---|---|
| Type check | Clean |
| Lint on the changed files | Clean |
| Unit tests (1,046 files) | 15,346 pass. Two tests pinned the old wording of the 404 tablet hint and the Spanish "Conectar"; updated, they pass. One tenancy test timed out under load and passes alone. The manuals guard fails by design until the manuals are rebuilt. |
| Full re-capture, every role and width, phone landscape on touch, signed-out pages in both languages | No horizontal overflow and no page errors anywhere. The flagged small targets are Employee back links and Home's "Review" at 320, which carry a 44px tap area. |
| Clocker journey | English 47 of 47 steps, Spanish 46 of 46, 0 accessibility violations |

**Not run:** a production build, the browser integration suites and QA scripts (several press words this phase
changed; the reports list them), a real phone, iPad Safari, Firefox, a screen reader, Windows High Contrast. Some
captures ran after midnight, when the fictional data's "today" moved; a few states (a draft week at 900, the
"isn't published" card on desktop) were checked by unit test only.

## For Codex

1. Home can say "2 pay periods have no payroll" only if its read carries the count (today it has the oldest period).
2. A person's hours read could send a partial total as a lower bound ("At least 8 h").
3. The Manager's notification summary counts a different scope from the badge ("20 items were waiting" against 11).
4. `src/app/app/my-time/page.tsx` now calls `readEmployeeWeeklyReview`, the read Home already uses, to show "Still
   clocked in" in amber after a shift ends. Confirm, or add today's shift end to the time read.
5. To-do items need the shift's date and time ("Review coverage offer" twice is ambiguous); the Requests hub needs the
   requester's name and the two shifts.
6. Sign-out can run past its 1-second cleanup budget while Home's first read holds the session row (`FOR SHARE`); the
   lifecycle browser test caught it once under load (`src/lib/notifications/logout.ts:30`).
7. Scripts and integration tests that press words this phase changed are listed in F4 and F5's reports.

## For Jose

All suggested words are in the fix reports. The main ones:
- **Locked sentences with suggested rewrites** (payroll or legal, unchanged here): My pay's empty line, the closed
  Payroll page, the Help contact note, the deletion consent line, the Pay PDF note, Paid time export's sentence, the
  Support answer's "recovery code", the Account deletion retention paragraph, the kiosk photo notice's first sentence.
- **New sentences to approve:** a line under Time exports ("Download the hours your team worked, by pay period."), the
  Import pay sentences, Home's "Open payroll" and "Pay period Nov 9–15 ended", "Your pay statements are in Pay.", the
  Payroll phone chip "Scheduled payday in 9 days".
- **Names:** "Privacy Policy" and "Terms of Use" stay in title case because they are the documents' titles.
- **Phase 5 changes to confirm:** the Forgot alternatives as one paragraph, no footer dots on phones, the band inset at
  36px on phones, tablets using the phone header.
- **One phone gutter for state pages** (14 or 20px today).

## Release sequence

Unchanged. Codex integrates and verifies with the backend on Development. The exact verified release is promoted to main
only after Jose approves. Nothing here authorizes a main merge, a production activation, copied production data, a paid
activation or a live charge.
