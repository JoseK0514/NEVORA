# Premium pass (Nov 18, 2026): status labels, notes, icons and building blocks

Jose asked, after Phase 8: "go through every single warning, labels like the clocked late and all of those and every
single icon, and … make all of them more premium", then "check buttons or those stuff that can have a premium increase …
you will only make the change if it is clearly an upscale", and pointed at the information note on the Spanish Privacy
page at 390: "things like this are the ones i am talking about that needs to be improved … make sure if only upscaling".

The rule for every change: clearly better at every width, or left alone. Where a saved change looked worse on a real
page it was reverted, and the package report says why.

- Spec: [spec.md](spec.md) (inventory, target, decisions, the foundation's kit API, the packages).
- Package reports: [P2 Owner and Manager](packages/p2.md), [P3 Employee and Lead](packages/p3.md),
  [P4 Shell and navigation](packages/p4.md), [P5 Signed-out pages](packages/p5.md),
  [P6 Feature sheets and older kits](packages/p6.md). Each has its item table, every changed word, files, checks, and
  before and after pictures under `evidence/<package>/`.
- The 30-day phase screens (employment dates, Christmas bonus, Shift matching, the 12-hour flag, the Privacy page) were
  reviewed and fixed in the same round: [30-day phase QA](30-day/README.md).

## How it was run

1. **Inventory and spec.** A designer counted every status label, note, icon and building block across the app and wrote
   the target (spec sections 2 and 3). Eight open questions were settled under "only upscaling" (spec section 4).
2. **Foundation (P1).** The kit gained one chip, one quiet status, one count, one callout, one email link, one glyph per
   meaning, one icon-size ladder, one button-height ladder, one checkbox and one toast (`b-kit.tsx`, `owner-b.css`,
   `b-tokens.css`, `b-foundation.css`, `toaster.tsx`). No words changed.
3. **Five page packages** applied it, no two touching the same file, each capturing before and after on fictional data.
4. **Coordinator follow-ups** closed what the packages handed each other (below), then everything was combined, checked,
   captured again in full and looked at by eye.

## What you will notice

- **Status labels.** In a list the normal state is quiet grey text, with a small green dot when someone is on the clock:
  "● Clocked in", "On break", "Off today". Only exceptions are chips, so colour always means "look here": "Clocked in late
  · 9 min", "Not clocked in · 35 min", "Missed". One chip everywhere: 22px, 12/16 at 600, a 1px edge in its own ink.
  "Working" is gone; Home, Team, the roster and Things to do use the same words.
- **Time facts are words, not chips.** "Tomorrow", "Starts in 2 h", "In 9 days" are grey meta beside the title.
- **One count.** A 20px pill that never breaks ("At least 7" stays whole).
- **Notes.** Every tinted note is the kit's callout: a 600 title line, the body in ink2, an 18px glyph on the title's
  line, a 1px edge that survives High Contrast, one teal link. The Spanish Privacy note now reads as a title
  ("Este documento está solo en inglés") over the help path, with the address wrapping only after "@".
- **One glyph per meaning.** Red stops you (WarningCircle), amber asks you to check (Warning) or wait (Hourglass), teal
  informs (Info), privacy is ShieldCheck, "not confirmed" is a Question, done is a Check. Time off is CalendarMinus
  everywhere, Can't work UserMinus, timecards the Clock, My pay the Receipt, Help the Question, the bell one Bell. No
  filled icon outside a current entry.
- **Field errors.** One anatomy on every form: a 16px WarningCircle, red text at 500, 6px gap, on the first line.
- **Buttons.** One height ladder: 36 in card headers, 44 for row actions and state cards (drawn 44 on every width), 40 or
  48 on the band, 52 for a full-width primary. Square buttons became pills. One disabled look.
- **Shell.** The sidebar's Help sits on the entries' column at 20px, the sidebar toggle is round, the phone rail's head
  and foot hide a half-cut entry, and Payroll and My pay each have one glyph on the tab bar, sidebar, rail and More.
- **Signed-out pages.** Sign-in's notices (wrong details, too many attempts, being deleted, set up, signed out) are
  callouts with a bold first sentence; Support's safety note is a titled privacy callout inside the Email support card.

## Coordinator follow-ups (after the packages)

| What | Why |
|---|---|
| Recovery, reset and set-up banners that stop you draw WarningCircle (they drew the amber Warning in red); "not confirmed" on set-up draws the Question | One glyph per meaning (P5 hand-off; files no package owned) |
| Owner and Manager Help: the safety sentence is the teal privacy callout titled "Keep private details out of email", under the reply-time line | Matches Support and the Employee's Help (P5 hand-off) |
| Support's safety sentence kept word for word ("Never email passwords, codes, bank details or pay documents.") | P5 had changed it to "Never send …"; it is the support policy's sentence, which Phase 8 kept locked. The suggestion is on Jose's list |
| More: My pay draws the Receipt; the Employee's More draws Help as the Question | One glyph per concept (P4 hand-off) |
| Scheduling rules' save bar shows its error glyph | The quiet sheet hid every glyph in the bar, so a save error had none (P6 hand-off) |
| Desktop sign-in pages with Mobile Access: the footer takes its own row under the card | Set up, Reset and Forgot (most in Spanish) ran under "¿Necesitas ayuda?" at 1440x900 (P5 observation, present before this pass) |
| Tablets with Mobile Access (Forgot, Reset, Set up): the title block sits on the card's edge and the workplace pill is visible | The band's 36px inset reached the title inside the card, and the pill was white text on white (found by probe at 900) |
| Top-bar avatar on tablets and desktop kept white with teal initials | P4 tinted it in the person's colour; on the real bar it was not a clear upscale, so it was reverted |

## Final verification (after the packages were combined)

Six reviewers, one per surface, looked at the combined tree's pictures with fresh eyes against DESIGN.MD and this spec.
Six fix builders then closed what they found, each in its own worktree. Each fix round was combined, tested and captured
again. Reviews are in `final/reviews/`, fix reports in `final/fixes/`, their pictures in `final/evidence/`.

| Review | Surface | Blocker | Visible | Polish | Fix round | Outcome |
|---|---|---|---|---|---|---|
| [A](final/reviews/review-a.md) | Owner work pages | 2 | 21 | 9 | [FA](final/fixes/fa.md), with B's Manager rows and C's shell row | 42 fixed, 4 partly, 6 left with reasons |
| [B](final/reviews/review-b.md) | Owner settings and account pages, every Manager page | 1 | 17 | 21 | [FB](final/fixes/fb.md) for Settings and account | 16 of 16 fixed; Manager rows in FA |
| [C](final/reviews/review-c.md) | Employee and Lead | 0 | 11 | 6 | [FC](final/fixes/fc.md) | 15 fixed; row 15 reverted (below); row 17 in FA |
| [D](final/reviews/review-d.md) | Signed-out pages | 3 | 12 | 9 | [FD](final/fixes/fd.md) | 20 fixed, 2 partly, 2 wordings for Jose |
| [E](final/reviews/review-e.md) | Clocker kiosk | 0 | 11 | 16 | [FE](final/fixes/fe.md) | 25 fixed, 1 partly, 1 for Jose |
| [F](final/reviews/review-f.md) | 30-day phase screens | 0 | 10 | 22 | [FF](final/fixes/ff.md) | 20 fixed, 6 partly, 6 for Codex or Jose |

The six blockers, all fixed:
- **Person page** (A1): the header's status had lost its separator ("555-0199Off today") and was clipped at 320. It now
  reads "555-0199 · Off today" on the kit's facts line.
- **Phone touch targets** (A2): Restrictions, Add shift, Person, Updates, Home and Schedule had actions under 44px. Row
  decisions are 44 and band actions draw 40 with a 44px hit area.
- **Clocker PINs band** (B1): the search and filter sat on the band's last pixel. They now sit inside the band with 32px
  of band under them.
- **Signed-out desktop footer** (D1): the footer's reserve was counted twice, so Check your email in Spanish had a 254px
  gap and Sign in scrolled at 1440x900. Sign in no longer scrolls; cards end 52px above "Need help?".
- **High Contrast on sign-in** (D2): fields had no edge and the button read as plain text. Every field, button, pill and
  card now draws a system-colour edge under forced colours.
- **Access help and Find your Employee ID** (D3): the title block sat 37px inside the card's text edge. It now starts on
  the edge.

Coordinator decisions in this round:
- **FC row 15 reverted.** Making each card end at its content reversed Phase 4's approved end-together cards (Home on
  tablets and sideways phones, Schedule's Today and This week). That is a different layout, not clearly an upscale, so
  it is on Jose's list instead (the note is at the end of `final/fixes/fc.md`).
- **Desktop footers and save cards on the 44 step.** Card footers, correction and PIN actions and the save card's button
  moved from 42 to `--b-btn-h` (44). The band's q-nav pills and the shift cancel stay 42 for Jose.
- **Notification detail lines** join their facts with `BSegs`, like every other facts line.
- **Reset and recovery** show the green accepted note only when the link is known good (not when it is uncertain).

## Regression review of the full recapture

After every fix round was combined, every role, page and kiosk flow was captured again (19 runs, all passing) and two
fresh reviewers compared each picture with the set taken before the fix round.

- **Signed-in pages** ([regression-signed-in.md](final/reviews/regression-signed-in.md)): no blocker; the three earlier
  blockers still hold. Fixed after the review:
  - "Create calendar link" had become a full-width bar from 768px (two fix rounds each expected the other's rule); it
    is the right-aligned pill again.
  - Owner and Manager Notifications, pay statements and the Payroll band's "Up next" line now use the kit's facts line,
    so no line ends on "·", "Payday" keeps its date, and the band's two facts no longer run together.
  - Things to do's band and Team's rows at 320 no longer start or end a line on "·".
  - Add employee's Role and Location stack on phones ("Choose a loca…" was cut at 390).
  - Team's filter at 320 has room inside its pills; the account-deletion consent is back to its normal weight;
    Manager Availability faces are 36px like Team's.
  - Left for Jose: the four-line Time corrections rows (19), same-month ranges (20), the 56px delete button (21).
- **Signed-out pages, the Clocker and the 30-day screens**
  ([regression-signed-out-kiosk-30day.md](final/reviews/regression-signed-out-kiosk-30day.md)): no blocker; the
  signed-out blockers, every Clocker fix (48 of 48 and 47 of 47 steps, 0 axe violations) and FF's fixed rows hold. Fixed
  after the review:
  - Edit employee at 200% text: Role and Location stack instead of cutting "Employ…" and "Calle Lo…" (team-form pairs
    keep two columns only while each field has 8rem), and a select that is still narrow ends in "…".
  - Who's working at 320: a Not clocked in row is three lines (the name whole, "Due 12:00 PM · Calle Loíza", then the
    wait in amber) instead of four with the name broken.
  - Seen for the first time in the new desktop extras: in High Contrast the wordmark, the brand panel's glyphs and the
    step bars vanished on the forced white canvas (they draw again), and at 200% text the links under the Sign in card
    overlapped (their line height now grows with the text).
  - Not changed: the bonus year menu's cut-off last row on a sideways phone showed the page under its edge in one
    picture (FF tried two fixes and reverted them; check on a real phone), and a wrong PIN at 200% text on the Clocker
    was not captured.

## Checks on the combined tree

Source: commit `3f0b5a9d584734fe1cbf62769cd03fc82617b9a0` on `claude-codex-collab-nevora`, built on `8fa01c95`. Its tree
is byte for byte the tree these checks ran on (the combined worktree, less the untracked capture tool).

- Type check (`tsc --noEmit -p .`): no error in `src`.
- Full unit and component run (`vitest run --dir src src/app src/components src/lib`): 939 files and 14,458 tests passed,
  741 skipped, 0 failed.
- ESLint on every changed TypeScript file: clean. The stylesheet guards (B8 layering, viewport aliases, reduced motion,
  tokens) pass.
- Captures on the local harness with fictional data, on a throwaway PostgreSQL: 19 full runs (Owner, Owner settings,
  Manager, Employee, Lead at 1440, 900, 390 and 320; the touch phone held sideways for all four roles; signed-out pages
  in English and Spanish on desktop and touch with High Contrast and 200% text; the Clocker in both languages with
  200% text, High Contrast, paused and preview; the three 30-day flows), then targeted re-captures of every page a
  regression fix touched. The Clocker journeys complete 48 of 48 and 47 of 47 steps; axe found 0 violations in every
  run; no page overflows.
- User guides rebuilt from `3f0b5a9d` and verified (6 of 6) in `d174bfdf`.
- Not run here: the integration suites, the QA scripts, Development, a real device.

## For Codex

No server file, read, handler, route, contract, calculation or flag changed. `src/lib/navigation.ts` changed four
navigation glyph names only (Who's working, Hours this week, Help someone sign in, Plan and billing). Seen or needed:

1. The 30-day phase items in [30-day/README.md](30-day/README.md) (D15 and D18 bonus counting, D30 Things to do, the
   engine sentence's stray dot, the QA scripts' old classes), and FF's in [final/fixes/ff.md](final/fixes/ff.md): flag
   an open punch older than 12 hours whatever day it began (F01); say whether "Time record needs review" blocks approval
   or payroll (F28); give each observation its timecard (F27); say what a "recorded item" is (F26); the company-wide
   Manager's Shift matching and Who's working pages never reached `load` in the harness.
2. The Clocker's server sentences still say "registered" tablet; the kiosk shows its own words by code (FE).
3. Offline, the kiosk still takes a Clock in and keeps it on the tablet. Whether it should refuse is a queue rule (FE).
4. The Owner Home drew "Couldn't check your access" once while four captures and a full test run shared the Mac (FA).
   Worth a look only if it repeats on Development.
5. In the rich fictional Owner workspace, the Owner's Notifications page shows "Notifications didn't load" in every
   capture after about 4 PM (the read fails or passes its 10-second limit; it is not an access refusal). The same page
   fails the same way on the branch's starting tree `8fa01c953`, so this pass did not cause it, and the Manager's page
   loads. Worth checking `/api/notifications` for an Owner with about 130 notifications.

## For Jose

Words and looks to confirm (details in each package report):

1. Someone still on the clock after their shift ended: Home says "Still clocked in since 9:02 AM"; Team and the roster
   say "Clocked in". One phrase on both would be clearer (P2).
2. An approved swap or cover reads "Completed", a can't-work request "Approved". One word would match (P2).
3. Payroll's phone band "Scheduled payday in 9 days" is still a chip; Home shows the same kind of fact as grey text (P2).
4. Employee Home's shift card leads with your clock state as quiet words ("● Clocked in at 9:32 AM") instead of a green
   box (P3).
5. The new safety-note title "Keep private details out of email" on Support and every Help page. Spanish: Support uses
   "Datos privados fuera del correo" (tú pages), the signed-in Help "No envíe datos privados por correo"; one Spanish
   title would be cleaner. The sentence under it could become "Never send …" so title and body do not both say "email"
   (P3, P5).
6. The Spanish policy note drops "por ahora" (P5). Sign-in's notes show their first sentence as a bold title without its
   period; the words are unchanged (P5).
7. Scheduling rules' save bar now shows the done mark beside "Scheduling rules saved." (P6).
8. The rail's head shows a small up caret when entries are scrolled above (P4).

From the final review round (details in each fix report's "For Jose"):

9. Employee Home on tablets and Schedule's Today and This week: keep Phase 4's end-together cards, or let each card end
   at its content (FC row 15, reverted for now).
10. The band's q-nav pills and the shift cancel are 42px; every other footer and row action is 44.
11. Clocker lockout: keep the amber Pause as a recorded kiosk exception, or use the Hourglass that means "wait"
    everywhere else (FE).
12. Clocker words: "Done" / "Listo" and "Start over" / "Empezar de nuevo" in place of "Return to PIN"; "Your punch is
    kept on this tablet" (FE).
13. 30-day screens: "Informational only" as the disclaimer's title, hours as "750 h 30 min", "N people affected · N time
    corrections waiting", "Updates every 30 seconds.", "Return to Home" on closed pages, "Shift matching" on its closed
    band; the bonus band names the year twice (F15); a second Save in a footer on Edit employee (F12); one inline success
    look for settings saves (F23) (FF).
14. One phone gutter (14 or 16px) on every page, and one band surface (keep or drop the ruled texture) (FA).
15. Updates, Time off requests, Shift requests and Notifications have no sub-line, so their bands end higher than their
    siblings; a one-line sub-line would put them on one frame (FA).
16. The reason line under a Manager's locked Phone and Email lost its closing period to match the other reason lines (FB).
17. Signed-out wording: Support's title repeats its sentence, step names on Check your email and Choose a new password,
    a few Spanish calques, and a shorter Check your email (FD).
18. The Privacy processor list as bullets waits for counsel (30-day D33).
19. Things to do's Time corrections rows on phones read in four short lines ("8:42 AM – 5:32 PM, was" / "02 AM – 5:32 PM"),
    because the server writes "asked, was old range" as one fact. Splitting it into "Asked 8:42 AM – 5:32 PM" and "Was
    9:02 AM – 5:32 PM" changes the punctuation, so it waits for your word (and Codex, who owns that sentence).
20. Same-month date ranges are closed up ("Nov 16–22") on the Owner pages the final round named; the Timecards band,
    Insights ("Nov 16 – 18 so far"), Notifications ("Week of Nov 23 – 29") and the Employee pages still space them. One
    rule everywhere touches shared date helpers and the server's sentences, so it is listed rather than done in this pass.
21. The Employee's "Delete my account" is 56px at 17px on every width; the ladder gives a destructive confirm 52px.

## Not verified

Real phones and tablets, iPad Safari, Firefox, screen readers and Windows High Contrast on hardware. Several states the
fictional data cannot reach are checked by unit test only; each package report lists them. Also not captured: the
Owner's Notifications list with this evening's fictional data (the read fails on the starting tree too, see For Codex),
the company-wide Manager's Shift matching and Who's working pages (the harness times out on them, as before), a wrong
Clocker PIN at 200% text, and the bonus year menu on a real sideways phone.

## Release sequence

Unchanged. Codex integrates and verifies with the backend on Development. The exact verified release is promoted to main
only after Jose approves. Nothing here authorizes a main merge, a production activation, copied production data, a paid
activation or a live charge.
