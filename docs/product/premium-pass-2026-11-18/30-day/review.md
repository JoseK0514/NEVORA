# Review 30: the 30-day phase screens (Nov 18, 2026)

Independent UI review of the screens added by the 30-day phase, at `8fa01c953` (the merged `claude-codex-collab-nevora`),
in the detached worktree `U/wt/review30`. Review only: no application file was changed, nothing was committed, pushed or
branched. Every picture was taken with `U/cap.sh` on an owned loopback PostgreSQL with fictional people. My scan steps
live in the worktree's untracked `zz-scan/review30.ts` (plus small additions to its copies of `clocker-flow.ts` and
`public.ts`).

Standard used: `U/p9/RULES.md` (Design, Checking your work), `DESIGN.MD` "Current direction" and "Inspection fixes" with
Phase 8's notes, the premium pass spec (`docs/product/premium-pass-2026-11-18/spec.md`), and the skills
`nevora-ui-readiness`, `tastemaker`, `better-interface`, `better-accessibility` and `stop-slop`.

## How it was run

| Run (`U/cap/…`) | Role and context | What it covered |
|---|---|---|
| `r30-owner` | Owner, desktop browser at 1440, 900, 390, 320 | Add employee (steps, three refusals, success), Edit employee, Team, profile, Access; Insights; Christmas bonus hours (data, year selector, keyboard walk, not Puerto Rico, read failure, empty); Shift matching (invalid values, save, conflict, reload, read failure); Who's working and Things to do; date leak checks and the Insights CSV export; 200% text; motion |
| `r30-owner2` | Owner, 1440 and 390 | Saved dates with a past termination date, the open review rows, the leak checks with a stored birth date |
| `r30-manager` | Elena Ruiz (company-wide Manager), 1440 and 390, then Gabriela Santos as a Manager limited to Calle Loíza | Add and Edit employee (Manager on an Employee, on an Owner, on herself), Christmas bonus hours with "Add hire date" rows and the link, Shift matching closed, the limited Manager's closed pages |
| `r30-lead`, `r30-employee` | James Ortiz as Lead and as Employee, 1440, 900, 390, 320 | Closed pages for the bonus report, Shift matching, Add and Edit employee, Insights; his own pages searched for his stored dates |
| `r30-touch` | Owner on a touch phone, 844x390 and 390x844 | Add employee, Edit employee, Christmas bonus hours, Shift matching |
| `r30-public` | Signed out, English and Spanish, 320, 390, 768, 1440 | Privacy (layout, measures, axe), sign in, reset, set up, 404 (`<html lang>`, document title) |
| `r30-kiosk` | The Clocker, 1024x768 and 768x1024 | 200% text and High Contrast, measured; James's stored dates searched on every kiosk step |

Forced or changed data, all inside the run's throwaway database and marked in the logs: the bonus read failure (the view
`nevora_timecard_latest` renamed for one page load), the Shift matching read failure (its table renamed for one load),
the non Puerto Rico workspace (time zone set to New York, then restored), the empty bonus year (hire dates cleared, then
restored), a second browser tab saving first (the conflict), and a fictional open punch for Miguel Reyes clocked in 13 h 20
min earlier with no shift. The bonus year data is fictional: 263 punches from June to August 2026 for four people and ten
approved and finalized timecards, made with the app's own timecard service. The fixture's people are created today, so in
`r30-manager` and `r30-owner2` three of them were back-dated to 2025 to reach the "Add hire date" rows, and three
fictional phone numbers were made valid so the edit sheet could save.

Automated checks: axe-core 4.13 (WCAG 2.0 to 2.2 A and AA plus best practice) on 66 page states; keyboard walks of 14 to 40
Tab stops with the focus ring read from computed styles; horizontal overflow and controls under 44px on every capture.

## Verdicts

### 1. Employment dates (Team, Add employee and Edit employee)

**Not ready.** The rules hold: only the Owner and company-wide Managers see the three fields (a Manager editing an Owner
gets none, Leads and Employees get the closed page, a location-limited Manager gets an "unavailable" page, D09), a termination date
never deactivates anyone (Maria Rivera saved with a termination date of Oct 31, 2026 and of Dec 31, 2026 stays active, in
the Team count and without a Reactivate control), and the dates appeared in none of the 54 page loads searched across the four roles and the kiosk, nor in the Insights CSV
export for two periods (HTML and the inline page data were searched, not only the visible text). The one exception is by
design: the Christmas bonus report shows hire dates to Owners and Managers. The screens around them are
not premium yet: on desktop the Edit sheet's Save and Cancel are invisible (D01), Next on Add employee opens step 2 with an
error already shown (D02), and a refused date is reported at the foot of the form instead of at the field, with focus
lost (D03). The fields themselves are clean and well labelled; the help lines are short and true, except the bonus line in
workspaces outside Puerto Rico (D38). One question for Jose: a Manager can open their own Edit sheet and change
their own hire date, which sets their own bonus threshold (Elena Ruiz saw and could edit hers).

### 2. Christmas bonus hours (`/app/reports/christmas-bonus`)

**Close, with work.** The page answers its question: per-person hours against 700 or 1,350, five statuses that read
correctly against the data (Reached for 790 of 700 h, Check breaks for 750 h 30 with 79 h of breaks, Not reached, Add
hire date with a working link, and Not confirmed, which fires too eagerly, D15), the disclaimer first, no money anywhere, Puerto Rico only (the Insights row
and the page both close for a New York workspace), and designed closed pages for Leads and Employees. No overflow at any
width and no axe violations. What keeps it from premium: the year control is a heavy card of its own (D11), the
unfinalized-days warning floats on the canvas (D12), facts break mid-value on phones (D13), the summary counts the wrong
things (D16), the empty and failed states are generic (D08, D17), a location-limited Manager gets an error-looking page
(D09), and the data rule hides people added after the year ended (D18).

### 3. Early clock-in grace (Settings, Clocker, Shift matching)

**Not ready.** The behaviour is right: Owner only (Managers, Leads and Employees get the Settings closed card), 0 by
default, whole minutes 0 to 30 enforced (31, empty, 2.5 and -1 all refused at the field with focus kept there), the
conflict from a second tab is caught with "Reload setting" and focus moves to it, the reload restores the saved 5 and
focuses the field, and a failed read shows a proper error card that changes nothing. The presentation breaks four Direction
B rules at once: Save is a filled button before any change (D22), results are bare coloured lines with red for an
uncertain result (D23), the field error has its own look (D24), and in the conflict the working button sits under a dead
one (D25). The Spanish strings exist and read well, but the page always renders English (see Copy).

### 4. "No clock-out after 12 hours"

**Not ready where it matters.** The engine flags the open punch (the Insights export lists `OPEN_PAST_LIMIT` for the 13 h
punch and nothing is closed or changed), and the attendance review shows the label in red on that person's row. But the
figure beside it is the time past 12 hours, not the time open, and the panel is not Direction B (D31). And the Owner does
not see it unless they look for it: Who's working shows the same person as an ordinary "In since 9:59 PM" (yesterday) (and another open since Nov 12 as
"In since 10:58 AM"), the review sits in a collapsed row with no count (D29), and no Action Center or Things to do item
appears because the Action Center component is not mounted anywhere (D30).

### 5. Privacy page (layout only)

**Acceptable, one layout fix.** The new categories sit in the existing bullets and read cleanly at every width; the
English-only note, accordion, footer and Spanish chrome are unchanged and axe-clean. The new processor list is a single
1,116-character paragraph, 15 lines at 1440, beside sections that use bullets (D33). The text itself is pending counsel and
was not judged.

### Premium read (tastemaker, against DESIGN.MD)

These are working screens, so the ceiling is **Coherent**: one system, finished edges, nothing that looks assembled.

| Screen | Spacing | Type | Colour | Alignment | Rung reached |
|---|---|---|---|---|---|
| Employment dates | holds | holds | fails on the Edit band (D01) | calendar icon mid-field (D06), centred sheet title (D39) | below Coherent: the result and error strips (D03, D04) are a second, older voice |
| Christmas bonus hours | holds | three sizes in a row line (16 name, 12 chip, 13 meta) read busy at 320 | amber used for two meanings (D12, D15) | stats 6px left of the card text; figures misaligned at 320 (D13) | close to Coherent; the year card and floating note (D11, D12) break the rhythm |
| Shift matching | holds | holds | teal and red lines where kit callouts belong (D23) | help wider than the field block (D26) | below Coherent: the footer buttons and messages do not follow the ladder (D22, D25) |
| 12-hour label | n/a | 11px chip text in an older panel | red chip correct | bordered stat boxes and an eyebrow (D31) | below Coherent: the panel predates Direction B |
| Privacy | holds | holds | holds | holds | Coherent, with one listing problem (D33) |

What to protect: the bonus page's plain disclaimer-first order and its one detail line per person; the date fields'
honest help lines; Shift matching's focus handling, which is the best on these screens.

### Closed states by role

| Page | Owner | Company-wide Manager | Manager for one location | Lead | Employee |
|---|---|---|---|---|---|
| Add employee, date fields | Open | Open | "Employee creation unavailable" (D09) | "That page is for Owners and Managers" | Same as Lead |
| Edit employee, date fields | Open (self too) | Open for Employees and herself; no dates on an Owner, with "Only an Owner can change another Owner." | "Employee profile unavailable" (D09) | Closed page | Closed page |
| Christmas bonus hours | Open; closed notice outside Puerto Rico | Open | "Christmas bonus hours unavailable" (D09) | "Christmas bonus hours are for Owners and Managers", Open Time | Same as Lead |
| Shift matching | Open | "Settings are for Owners. Shift matching is part of Settings, which only Owners can change. Ask Jose Natal." | Same as Manager, without a next step | "Settings are for Owners" | Same as Lead |

Every closed page for Leads, Employees and the company-wide Manager is the designed state card (lock in a 48px circle,
reason, one tinted step) and passes axe. The location-limited Manager's pages are the exception (D09).

### The three notes from the capture-tool rebuild

| Note | Verdict | Measured |
|---|---|---|
| At 200% text the kiosk band clock clips ("10:35 A") and the keypad runs below the screen | **Confirmed** | 1024x768: the clock row is 394px wide in a 297px column and the band clips at x 369, so "11:25 A" shows and "M" is cut. Continue sits at 742 to 809 in a 768 window. 768x1024: the keypad ends at 1109 and Continue at 1125 to 1191 in a 1024 window. The page scrolls, so nothing is unreachable, but the step does not fit. D34, D35 |
| In High Contrast the kiosk PIN field shows two dots at its left edge | **Confirmed** | After two digits the hidden password input draws its own two bullets and a black caret at its left edge: its colour is rgb(0, 0, 0) under forced colours and transparent otherwise. D36 |
| Spanish signed-out pages keep `<html lang="en">` | **Confirmed, smaller than it sounds** | All 20 Spanish captures report `<html lang="en">`, but `<main lang="es">` wraps everything visible (nothing is rendered outside main), and the legal articles are `lang="en"` as intended. What is left is the document title ("Iniciar sesión · NEVORA") announced under English and the Spanish 404 titled "NEVORA Workforce". D37 |

## Defects

Counts: 1 blocker, 23 visible, 16 polish (40 rows).

Severity: **blocker** stops release; **visible** a careful person notices or a Direction B or WCAG A/AA rule is broken;
**polish** small and local. "Pre-existing" marks a defect the phase did not introduce but that now sits on a screen in its
scope. Evidence files are in `U/p9/review30-evidence/`.

| # | Severity | Route, width, role | What is wrong (measured) | Evidence | Rule | Likely source | Fix |
|---|---|---|---|---|---|---|---|
| D01 | blocker | `/app/employees/[id]?edit=1`, 1440, 900 and touch 844, Owner and Manager | Cancel and Save on the band are teal text on the teal band: #0B6E69 on #0C726C, 1.05:1 (axe color-contrast, serious). Cancel sits at 292,88 and Save at 1064,88, both invisible, so the new dates cannot be saved by sight on tablets and desktop. At 390 they are white text and a white pill. Pre-existing on the sheet. | manager-r30-edit-head-1440.png, manager-r30-edit-head-900.png, manager-r30-edit-head-390.png, touch-r30-edit-maria-844.png, manager-scan-log.json (`editHead`, axe) | WCAG 1.4.3; DESIGN "one filled teal button per screen" | `src/app/app/owner-b-desktop.css:188` moves the sheet head onto the band without recolouring its controls (`team-forms.css` colours remain) | Give the desktop sheet head's Cancel the on-band white and its Save the white band pill, as the phone header does. |
| D02 | visible | `/app/employees/new`, every width and touch 844, Owner and Manager | Pressing Next submits the form: step 2 opens with "Enter an employee ID" in red and focus on that empty field (`aria-invalid="true"`). Pre-existing. | owner-r30-add-step2-1440.png, owner-r30-add-step2-320.png, touch-r30-add-step2-844.png, `addStep2Focus` in owner-scan-log.json | DESIGN step flows (focus to the step heading, no error before the person acts) | `src/components/company-access/new-employee-form.tsx:72` and `:35`: the same button element becomes `type="submit"` Add while its click is handled | Render Next and Add as separately keyed buttons so the click that advances can never submit. |
| D03 | visible | Add employee and Edit employee, 1440 and 390, Owner and Manager | A refused date is one red sentence below the buttons, in a pink strip with no inner padding; the field is not marked invalid. After the server's refusal focus is lost (`document.activeElement` is body); after the form's own check it stays on Add. The 1900 floor shows "Use 1900-01-01 or more" (ISO, while the field shows mm/dd/yyyy) and leaves the previous refusal on screen. | owner-r30-add-err-order-1440.png, owner-r30-add-err-future-390.png, owner-r30-edit-err-order-1440.png; `addOrder`, `addFuture`, `addFloor`, `editOrder` in the logs | DESIGN Forms (one error style under the field, glyph, no period); RULES focus after an error | `src/components/company-access/employee-access-form.tsx:38`; `commands.ts` `employmentDatesFromForm`; the shared field validation's range message | Show `hireDate`, `terminationDate` and `birthDate` refusals (and the order check) as the field's inline error with `aria-invalid`, focus the first, and word the floor "Enter a date in 1900 or later". |
| D04 | visible | Add employee and Edit employee, 1440 and 390, Owner and Manager | Success is a green text strip under a disabled form ("Employee details saved. Reload the employee to review current access before making another change.") with a grey "Reload current employee"; no done mark; focus drops to body. Pre-existing. | owner-r30-add-saved-1440.png, manager-r30-edit-saved-1440.png; `addSaved` | DESIGN Phase 7 Success and "Said once" | `employee-access-form.tsx:36-43` | Replace the form with the kit's done state ("Maria Rivera's details saved") and one tinted next step, and focus its title. |
| D05 | polish | `/app/employees/new`, every width, Owner and Manager | The three dates sit on step 2 "Where they work", after the locations, not with "Their details". | owner-r30-add-step2-1440.png | DESIGN step flows (one decision per step) | `new-employee-form.tsx:66` | Move the date fields to step 1 under Role and Location. |
| D06 | polish | Date fields, 1440 and 900 | The calendar icon floats at x 456 in a 560px field that starts at x 319 (137px in, 423px short of the right edge), while selects keep their chevron at the right edge. | owner-r30-add-step2-1440.png, owner-r30-edit-maria-1440.png | CR-402 one strong edge | `src/components/employment-date-fields.tsx` (`input.c-in[type=date]`), corp field CSS | Let the date's edit area grow so the picker icon sits at the field's right edge. |
| D07 | polish | `/app/employees/new`, 320, Owner | The step line reads "Step 2 of 2 · Where they w", cut by the Add pill. Pre-existing. | owner-r30-add-step2-320.png | RULES 320 usable | `src/components/team/team-forms.css:7` (`.c-formhead__step` no wrap) | Let the step line wrap under the title, or drop "· Where they work" under 360px. |
| D08 | visible | Christmas bonus hours, read failure (forced), 1440 and 390, Owner | The generic card says "Current information could not be confirmed. Reconnect and reload this page." (it blames the connection), has no title, makes "Return to Home" the filled button and the retry secondary, and the band has no back link to Insights. | owner-r30-bonus-readfail-1440.png | DESIGN Phase 2 (what happened, what to do, one retry) | `src/app/app/reports/christmas-bonus/page.tsx:33`, `src/components/company-access/operational-unavailable.tsx:7` | For `read_failed`, show the kit error card "Couldn't load Christmas bonus hours" and "Nothing was changed." with one filled Try again under the Insights back link. |
| D09 | visible | Christmas bonus hours, Insights, Add employee, Edit employee, 1440 and 390, Manager for one location | Closed pages look like failures: "Christmas bonus hours unavailable", no card title, "This page needs current company-wide management access. Return to Home, or sign in again if your access changed." and three buttons (filled Return to Home, Sign in again, Refresh current view). | manager-r30-scoped-bonus-1440-fold.png, manager-r30-scoped-add-1440-fold.png, manager-r30-scoped-editmaria-390-fold.png | DESIGN Phase 3 Closed pages | `operational-unavailable.tsx:7` (`access_denied`) | For `access_denied`, use the designed closed notice: the page's name, "needs company-wide access", who can grant it, one tinted step. |
| D10 | visible | `/app/reports`, 1440 and 390, Owner and Manager | The Christmas bonus row is an untitled card at the foot of the period cards; "Yearly reports" exists only as `aria-label`, so the row reads as part of "Nov 16 – 18 so far". | owner-r30-insights-1440.png | CR-002 proximity, TS-003 | `src/components/reports.tsx:535` | Give the card the visible title "Yearly reports". |
| D11 | visible | Christmas bonus hours, 1440 and 900, Owner and Manager | The year is a card of its own: a 766px select (the form block stops at 560) and a grey Show year under it, between the disclaimer and the figures. Insights keeps its period in a band pill. | owner-r30-bonus-1440.png, owner-r30-bonus-900.png | DESIGN frame (560 form block), TS-006 single voice | `src/components/christmas-bonus-report.tsx:78-89` | Put the year in the band as a pill menu like Insights' period, or cap the field at 560 with Show year beside it. |
| D12 | visible | Christmas bonus hours, every width, Owner and Manager | The unfinalized-days warning is amber text floating on the canvas between At a glance and People, with no glyph or card; at 1440 its link sits alone on a second line. | owner-r30-bonus-1440.png, owner-r30-bonus-390.png | Premium spec 3.2 note anatomy; DESIGN "a note that qualifies a card is that card's footer" | `christmas-bonus-report.tsx:93-96` | Make it an amber callout (wait glyph) as the People card's first child, with Open Timecards as its action. |
| D13 | polish | Christmas bonus hours, 390 and 320, Owner and Manager | Facts break mid-value: "· ID" ends a line, "OWN-" and "CARL" split at 390; "Nov 15 –" and "Dec 15, 2026" split at 390 and 320 despite `keepWhole`; at 320 "Need a hire date" wraps and its figure sits 16px below the other two. | owner-r30-bonus-390.png, owner-r30-bonus-320.png, manager-r30-bonus-390.png | DESIGN Phase 8 (time ranges never split, nothing cut), CR-402 | `christmas-bonus-report.tsx:40-49`, `:74`, `:91` | Keep "ID" and its value together and unbroken, let the range drop under its label on phones, label the stat "No hire date". |
| D14 | polish | Christmas bonus hours, every width | "Not reached" is small grey text glued to the name ("Rosa Lebrón Not reached") with no separator; the chips are the older `CorpPill`. | owner-r30-bonus-1440.png | Premium spec 3.1 (quiet normal state, one chip) | `christmas-bonus-report.tsx:25-36` | Use `BStatusText` for Not reached and `BChip` for the other four. |
| D15 | visible | Christmas bonus hours, every width | "Not confirmed" (amber) shows for Carlos Vega at 632 of 1,350 h with one unfinalized day: 718 h short, which one day cannot close, yet he gets the same look-here chip as a close case. | owner-r30-bonus-1440.png | DESIGN status colour (amber waits or checks), Truth | `src/lib/reports/christmas-bonus.ts` `bonusStatus` (Codex) | For Codex: Not confirmed only when the unfinalized days could close the gap; otherwise Not reached with the days noted. |
| D16 | polish | Christmas bonus hours, every width | At a glance counts People, Reached and Need a hire date, but not Check breaks or Not confirmed, the two statuses that ask for a decision. | owner-r30-bonus-1440.png | TS-003, TS-010 | `christmas-bonus-report.tsx:91` | Show Reached, Check breaks, Not confirmed and No hire date; the People card already counts people. |
| D17 | visible | Christmas bonus hours, an empty year, 1440 and 390, Owner (data cleared for the shot) | The empty state is plain text without the tray glyph and says "No one other than Owners was employed or recorded time in this bonus year", which NEVORA cannot know; At a glance still shows three zeros. | owner-r30-bonus-empty-1440.png | DESIGN states (empty kind, grey, tray glyph), Truth | `christmas-bonus-report.tsx:100` | Use the kit's empty state, "No hours recorded in NEVORA for this bonus year", and hide At a glance when no one is listed. |
| D18 | visible | Christmas bonus hours, every width, Owner and Manager | People added to NEVORA after the year ended and without a hire date are neither listed nor counted: the Owner run listed 5 people and "Need a hire date 0" while 7 active non-Owners had no hire date. With three of them back-dated to 2025 they appear as "Add hire date". A business that joins in October or November, the payment season, gets no prompt. | owner-r30-bonus-1440.png against manager-r30-bonus-1440.png | Truth; TS-005 edge cases | `src/lib/reports/christmas-bonus.server.ts` people rule on `created_at` (Codex) | For Codex and Jose: list every active non-Owner without a hire date as "No hire date", or say on the page who is left out and why. |
| D19 | polish | Christmas bonus hours outside Puerto Rico, 1440, 390, 320, Owner | The notice uses the lock glyph (a permission meaning) for a jurisdiction rule. | owner-r30-bonus-nonpr-1440.png | Premium spec 3.2 (one glyph per meaning) | `src/app/app/reports/christmas-bonus/page.tsx:31` | Use the information glyph; keep Open Insights. |
| D20 | polish | Christmas bonus hours loading (source) | The placeholder draws three cards with avatar rows; the page has four cards and rows without avatars. Not seen in the browser: a client navigation from Insights kept Insights on screen until the page arrived (shots at 300 and 900 ms). | owner-r30-bonus-loading-300ms-1440.png | DESIGN Phase 7 (a placeholder that no longer matches its page is a bug) | `src/components/owner-b/b-loading.tsx:57` | Four cards: three lines, one field, three stats, five rows without avatars. |
| D21 | polish | "Add hire date" row, 1440, Manager | The row opens Edit employee at the top with focus on body; the hire date is the sixth field (below the fold on phones); after Save there is no way back to the report. | manager-r30-bonus-addhire-landing-1440.png; `addHireLanding` | RULES focus after a step change | `christmas-bonus-report.tsx:60` | Open the sheet with focus on the hire date field and a return to the report after Save. |
| D22 | visible | `/app/settings/clocker/matching`, every width and touch 844, Owner | Save is a filled teal button before any change and stays enabled; saving the same value writes a new version. | owner-r30-matching-1440.png, owner-r30-matching-320.png, touch-r30-matching-844.png; `matching.save.disabled: false` | DESIGN Phase 3 Forms "Save appears after a change" (Phase 8 applied it to the other settings) | `src/components/clocker-schedule-grace.tsx:81` | Show Save only when the draft differs from the saved value. |
| D23 | visible | Shift matching, 1440 and 390, Owner | Results are bare 13px lines: "Saved. Clock-ins from now on use this grace." in teal with no done mark; the conflict ("Shift matching changed. Reload before saving.", the server's own sentence) and "We couldn't confirm that save." in red. | owner-r30-matching-saved-390-fold.png, owner-r30-matching-stale-1440-fold.png, owner-r30-matching-reloaded-1440-fold.png | DESIGN Phase 7 Success; Uncertain results ("not confirmed is amber, never red") | `clocker-schedule-grace.tsx:78`, `src/components/clocker-schedule-grace.css:15-16` | Saved as the green done callout; conflict and not confirmed as an amber callout (question glyph) with Reload setting as its action, words chosen by code. |
| D24 | visible | Shift matching, invalid value, 1440 and 390, Owner | The field error has no glyph, ends with a period and is 13px; Add employee's field error has the glyph and no period. | owner-r30-matching-invalid-1440-fold.png against owner-r30-add-step2-1440.png | DESIGN Forms (one error style) | `clocker-schedule-grace.tsx:72`, `.css:15` | Use the shared field error. |
| D25 | visible | Shift matching conflict, 390 and 1440, Owner | With a reload required, the disabled Save sits above Reload setting at 390, so the only working action is second and grey; at 1440 neither button is filled. | owner-r30-matching-stale-390-fold.png, owner-r30-matching-stale-1440-fold.png | One filled teal per screen; premium button ladder | `clocker-schedule-grace.css:17` | While a reload is required, hide Save and make Reload setting the filled button. |
| D26 | polish | Shift matching, 1440, 390, 320 | The help line runs 765px wide at 1440 (block 560); at 320 "0" ends a line before "keeps strict matching."; at 390 the note breaks "Clock-" and "ins". | owner-r30-matching-1440.png, owner-r30-matching-320.png, owner-r30-matching-saved-390-fold.png | DESIGN frame 560, CR-103 | `clocker-schedule-grace.css` (`.c-grace__field`), `src/components/clocker-owner-copy.ts:231-233` | Cap help and note at 560, tie "0" to "keeps", keep "clock-ins" whole. |
| D27 | polish | Shift matching read failure (forced), 1440 | The error card is 812 wide; state cards stop at 560. | owner-r30-matching-readfail-1440-fold.png | DESIGN frame (state cards 560) | `src/app/app/settings/clocker/matching/page.tsx:23` | Hold the error card to the 560 state width. |
| D28 | polish | Shift matching at 200% text, 390 | The minutes field grows to about 95px tall while its text stays 16px. | owner-r30-text200-matching-390-fold.png | RULES 200% text usable | `clocker-schedule-grace.css` (field height in em) | Size the field like the other inputs. |
| D29 | visible | `/app?view=attendance` (Who's working), 1440 and 390, Owner | A punch open 13 h 20 min reads "In since 9:59 PM" and one open since Nov 12 reads "In since 10:58 AM": no day, ordinary Clocked in rows. The flag lives only inside the collapsed "Clock-ins to check" row, which shows no count. | owner-r30-attendance-1440.png, owner2-r30-attendance-1440.png, owner-r30-attendance-390.png | Truth; DESIGN status colour (red stops you) | `src/components/whos-working-corp.tsx:76`, `:94` | Add the day to a clock-in before today ("In since Tue 9:59 PM"), put the red "No clock-out after 12 hours" chip on that row, and show the count on the collapsed row. |
| D30 | visible | `/app/inbox` (Things to do), 1440 and 390, Owner | No item appears for the 13 h open punch (0 attendance items, and nothing on Home) while the same run's Insights export carries `OPEN_PAST_LIMIT` for that punch. `manager-action-center.tsx`, the only reader of `/api/manager/action-center`, is imported nowhere. | owner-r30-inbox-1440-fold.png, owner2-r30-inbox-1440-fold.png, owner2-r30-home-attn-1440-fold.png, owner-r30-report-export-2026-11-01.csv | QA request; handoff ("flows into the Action Center") | `src/components/manager-action-center.tsx` (not mounted), `src/components/owner-b/inbox-b.tsx` | For Codex and Jose: decide where the Action Center item renders (Things to do, Time) and show it there with the label. |
| D31 | visible | `/app?view=attendance`, "Clock-ins to check" opened, 1440, 390, 320, Owner | The label reads "No clock-out after 12 hours" in a red tinted pill (11px), and the figure beside it is "1 h 20 min": the time past the 12-hour mark, for a punch open 13 h 20 min, so it reads as open for 1 h 20 min. The panel around it is off-system: an upper-case "TODAY" eyebrow, three bordered stat boxes, a banner in another amber, a footer card with an outlined Refresh. | owner2-r30-attendance-1440.png, owner2-r30-attendance-row-1440.png, owner2-r30-attendance-row-320.png; `attendance.rows` in owner2-scan-log.json | DESIGN Direction B (cards, chips, type roles); Truth | `src/components/manager-attendance-review.tsx:30`, `:41`, `:65-68` (`differenceLabel` of `differenceNanoseconds`) and its stylesheet | Say how long it has been open ("Open 13 h 20 min, since 10:22 PM yesterday"), draw the label as `BChip tone="red"`, and rebuild the panel from kit cards and counts. |
| D32 | polish | Who's working, 390 (desktop browser), Owner | A light stripe splits the title band from the "Wed, Nov 18" strip. Pre-existing. | owner-r30-attendance-390.png | DESIGN One band; Phase 8 band gaps | the `.c-who` band rules (`src/app/app/owner-b-pages.css`, `owner-b-time-pay.css`) | Paint the date strip as part of the band. |
| D33 | visible | `/privacy`, 1440 (and every width once opened), signed out, English and Spanish | "Who receives information" is one 1,116-character paragraph, 15 lines at 558px; six providers in one sentence, beside "How long we keep information", which uses bullets with bold lead-ins. | public-privacy-en-1440-who-receives.png; `r30pub` in public-scan-log.json | CR-103 measure, TS-010 editing versus listing | `src/lib/legal/policies.ts:25` and `:62` | List the providers as bullets with the provider in bold, same words (counsel still reviews them). |
| D34 | visible | Clocker ID and PIN steps, 1024x768, 200% text | The band clock clips: "11:25 A", "M" cut. The clock row is 394px wide in a 297px column; the band clips at x 369. | kiosk-ck-01-r30-text200-id-1024x768.png, kiosk-ck-02-r30-text200-pin-1024x768.png; `r30ck` in kiosk-scan-log.json | RULES 200% text; DESIGN NV-048 (the clock never clips) | `src/components/clocker.module.css:76` (`.clock` clamp minimum `3.5rem`) | Give the clamp a px or container-width minimum so larger text cannot push the figure past the band. |
| D35 | visible | Clocker PIN step, 1024x768 and 768x1024, 200% text | Continue sits below the screen: 742 to 809 in a 768 window; at 768x1024 the keypad ends at 1109 and Continue spans 1125 to 1191 in 1024. The kiosk must be scrolled to finish. | kiosk-ck-02-r30-text200-pin-768x1024.png, kiosk-ck-02-r30-text200-pin-1024x768.png | RULES 200% text; DESIGN "the PIN step fits 800x600" | `clocker.module.css` compact rules keyed to the window height | Key the compact layout to the card's height or scale the keys so the step fits at 200%. |
| D36 | visible | Clocker PIN step, High Contrast | The hidden password input draws its own two bullets and a black caret at its left edge (colour and caret rgb(0, 0, 0) under forced colours, transparent otherwise) beside the four slot dots. | kiosk-ck-r30-hc-pin-field-zoom.png, kiosk-ck-04-r30-hc-pin-1024x768.png | DESIGN Phase 6 High Contrast | `clocker.module.css:249` and the forced-colours block at `:398` | In forced colours, set the input to `forced-color-adjust: none` with a transparent colour and caret. |
| D37 | visible | Signed-out pages in Spanish, every width | `<html lang="en">` stays; `<main lang="es">` covers what is visible, so the document title ("Iniciar sesión · NEVORA") is spoken with English rules, and the Spanish 404's title is English ("NEVORA Workforce"). | public-scan-log.json (`docLang`, `mainLang`, `title`) | WCAG 3.1.1 | `src/app/layout.tsx:39` | Set `<html lang>` from the `nv-lang` choice in the root layout and give the 404 a Spanish title. |
| D38 | polish | Add and Edit employee, every workspace | The hire date help says "Christmas bonus hours use this date." also where the report does not exist (outside Puerto Rico). | owner-r30-add-step2-1440.png | Truth | `employment-date-fields.tsx:11` | Pass whether the report applies; elsewhere say "For your records." |
| D39 | polish | Edit employee, 1440 and 900, Owner and Manager | The title is centred in the band (x 576 to 772) while Add employee and every other pushed page start at 296, and a faint second frame (271 to 1133) sits behind the card. Pre-existing. | owner-r30-edit-maria-1440.png | DESIGN frame (title at 130 under a back link, one column) | `src/app/app/owner-b-pages.css:103`, `:229`; the `.c-sheetpage` frame | Left-align the sheet title like Add employee and drop the outer frame. |
| D40 | polish | Pushed pages on a touch phone held sideways, 844x390 | The band back links "‹ Insights", "‹ Settings" and "‹ Team" are 32px tall on a touch screen. Pre-existing. | touch-scan-log.json (`under44`) | RULES 44px touch targets | the band back link rules (`.c-nav__back`, `.q-nav__l`) | Give band back links a 44px hit area on coarse pointers. |

## Copy

Plain-language review; legal and payroll sentences are not changed here.

- **Employment dates.** "Hire date (optional)", "Termination date (optional)" and "Date of birth (optional)" are clear.
  "For your records only. It doesn't deactivate anyone." is true and the best line on the screen. "Private. Only Owners
  and Managers who can edit this profile see it." matches the server rule and the new Privacy wording. The bonus line is
  wrong outside Puerto Rico (D38). The floor message "Use 1900-01-01 or more" should read "Enter a date in 1900 or later"
  (D03).
- **Add employee success.** "Employee created. Open their profile to review details and manage their account invitation."
  and "Employee details saved. Reload the employee to review current access before making another change." are long
  instructions where a result title belongs (D04). Suggested: "Rosa Lebrón added" with "Open profile"; "Saved" with
  "Maria Rivera's details are up to date."
- **Christmas bonus hours.** The disclaimer is Jose's and stays. "Add hire date" is an instruction used as a status;
  the detail line already says "No hire date", so the chip should say "No hire date" and the row's chevron carries the
  action. "Bonus year (Oct 1 to Sep 30)" is good. "Need a hire date" should match the chip ("No hire date"). The empty
  line overclaims (D17). The footnote is clear; "“Check breaks” means they reach it only if their recorded breaks count
  as hours worked." could lose "recorded".
- **Shift matching.** English: "Punches up to this many minutes before a shift start count toward that shift. Paid time
  still starts at the actual punch. 0 keeps strict matching." is precise; "0 keeps strict matching" is jargon for an
  Owner, suggested "At 0, a clock-in must be at or after the shift's start." The conflict uses the server's sentence
  ("Shift matching changed. Reload before saving.") while the client has its own reload words; choose by code (D23).
  Spanish exists for every string, in the usted register the other Clocker owner pages use, and reads well
  ("Margen de entrada anticipada", "0 mantiene la asociación estricta"), but `page.tsx` always passes `clockerOwnerCopy.en`,
  so it never renders. That matches DESIGN ("the signed-in app renders English until a stored language is decided");
  note that "Volver a cargar la configuración" is about twice the English button's width and will need the 44px footer
  to wrap.
- **The 12-hour label.** "No clock-out after 12 hours" is plain and correct. The engine message "No clock-out recorded ·
  open more than 12 hours." uses a middle dot and a lower-case start after it; it reaches the CSV and period notes.
  The unrendered Action Center item would read "Maria Rivera · 1 recorded observations." (`src/lib/action-center/intelligence.ts:243`
  does not handle one).
- **Privacy.** Text pending counsel; not judged. The page still says "Effective October 20, 2026" while
  `POLICY_VERSION` is 2026-11-18; the handoff already makes the effective date counsel's call.
- **Closed pages.** "Christmas bonus hours are for Owners and Managers. Your own hours are on Time." is good. The
  location-limited Manager's "Return to Home, or sign in again if your access changed." suggests something is broken
  (D09).
- No em dashes, no exclamation marks and no filler were found in the new strings.

## Accessibility

- **axe-core 4.13**, 66 page states (WCAG 2.0 to 2.2 A and AA plus best practice): one rule failed, `color-contrast`
  (serious) on the Edit employee band controls at 1440 and touch 844, in all four runs that opened the sheet (D01). Christmas bonus hours, Shift matching (with
  its read failure), the closed pages, Add employee, Who's working, Privacy and the kiosk states had no violations.
- **Keyboard.** Christmas bonus hours: skip link, sidebar, top bar, ‹ Insights, the year select, Show year, Open
  Timecards, then back to the top; the rows are not focusable (they are not links unless "Add hire date"). Shift matching:
  ‹ Settings, the minutes field, Save. Add employee step 2: Positions, Locations, then each date field takes four stops
  (month, day, year, calendar button; the button shows the browser's blue ring, the field keeps its 1px teal edge).
  Every stop had a visible indicator.
- **Focus after an action.** Shift matching keeps focus on the field after a refused value, returns it to Save after a
  save and moves it to Reload setting after a conflict and to the field after the reload: correct. Add and Edit employee
  lose focus after a server refusal and after a save (D03, D04). After Show year the page reloads and focus starts at
  the top (acceptable for a GET form; moving it to the People heading would be better).
- **Names.** The Christmas bonus rows that are not links put their spoken summary in `aria-label` on a plain `div`
  (`src/components/corp/corp.tsx:144` via `christmas-bonus-report.tsx:61`); ARIA ignores names on generic elements, so
  that summary is never heard (the visible text is read instead, which is fine). Shift matching announces "Shift
  matching" three times (the h1, a hidden h2 and a hidden legend, `clocker-schedule-grace.tsx:61`, `:63`) and hides the
  unit "minutes" (`:70`); the help line carries the word, so the field is still understood.
- **Status and colour.** Statuses carry words as well as colour. Two uncertain results are red (D23).
- **Targets.** Nothing on the new screens is under 44px except the band back links in phone landscape (D40) and the
  phone header's Add and Save pills (61x36 and 67x36, pre-existing; any larger hit area was not measured).
- **200% text** (Chrome's default size set to 32px): the signed-in pages barely scale because their type is in px, as
  elsewhere in the app; no clipping on the new pages; the minutes field stretches (D28). The kiosk scales and clips (D34,
  D35).
- **Reduced motion.** The new screens add no motion of their own. Under `prefers-reduced-motion: reduce` the remaining
  transitions are the shared 150ms opacity on back links and a scale on buttons (the kit's press, which DESIGN allows to
  tint in place under reduce); nothing travels.
- **High Contrast** (Chromium's forced colours, not a Windows theme): kiosk only, D36.
- **Language**: D37.

## Kit pieces these screens should use (premium pass)

| Where | Today | Kit piece |
|---|---|---|
| Christmas bonus statuses | `CorpPill` green and amber, `CorpMeta` grey | `BChip tone="green"` Reached; `BChip tone="amber"` Check breaks, Not confirmed, No hire date; `BStatusText` Not reached |
| Christmas bonus disclaimer | plain paragraph `role="note"` | `BCallout tone="teal" icon="info"` (Jose's words unchanged as the body) |
| Unfinalized days warning | `.c-note--warn` on the canvas | `BCallout tone="amber" icon="wait"` inside the People card, action Open Timecards |
| Christmas bonus footnote | `CorpNote` under the card | `BNote` as the People card's footer |
| Christmas bonus empty and failed | `.c-empty`; `OperationalUnavailable` | `BState kind="empty"`; `CorpErrorCard` (the kit's failed state) with one Try again |
| Show year | `CorpButton kind="secondary" size="md"` | a band pill menu, or `BButton` 44 beside the field |
| People count | `CorpCard count` | `BCount` |
| Shift matching results | `.c-grace__feedback` teal or red | `BCallout tone="green" icon="done"`; `BCallout tone="amber" icon="unknown"` with Reload setting as its action |
| Shift matching field error | `.c-grace__error` | the shared field error (16px WarningCircle) |
| Shift matching buttons | `c-btn`, `c-btn--secondary` | `BButton` 44 in the form footer; one filled |
| Date refusals on Add and Edit employee | `form-error` strip | the shared field error on each date |
| Add and Edit employee success | `form-success` strip and `button secondary` | `BState kind="done"` replacing the form |
| "No clock-out after 12 hours" | `.attendance-review-badge.critical` | `BChip tone="red"` (and the same chip on the Who's working row) |
| Closed pages | `OwnerOnlyNotice state` (correct); `OperationalUnavailable` for the limited Manager | `OwnerOnlyNotice state` everywhere |
| Privacy English-only note | teal box | `BCallout` (already in package P5) |

## Not reviewed

- A screen reader, a real phone or tablet, Safari, Firefox and a Windows High Contrast theme.
- The loading placeholders in the browser: a client navigation kept the previous page until the next one arrived, so the
  placeholders were judged from source only (D20).
- The Shift matching "couldn't confirm that save" and "couldn't load the saved setting" messages: read from source
  (`clocker-schedule-grace.tsx:45`, `:55`), not forced.
- Shift matching in Spanish: the strings exist but the page cannot render them today.
- The payroll export file, calendar feeds (ICS), notification and email bodies, and the Owner advisor's data for the
  dates; only the Insights CSV export was downloaded and searched. The phase's source guard test
  (`src/lib/employment-dates.privacy.test.ts`) covers the rest by reference and was not rerun here.
- The early clock-in grace's effect on a real punch at the kiosk (matching a punch to a shift); only the setting page.
- Privacy wording (pending counsel) and the analytics flag (off by default; nothing to see).
- The Manager's Who's working page (its load timed out at 20 seconds in `r30-manager`; the Owner's was captured).
