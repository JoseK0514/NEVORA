# Owner experience: structure and flows

Reviewer 2 of 2 (Product Designer). Scope: what each page is for, the navigation, density and priority, flows, copy and states. Reviewer 1 covers pixel craft.

- **Code:** frozen Release 1, `7b14776a` (`/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/r1-integrate`), read only.
- **Data:** the fictional preview, signed in as QAOWNER (Carmen Ortiz, Isla Verde Cafés, 2 locations, 9 people), on 2026-10-31.
- **Viewports:** 1440x900, 390x844, and spot checks at 320x568. Chromium only.
- **Read only:** I opened dialogs and sheets, then cancelled. I submitted, saved, approved and published nothing. On step 1 of Add employee I typed fictional values to reach step 2, then left without pressing Add.

**Evidence folders** (all screenshots are PNGs):

| Prefix | Absolute folder |
|---|---|
| `D/` | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-product/cap/chromium-QAOWNER-light-1440x900/` |
| `P/` | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-product/cap/chromium-QAOWNER-light-390x844/` |
| `S/` | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-product/cap/chromium-QAOWNER-light-320x568/` |
| `W/` | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-product/walk/` (multi-step walkthroughs) |
| `R/` | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-product/` (contact sheets) |
| Boards | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/mock/` |

The scripts I used are `walk.mjs` and `loadcap.mjs`, in the `R/` folder.

---

## 1. Verdict

On a good path the Owner side already looks like the approved corporate boards: white cards, one teal action, a quiet sidebar and a phone that holds together at 320px. It stops feeling like Gusto as soon as you act. Several important actions end in dead ends or land on the wrong page, the same fact shows up in three places with three different names, and the most serious problem (three pay periods that were never paid) sits in a side card. The three biggest structural problems:

1. **Urgent items are buried and noise is promoted.** Missed payrolls, tablets that were never set up and PINs nobody has are not on Home, while Home repeats "Open shifts 3" and "No clock-in 1" twice. Things to do adds a "More to review 45" bucket full of past items.
2. **Flows dead-end or point to the wrong place.** Find cover ends at "No one can work it" with no next step. Team's "Clocker PIN" row opens a tool that checks tablet punches by UUID. Payroll's "Review" button opens a page called Prepare payroll. Home's "3 timecards to approve" opens a page that says approvals aren't open until Sunday.
3. **No single name or place for anything.** Settings live in three places (the Settings hub, More, Payroll's tabs). The profile has three entries. Pages carry two names: the top bar says "Attendance", the title says "Who's working". The Payroll tab row includes a "Timecards" tab that moves you to a different sidebar section.

---

## 2. Navigation and page map

### 2.1 Current map (as reached on 7b14776a)

**Desktop sidebar** (`src/lib/navigation.ts`, `managementNavigationGroups`):

| Group | Entries |
|---|---|
| Main | Home · Schedule · Time · Payroll · Team · Things to do (badge 5) |
| More | Insights · Updates · Settings |
| Top bar | Search ⌘K · bell (Notifications) · account menu: Your profile, My pay, Profile and device settings, Sign out |

Evidence: `D/app-0.png`, `W/d-01-account-menu.png`.

**Phone** (`mobileTabsForRole`):

- **Tabs:** Home · Schedule · Time · Payroll · Team.
- **Header:** the bell opens Notifications. The avatar opens the More sheet, which lists the company row (it opens Settings), Insights, Updates, Locations, Positions, Break types, Clocker devices, Scheduling rules, Payroll settings, Company profile, Branding, Notifications, Help and Sign out.
- Things to do opens only from Home ("See all").

Evidence: `P/app-0.png`, `P/app_more-0.png`.

**Second level:**

| From | To |
|---|---|
| Home | Who's working (`/app?view=attendance`) · Find cover (`/app/schedule/coverage?...`) · Payday "Review" (`/app/timecards`) · Things to do rows (`/app/inbox#…`, `/app/requests`) · Finish setting up (`/app/schedule/settings#target-hours`) |
| Things to do | open shift → Find cover · not clocked in → that person's timecard sheet (`/app/timecards#timecard-SO0164`) · time off → request detail · More to review (`/app/inbox?view=more`) · Time off list (`/app/requests`) · Shift requests (`/app/exchange`) |
| Schedule | ⋯ menu: Activity (`/app?view=activity`), Copy previous week, Templates, Scheduling rules, Print, an Availability deadline date field · Publish (`/app/schedule/publish`) · location filter · shift → Edit shift · + Add → Add shift · open shift → Find cover |
| Time | timecard sheet (Punches and corrections) · Export (`/app/payroll-export`) · Select (bulk) · This week / Last week |
| Payroll | tab row: Timecards, Payroll runs, Time exports, Payroll settings · "Settings" link · Pay history · Review → Prepare payroll · a past run → Payroll details · Periods with no payroll → Prepare payroll |
| Team | person → Edit (`?edit=1`) and Access and sign-in (`?view=access`), which leads to Clocker PIN and Reset password · Add → Add employee (2 steps) · Hours this week (`/app?view=team`) · Help someone sign in (`/app/account-recovery`) · Clocker PIN (**`/app/clocker-recovery`**) |
| Settings hub | Company profile, Locations, Branding, Features and words, Company policies, Positions, Break types, Scheduling rules, Clocker devices (Clocker tablets), Employee PINs, Punch photos, Payroll settings, Your profile, Notifications |
| Other routes | `/app/more` on desktop: a full duplicate of the phone sheet, reached only from Profile's "‹ More" link · `/app/ai-manager` shows "There's no page here" while the advisor is off · `/app/requests/hub` and `/app/my-time` redirect to Home |

### 2.2 Redundant

| What | Where it appears | Evidence |
|---|---|---|
| Business settings | Settings hub (desktop sidebar), the phone More sheet (6 setting rows), desktop `/app/more`, and Payroll's own tab, "Settings" link and Pay history button | `R/sheetA.png`, `D/app_payroll-0.png` |
| Scheduling rules | Schedule ⋯ menu, More, Settings hub | `W/d-02-schedule-menu.png`, `P/app_more-0.png` |
| Your profile | Account menu "Your profile", account menu "Profile and device settings", Settings › Account › Your profile | `W/d-01-account-menu.png` |
| Sign out | Account menu, More, Profile | `R/sheetB.png` |
| Open shifts and no-clock-in counts | Home Today stats, Home Today Find-cover row, Home Things to do rows | `D/app-0.png` |
| Period pickers | Timecards: top-bar week stepper **and** This week / Last week segments. Insights: top-bar range menu **and** This week / Last week / Month segments | `D/app_timecards-0.png`, `R/sheetC.png` |
| "Notifications" (the bell's feed) | Listed under **Account** in More and in Settings, as if it were a preference | `P/app_more-0.png`, `src/app/app/settings/page.tsx:63` |

### 2.3 Buried

- **Unpaid periods.** Sep 21–27, Sep 28–Oct 4 and Oct 19–25 (payday Tue Oct 27, already passed) have no payroll. They appear only as a right-hand card on Payroll ("Periods with no payroll 3") and on Prepare payroll. Home says nothing. Evidence: `D/app_payroll-0.png`, `W/t2-01-pay-review.png`.
- **Clocker readiness.** Neither tablet is set up and all 9 PINs are "Not set", so nobody can clock in. More and Settings show "Clocker devices 0". The checklist on Home tracks only targets and coverage (`src/components/owner-setup-card.tsx:33`). Evidence: `R/sheetG.png`.
- **Time corrections from employees.** These are reviewed in a collapsed "Clock-ins and corrections" row at the bottom of Who's working, not under Time or Things to do. Evidence: `R/sheetO.png`.
- **The Settings hub on the phone.** It sits behind the unlabelled company-name row at the top of More, so Features and words, Company policies, Employee PINs and Punch photos have no visible entry on a phone (`src/app/app/more/page.tsx:132`).

### 2.4 Mis-grouped

- **Team › "Clocker PIN".** It opens Clocker recovery, a tool that checks a tablet punch by UUID. PINs live in Settings › Employee PINs and under a person's Access and sign-in. Evidence: `W/x-04-clockerpin.png`.
- **Payroll's tab row starts with "Timecards".** Tapping it moves the sidebar highlight from Payroll to Time, and the Timecards page has no tab row to get back. Evidence: `D/app_payroll-0.png`, `D/app_timecards-0.png`.
- **Hours this week on the phone.** The back link says "‹ Team" but the **Home** tab is lit (`/app?view=team` belongs to Home). Evidence: `P/app_view_team-0.png`.
- **Availability on the phone.** The back link says "‹ Things to do" and Home is lit. Evidence: `R/p7.png`.
- **My pay in the Owner's account menu.** It shows "No statements yet. Only you can see them." The owner is not on payroll in this data (`R/sheetR.png`).

### 2.5 Proposed map (same five tabs, nothing renamed in the bars)

```
Phone tabs / desktop main:  Home · Schedule · Time · Payroll · Team   (+ Things to do in the desktop sidebar)
Desktop "More":             Insights · Updates · Settings
Phone avatar sheet:         Your profile · Insights · Updates · Settings · Help · Sign out   (6 rows, no setting rows)
Account menu (desktop):     Your profile · Sign out   (+ My pay only when the owner has statements)

Home         Today (who's working, the one urgent action) · Payday · Things to do (top 3) · Finish setting up (incl. tablets, PINs)
Schedule     Week · ⋯ = Copy previous week, Templates, Print, Activity        (rules move to Settings only)
Time         Timecards · Corrections (moved from Who's working) · Export
Payroll      Run payroll (the overdue periods first) · Pay history · Time exports
Team         People · Hours this week · Availability · Help someone sign in (password + PIN in one place)
Settings     Company · Locations and positions · Scheduling (rules, breaks) · Clocker (tablets, PINs, photos, punch check) · Pay · Notification preferences
```

**Continuity.** Every URL keeps working. Only entry points move. Scheduling rules stays reachable from Schedule through a "Rules" row on Settings, and a redirect needs no code because the route is unchanged. The phone's More keeps Insights and Updates in the same position. Old bookmarks to `/app/more` on desktop still open the page, which shows the same list.

---

## 3. Page-by-page findings

Severity: **H** breaks trust or a main job, **M** slows a job, **L** polish. Effort: **S** copy or layout only, **M** a component change, **L** new logic or data.

### Home (`/app`). Job: what needs me right now?

The structure matches board C-Owner, with three cards on the phone.

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| H1 | Overdue payroll (Oct 19–25, payday Oct 27) is missing. The Payday card shows only the next payday. | H | M | `D/app-0.png` vs `W/t2-01-pay-review.png` |
| H2 | "Payday Tue, Nov 3 · 3 timecards to approve · Review" links to Timecards, which says "Approvals open after Sunday, Nov 1". The CTA promises a job that can't be done yet. | H | S | `W/f-04-inbox-noclockin.png` |
| H3 | The Things to do rows "Shifts with no clock-in 1" and "Open shifts 3" repeat the Today card above. Board C-Owner uses Time off, Time corrections and Shift swaps, the items that need a decision. | M | S | `D/app-0.png`, `Boards/C-Owner.png` |
| H4 | "Finish setting up · 1 of 2 steps" leaves out tablets and PINs, the setup that blocks clock-in. | H | M | `src/components/owner-setup-card.tsx:33`, `R/sheetG.png` |
| H5 | Desktop: two cards across with about 55% of the canvas empty below. Board C-Owner also has an "All locations" picker on Home, which the build lacks. | L | S | `D/app-0.png` |
| H6 | "Find cover" leads to a dead end in this data (see flow F2). | H | — | `W/f-01-findcover.png` |

**Copy:**

- "Shifts with no clock-in" (Home) and "Not clocked in" (Things to do): use **"Missed clock-ins"** in both places.
- "Payday Tue, Nov 3 / 3 timecards to approve / Review" before the period closes becomes **"Payday Tue, Nov 3 / Approvals open Sunday" / "View timecards"**. After it closes: **"3 timecards to approve" / "Approve"**.

### Things to do (`/app/inbox`). Job: decide what's waiting

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| I1 | Four cards: Open shifts, Not clocked in, Time off, More to review. That breaks the "at most 3 cards" rule. | M | S | `D/app_inbox-0.png` |
| I2 | "More to review 45 · Timecards, planning and earlier gaps" is a catch-all larger than everything else on the page. Inside it, "Earlier this week (18) Coverage gaps" lists past gaps nobody can act on, and "Timecards to approve (3)" can't be approved before Sunday. | H | M | `W/f-06-inbox-more.png` |
| I3 | The sidebar badge says 5, the page shows 5 plus "45". The numbers disagree about how much is waiting. | M | S | `D/app_inbox-0.png` |
| I4 | Missing: time corrections and shift swaps, which board O-Inbox shows as sections. | M | M | `Boards/O-Inbox.png` |
| I5 | The open-shift label prints lowercase "all day". | L | S | `D/app_inbox-0.png` |

**Copy:**

- "all day" becomes **"All day"**.
- "More to review / Timecards, planning and earlier gaps / 45" becomes **"Coming up" (planning only, e.g. "Open shifts later this week 3")**. Drop past coverage gaps from the count. The Activity log already holds them.
- Search lists this page as **"Inbox"**. Rename it **"Things to do"** to match the sidebar. Evidence: `W/d-04-search.png`.

### Schedule (`/app/schedule`). Job: see and change the week, then publish

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| S1 | "Publish" stays on screen when everything is published. The week shows a "Published" pill, and Build and publish says "Everything planned this week is published." with no action. | M | S | `D/app_schedule-0.png`, `R/p7.png` |
| S2 | Past open shifts stay in alert style. All 24 open slots, Mon–Sun, have red dashed outlines, including days already over. On the phone, three red "Open shift" cards plus a red "No clock-in" make the day view the loudest screen in the app. Rule: red at most once per screen. | M | S | `D/app_schedule-0.png`, `P/app_schedule-0.png` |
| S3 | The ⋯ menu mixes navigation (Activity, Templates, Rules), an action (Copy previous week, Print) and a form (an Availability deadline date-time field with "Set deadline"). A form inside an overflow menu is easy to miss and can't be undone visibly. | M | M | `W/d-02-schedule-menu.png`, `R/p3.png` |
| S4 | The same shift is written three ways: "12:00 AM – 8:00 AM" (Home), "12a – 6a" (grid), "midnight / 8:00 AM" (phone day list). | L | S | `D/app-0.png`, `P/app_schedule-0.png` |
| S5 | Edit shift says "A shift keeps its location. To move it, delete it and add a new one." A two-step workaround for a common edit. | M | L | `R/p3.png` |
| S6 | Desktop has no visible Add shift button. Adding relies on hover "+ Add" in empty cells, which a first-time owner won't find. The phone has "+ Add shift". | M | S | `D/app_schedule-0.png` |

**Copy:** the subtitle "Saturday, October 31 · 2 locations" repeats the date strip right under it. Use **"2 locations · 20 shifts"**, or drop it.

### Find cover (`/app/schedule/coverage`). Job: fill the gap

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| F1 | All three open shifts today end at "0 people free · No one can work it · No one meets this position, lead, location, availability and scheduling need right now." There is no action at all: no Post as open shift, no Assign anyway, no Edit or Delete shift, no list of who was excluded and why. Board O-FindCover has "Post as open shift", "Assign" and "Not available (3)" with reasons. | H | M (copy and links) / L (actions) | `W/f-01-findcover.png`, `W/x-01-fc-2pm.png`, `Boards/O-FindCover.png` |

**Copy:** "No one meets this position, lead, location, availability and scheduling need right now." becomes **"No one is free for this shift. Post it so anyone can pick it up, or choose someone anyway."**

### Time / Timecards (`/app/timecards`). Job: check hours, then approve them

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| T1 | Two period controls at once: the top bar "‹ This week · Oct 26 – Nov 1 ›" and the segments "This week / Last week" below the title. | M | S | `D/app_timecards-0.png` |
| T2 | The stat strip "Approved **0** of 9" sets a big 0 beside a small "of 9", which breaks UI rule 4. "Timecards 9" counts 6 empty drafts. | M | S | `D/app_timecards-0.png` |
| T3 | Desktop and phone tell different stories. Desktop has a stat strip, a table, and "6 people with no time yet" folded away. The phone has a progress card ("0 of 9 approved", "Open until Sunday") and a list showing "Draft" for empty cards. Same job, two mental models. | M | M | `D/app_timecards-0.png`, `P/app_timecards-0.png` |
| T4 | The footer "9 timecards in this period." repeats the stat. The manual "Refresh" link makes the data feel stale. | L | S | `D/app_timecards-0.png` |
| T5 | Last week (Oct 19–25): "This period has ended. Review and approve each timecard." Every card shows 0 min / Draft, and payday Oct 27 has passed. There's no sign this period is the overdue payroll. | H | M | `W/t-03-tc-lastweek.png` |
| T6 | The H1 says "Timecards", the nav and top bar say "Time". | L | S | `D/app_timecards-0.png` |

**Copy:**

- "Approved 0 of 9" becomes **"None approved yet"**, and later **"3 of 9 approved"** at one size.
- "Approvals open after Sunday, Nov 1" is clear. Keep it, and make it the Home card's wording too.

### Timecard sheet. Job: understand and fix one person's week

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| TC1 | The Owner can't add or fix time. A missed clock-in (Sam Ortiz) opens a sheet with "No hours recorded in this period", a read-only "Punches and corrections" fold and "Approve after Nov 1". Corrections only come from employees (`src/components/timecards.tsx:646`, `employee-time-corrections.tsx`). | H | L | `W/f-04-inbox-noclockin.png`, `R/p3.png` |
| TC2 | "Done" closes a sheet that changed nothing. Label it "Close". | L | S | `R/p3.png` |

### Payroll (`/app/payroll`). Job: run this week's payroll; see that past ones are done

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| P1 | The primary card says "Not prepared yet" and the button says **"Review"**, which opens a page titled **Prepare payroll**. | H | S | `D/app_payroll-0.png`, `W/t2-01-pay-review.png` |
| P2 | "Periods with no payroll 3 · Prepare a draft for each one" is a right-column row in amber. These are missed paydays and should be the first thing on the page, in red, with the oldest named. | H | S | `D/app_payroll-0.png` |
| P3 | The header carries a tab row (Timecards, Payroll runs, Time exports, Payroll settings) **plus** a "Settings" text link **plus** a "Pay history" button: three secondary routes before the H1. The tab row also sits above the H1. | M | S | `D/app_payroll-0.png` |
| P4 | "Recent payrolls" shows no amounts or headcount, only "Approved" pills. Board G-O-Payroll shows "$11,980.42 Paid". "Oct 12 – 18" appears twice (the original and a correction) with nothing to tell them apart except a small "Correction". | M | M (presentation) / L (if amounts aren't stored) | `D/app_payroll-0.png`, `Boards/G-O-Payroll.png` |

**Copy:**

- The "Review" button becomes **"Prepare payroll"**.
- "Periods with no payroll / Prepare a draft for each one" becomes **"3 pay periods weren't run · Oldest: Sep 21–27"** with the action **"Start with Sep 21–27"**.

### Prepare payroll (`/app/payroll/prepare`). Job: start the right draft

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| PP1 | "Up next: Weekly payroll Oct 26 – Nov 1" takes the full-width teal "Prepare draft" button, while three older unpaid periods sit below with small "Prepare" links. The order is backwards. The page's own copy says "Review the oldest periods first." | H | S | `W/t2-01-pay-review.png` |
| PP2 | "A draft checks approved time. It doesn't approve timecards, approve payroll or send a payment." Clear and trust-building. Keep it. | — | — | same |

**Copy:** "3 completed periods have no original payroll run." becomes **"3 earlier pay periods have no payroll yet."** ("original payroll run" is system language.)

### Payroll details (`/app/payroll/review?run=…`). Job: prove what was paid

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| PD1 | An approved run says **"No amounts are saved for this payroll."** No totals, no people, no approver or date. The footer reads "Revision 1 approved." This may be a fixture artifact, but the page has no state for a run that has amounts and nothing else to look at. | H | M | `W/pr-01-pay-run.png` |
| PD2 | Documents are raw filenames: "statement-AR0142-oct05.pdf". Pay history lists them under "Private employee statements" with Employee IDs and "Revision 1". | M | S | `W/pr-01-pay-run.png`, `R/sheetM.png` |
| PD3 | "Create correction" and "Prepare payment instructions" rows have no chevron or button style, so they read as text. | M | S | `W/pr-01-pay-run.png` |
| PD4 | Opening `/app/payroll/review`, `/fix` or `/people` without a run shows "This payroll isn't available. It may have been replaced by a newer revision." with no button. A dead end. | M | S | `R/sheetK.png`, `R/sheetL.png` |

**Copy:**

- "statement-AR0142-oct05.pdf" becomes **"Alexandra Rivera · Oct 5–11 statement"**.
- The error gets a **"Go to Payroll"** button.

### Time exports (`/app/payroll-export`). Job: send hours to a provider or file

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| X1 | The page leads with a disabled "Create export" and "0 people · 0h · 3 timecards still need approval". The page's real state is "nothing to export yet". | M | S | `R/sheetE.png`, `P/app_payroll_export-0.png` |
| X2 | System words: "Finalize approved timecards", "9 not finalized", "Payroll population and handoff". | M | S | same |

**Copy:**

- "Finalize approved timecards to export them." becomes **"Approve timecards first, then export them here."**
- "Payroll population and handoff" becomes **"Export history"**.

### Team (`/app/employees`). Job: find a person; add a person

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| E1 | The **"Clocker PIN · Reset someone's PIN for the Clocker"** row opens Clocker recovery ("Check a clock-in or clock-out someone made on a tablet", with the example "like 12345678-1234-1234-1234-123456789abc"). Wrong destination. | H | S | `W/x-04-clockerpin.png`, `D/app_employees-0.png` |
| E2 | Every row carries a grey "Off" pill (9 of 9), plus "0 working now" in the subtitle. The pills say nothing. | M | S | `D/app_employees-0.png` |
| E3 | The list shows 8 people and then "Show all 9". It hides one person to save one row. | L | S | `P/app_employees-0.png` |
| E4 | "Help someone sign in" and "Clocker PIN" are two rows. Board G-O-Team has one row: "Reset a password or Clocker PIN". | M | S | `Boards/G-O-Team.png` |
| E5 | The H1 is "Team" and the subtitle says "9 employees". The Restaurant word preset exists (`R/sheetI.png`) but the café uses "Standard". | L | — | `R/sheetI.png` |

**Copy:** hide the status pill when a person is off. Show **"Working · Condado"** only for people on the clock.

### Person profile (`/app/employees/[id]`). Job: everything about this person on one page

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| E6 | The page is thin: name, ID, an "Off" pill, a phone number, then the bare rows Shifts, Timecards, Availability. Board O-Person shows This week 32 h, Pay $18.70/h, an availability summary, a timecard badge and Documents. | M | L | `W/tm-03-person.png`, `Boards/O-Person.png` |
| E7 | "Shifts" opens the whole team's `/app/schedule` and "Availability" opens the team-wide `/app/availability`. Neither is filtered to this person. | M | S/M | link log for `/app/employees/AR0142` |
| E8 | Desktop has no back link to Team (the phone has "‹ Team"). The same is true of Access and sign-in. | M | S | `W/tm-03-person.png`, `W/x-02-access.png` |
| E9 | Edit employee's role picker includes "Lead", although Lead is on hold for Release 1. Confirm with Jose. | L | S | `W/tm-05-person-edit.png` |

### Add employee (`/app/employees/new`). Job: get a new hire scheduled and paid

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| A1 | Step 2 opens with a red error ("Enter employee ID") before the user has typed anything. | M | S | `W/tm-06-addemp-step2.png` |
| A2 | The Owner must invent an Employee ID ("It stays the same after it's created."). Gusto and Homebase assign one automatically. | M | L | same |
| A3 | Pay rate isn't part of adding a person. Wages live in Payroll settings › Payroll setup, so a new hire needs a second trip to another section before payroll can work. | M | L | `R/sheetH.png` |
| A4 | Cancel and Next are text links in the header with no bottom button. Add shift has both a header "Save" **and** a bottom "Save shift": two patterns for the same kind of form. | L | S | `R/sheetN.png` |

### Who's working (`/app?view=attendance`), Hours this week (`/app?view=team`), Activity (`/app?view=activity`)

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| W1 | The top bar and the H1 disagree: "Attendance" vs "Who's working", "Team overview" vs "Hours this week", "Schedule activity" vs "Activity". | M | S | `R/sheetO.png`, `R/sheetP.png` |
| W2 | Who's working hides "Clock-ins and corrections" in a collapsed row at the bottom. Corrections are a Time job. | M | M | `R/sheetO.png` |
| W3 | Hours this week: "Showing 8 of 9 people" with no way to see the ninth (Sam Ortiz). Seven amber "Below/Above target" pills, one green "On target". The page reads as a wall of status. | M | S | `P/app_view_team-0.png` |
| W4 | Activity repeats "Coverage gap at …" once per gap per day, so the log is mostly noise. | L | M | `R/sheetP.png` |

### Clocker tablets (`/app/settings/clocker`). Job: get each location's iPad working

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| C1 | Two tablets already exist as "Needs setup", yet the page's only primary action is "Set up a new tablet". Finishing an existing tablet means opening its row, which shows a sheet titled **"Rename device"** with four stacked buttons (Save name, New setup code, Revoke access, Cancel). The step that matters, "New setup code", is the second button in a rename dialog. | H | S | `W/tm-02-tablet-row.png` |
| C2 | The counts disagree: More and Settings say "Clocker devices 0", this page says "Tablets (2)". The menu counts only ACTIVE devices (`src/app/app/more/page.tsx:127`). | M | S | `P/app_more-0.png`, `R/sheetG.png` |
| C3 | The name changes from place to place: "Clocker devices" (More, Settings), "Clocker tablets" (H1), "Add device" (sheet). | L | S | same |
| C4 | Employee PINs shows "Active · 9" and "Not set · 9" side by side, with a "Not set" pill on every row. There's no "Send everyone a PIN" or bulk path. | M | M | `R/sheetG.png` |
| C5 | Punch photos says "Photo capture is unavailable" but leaves every control live, and doesn't use the card layout every other settings page uses. | L | S | `R/sheetH.png` |

**Copy:**

- "Rename device" becomes the sheet title **"Condado iPad"** with primary **"Get setup code"**. Rename becomes a secondary row.
- More's row "Clocker devices 0" becomes **"Clocker tablets · 2 need setup"**.

### Settings hub, More, Profile

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| G1 | Settings and More list the same settings in different groupings: Locations sits under "Company" in Settings and under "Business settings" in More. Settings is built on the older Quiet components (`QuietGroup`), More on Corp. | M | M | `R/sheetA.png`, `src/app/app/settings/page.tsx:36` |
| G2 | Save models differ. Features and words saves when you flip a toggle. Company policies and Company profile use a small "Save" text link at the top right. | M | M | `R/sheetI.png`, `R/sheetJ.png` |
| G3 | Profile shows the phone as "7875550100" (unformatted). The passkey button says "Add a passkey" on desktop and "Set up Face ID" on the phone. Profile's back link goes to "‹ More", a page that isn't in the desktop sidebar. | L | S | `R/sheetB.png`, `P/app_profile-0.png` |
| G4 | The account menu has "Your profile" **and** "Profile and device settings". In automation the second opened nothing visible (verify by hand). | L | S | `W/d-01-account-menu.png`, `W/ac-01-device-settings.png` |
| G5 | Break types reads "0", while Features has "Breaks on the Clocker" switched on. A feature that's on with nothing to use. | L | S | `R/sheetA.png`, `R/sheetI.png` |

### Insights, Updates, Notifications, Time off list, Shift requests, Availability, Templates

| # | Finding | Sev | Eff | Evidence |
|---|---|---|---|---|
| N1 | Insights: two period controls (see T1). "Late clock-ins —" and "Cover filled —" show dashes without saying why (late alerts are off in Company policies). | L | S | `R/sheetC.png`, `R/sheetI.png` |
| N2 | Updates empty state: "No updates yet." with only a "+" icon to create one. | L | S | `R/sheetC.png` |
| N3 | Notifications empty state keeps the All / Unread segments over "No notifications yet." | L | S | `R/sheetR.png` |
| N4 | Availability (Owner): "Oct 26 – Nov 1 · 0 of 6 sent" is the week already ending. It should show next week. The list has no action (no "Remind"). | M | M | `R/sheetE.png` |
| N5 | Templates: "No saved weeks yet" sits above an inline "Save this week" form. It doesn't explain what a template does or how to apply one. | L | S | `R/sheetF.png` |
| N6 | The Time off and Shift requests lists are clean ("You're all caught up."). The time-off detail is the best page in the Owner app: one decision, context ("Others off Mon, Nov 16: None"), and "Alexandra gets a notification either way." Use it as the pattern. | — | — | `W/f-05-inbox-timeoff.png` |

**Copy:** "No updates yet." becomes **"No updates yet. Tell your team about hours, menus or events."** plus a **"New update"** button.

### States, across the app

| State | What I saw | Sev | Eff | Evidence |
|---|---|---|---|---|
| Loading | With 2.5 s latency, a tab tap keeps the **old page** on screen for about 1–3 s with only the new tab lit. No progress feedback. The skeleton that follows is one generic avatar list for every page, so Payroll and Schedule look the same while loading and then jump. | M | M | `W/load-time-m.png`, `W/load-payroll-m4.png`, `W/load-schedule-m7.png` |
| Error | The payroll sub-pages without a run are a dead end (PD4). `/app/ai-manager` gives "There's no page here" with "Back to Home", which is good. | M | S | `R/sheetK.png` |
| Empty | Shift requests ("You're all caught up.") is good. Updates, Notifications and My pay are bare (N2, N3). | L | S | `R/sheetD.png` |
| Success | Not checked. Saving was out of scope. The code shows toasts such as "Setup code created. Finish on the shared tablet." | — | — | `src/components/clocker-device-manager.tsx:108` |

### Desktop and phone fit

- **The phone fits the job better than desktop.** Home, Things to do, Payroll and Team are one column with one action. At 320x568 nothing overflows (`R/p5.png`).
- **Desktop doesn't use its width.** Home leaves more than half the screen empty, the person profile is one narrow column, and Payroll leaves its right column almost bare. Desktop should earn its width by putting the decision next to the list (master–detail), like Gusto's people and payroll pages, not by centring a phone column (`D/app-0.png`, `W/tm-03-person.png`).
- **Desktop back navigation is inconsistent.** It exists on Payroll's sub-pages ("‹ Payroll") but not on the person page, Access and sign-in, or the Settings sub-pages, where it is visually hidden (the link to `/app/more` is in the DOM). Evidence: `W/x-02-access.png`, `R/sheetG.png`.

---

## 4. Flow findings

### F1. See who's working

- **Today:** Home › Today card ("Clocked in 0 of 1 · No clock-in 1") › "Who's working" › page with "Clocked in (0) Live" and "No clock-in (1) Sam Ortiz 8:00 AM – 2:00 PM". Two taps. Evidence: `D/app-0.png`, `R/sheetO.png`.
- **Friction:**
  - The top bar says "Attendance".
  - Team says "0 working now" with "Off" on every row.
  - The Sam row opens his empty timecard, from which you can't fix anything (TC1).
- **Proposed:**
  - The Home Today card names people ("Nobody is on the clock. Sam Ortiz missed 8 AM.").
  - Who's working keeps one name and lists Working, Missed and Up next.
  - The missed row offers "Call" and "Text" (the person page already has them) and, in 1.1, "Add time".

### F2. Fill an open shift / find cover

- **Today:** Home › "Find cover" (or Schedule › open shift › "Find cover", or Things to do › open shift) › "0 people free · No one can work it". **Dead end at step 2.** Evidence: `W/f-01-findcover.png`, `R/p3.png`.
- **Friction:**
  - No action at all.
  - No reasons per person.
  - The same dead end is reachable from three places.
  - Past open shifts in the grid carry the same alert style, so the owner can't tell which gaps still matter.
- **Proposed (board O-FindCover):**
  - The open-shift card.
  - "Best fit first" (when anyone is free).
  - "Not available (n)" with one reason each.
  - Two actions: **Post as open shift** (primary when nobody fits) and **Assign** (when someone is picked).
  - When nobody fits, "Choose someone anyway" opens Edit shift with the person picker.
  - Release 1 can ship the copy plus links to Edit shift and Delete shift. Post and Assign need logic (1.1).

### F3. Review a time-off request

- **Today:** Home › "Time off requests 1" › Time off list (Waiting · 1) › Alexandra › detail › Approve or Decline. Three taps. Through Things to do it's two. Evidence: `W/f-05-inbox-timeoff.png`.
- **Friction:**
  - When there's exactly one request, Home still drops you on the list.
  - "That week's schedule" is a link out. The detail doesn't say whether she's scheduled on Nov 16.
- **Proposed:**
  - With one item, open the detail directly.
  - Add one line: "Scheduled 8 AM – 4 PM that day at Condado. Approving opens that shift."
  - Keep the rest. This page is the model for other decision pages.

### F4. Fix a timecard

- **Today:** Time › person › sheet (Needs review) › "Punches and corrections" (read-only list) › nothing to edit; "Approve after Nov 1". Missed clock-in: Things to do › Sam Ortiz › an empty sheet. Employee corrections are reviewed elsewhere: Who's working › "Clock-ins and corrections". Evidence: `W/f-04-inbox-noclockin.png`, `R/sheetO.png`.
- **Friction:** the Owner can't fix time, and pending corrections sit on a different page from timecards.
- **Proposed:**
  - **Release 1:** move the corrections list under Time as "Corrections (n)", and show it on the timecard sheet when one is pending. Give a missed clock-in a clear next step: "Ask Sam to add his time" (an SMS link already exists on the person page).
  - **1.1:** "Add missing time" and "Edit punch" for the Owner, with a required reason and the original punch kept. This matches the audit-trail decision of Oct 25.

### F5. Review and run payroll

- **Today:** Payroll › "Review" (the card says "Not prepared yet") › Prepare payroll › big "Prepare draft" for the current week, small "Prepare" links for three unpaid past weeks › (draft created) › Review › Fix › People › Approve. I didn't create a draft, so I couldn't walk the steps after Prepare. Evidence: `D/app_payroll-0.png`, `W/t2-01-pay-review.png`.
- **Friction:**
  - The button name is wrong (Review vs Prepare).
  - The overdue periods are secondary.
  - The current week can't be prepared meaningfully until Sunday, yet it gets the primary button.
  - Past runs show no amounts, so there's no reassurance.
- **Proposed:**
  - Payroll opens on the most urgent run: "Oct 19–25 · Payday was Tue, Oct 27 · Not run". Primary: "Prepare payroll". The list of the other two unpaid periods sits below it.
  - The current week shows "Opens Sunday".
  - Past runs show total, people count, and approved-by and date.

### F6. Add a person

- **Today:** Team › "+ Add" › step 1 (name, phone, email, role, location) › "Next" › step 2 (Employee ID, typed by hand; positions; locations) › "Add". The PIN and pay rate are set elsewhere: Settings › Employee PINs, and Payroll settings › Payroll setup. Evidence: `R/sheetN.png`, `W/tm-06-addemp-step2.png`.
- **Friction:**
  - Step 2 opens with a premature error.
  - The ID is invented by the owner.
  - After "Add" the person can't clock in (no PIN) or be paid (no rate) until two more trips.
- **Proposed:**
  - Step 2 opens clean.
  - Suggest an ID, or generate it (1.1).
  - After Add, land on the new person's page with a three-row "Get Ana ready" checklist: Clocker PIN, Pay rate, First shift. Each row links to the existing page. Release 1 can do the landing and the links; the checklist state is 1.1.

### F7. Set up a tablet

- **Today:** More (phone) or Settings › "Clocker devices 0" › Clocker tablets (2 "Needs setup") › either "Set up a new tablet" (creates a **third** device) or the row › "Rename device" sheet › "New setup code". Evidence: `R/sheetG.png`, `W/tm-01-tablet-add.png`, `W/tm-02-tablet-row.png`.
- **Friction:**
  - The count says 0 while the page shows 2.
  - The obvious button makes a duplicate tablet.
  - The real step is hidden in a rename dialog.
  - Home's setup checklist never mentions tablets or PINs.
- **Proposed:**
  - When tablets need setup, each row's own primary is "Get setup code", and "Set up a new tablet" becomes a secondary "Add another tablet".
  - The tablet sheet is titled with the tablet's name: Get setup code (primary), Rename, Remove.
  - Home's Finish setting up adds "Set up the Condado iPad" and "Give your team PINs" (1.1 for the checks).

---

## 5. Top 10 upgrades, ranked by premium impact per effort

| # | Upgrade | What changes | Tag | Effort | Score /16 |
|---|---|---|---|---|---|
| 1 | **Fix wrong destinations and labels** | Team "Clocker PIN" → Employee PINs. Payroll "Review" → "Prepare payroll". Home payday card → "Approvals open Sunday / View timecards" until the period closes. Clocker tablets row sheet → titled with the tablet's name, primary "Get setup code". | Release 1 polish (presentation only) | S | 15 |
| 2 | **Put unpaid periods first on Payroll** | Move "Periods with no payroll" to the top as a red notice naming the oldest. Make the oldest the Prepare page's primary and demote the current week to "Opens Sunday". (Showing it on Home as well is 1.1+, because it needs a new read.) | Release 1 polish (presentation only) | S | 15 |
| 3 | **One name per place** | Things to do (search, H1, breadcrumbs), Time/Timecards, Who's working (not Attendance), Hours this week (not Team overview), Activity, Clocker tablets (not devices), Missed clock-ins. Top-bar title = H1 everywhere. | Release 1 polish (presentation only) | S | 14 |
| 4 | **Make Find cover a decision, not a dead end** | R1: new empty copy plus links to Edit shift and Delete shift. 1.1: Post as open shift, Assign, Not available (n) with reasons, per board O-FindCover. | 1.1+ (needs logic or new data), with an R1 copy step | M | 14 |
| 5 | **Calm Home and Things to do** | Home's Things to do lists decisions (Time off, Corrections, Swaps) instead of repeating Today's counts. Things to do keeps 3 cards. Drop "More to review 45" and the past coverage gaps from counts; rename the planning bucket "Coming up". | Release 1 polish (presentation only) | M | 14 |
| 6 | **One Settings, one More** | The phone avatar sheet becomes Your profile, Insights, Updates, Settings, Help, Sign out. The six setting rows move into Settings. Notifications leaves "Account". The desktop account menu drops the duplicate profile entry. Scheduling rules lives in Settings and stays one tap from Schedule's ⋯. | Release 1 polish (presentation only) | M | 13 |
| 7 | **Honest Timecards** | One period control. "None approved yet" instead of "0 of 9". Drop the footer count and "Refresh". The same structure on desktop and phone. Fix the Payroll tab row so "Timecards" doesn't jump sections, or remove that tab. | Release 1 polish (presentation only) | S–M | 13 |
| 8 | **Corrections live under Time** | Move "Clock-ins and corrections" from Who's working to Time as "Corrections (n)", shown on the timecard sheet when one is pending. Add Time corrections to Things to do. | Release 1 polish (presentation only); the Things to do count is 1.1+ | M | 13 |
| 9 | **A person page worth opening** | This week's hours, next shift, pay rate, an availability summary, and Shifts and Availability filtered to the person (board O-Person). After Add employee, land here with "Get ready: PIN, pay rate, first shift". | 1.1+ (needs logic or new data) | L | 13 |
| 10 | **Setup that matches reality, plus Owner time fixes** | Finish setting up includes tablets and PINs. The Owner can add missing time and edit a punch, with a reason and the original kept. | 1.1+ (needs logic or new data) | L | 13 |

**Scorecard lines** (Usability, Familiarity, Trust, Accessibility, Brand, Durability, Cost, Continuity):

| # | U | F | T | A | B | D | C | Co | Total | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 15 | Go |
| 2 | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 15 | Go |
| 3 | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 1 | 14 | Go, with a note on what was renamed |
| 4 | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | 14 | Go (R1 copy), 1.1 for actions |
| 5 | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | 14 | Go |
| 6 | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 1 | 13 | Go; keep every URL working |
| 7 | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 1 | 13 | Go |
| 8 | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 1 | 13 | Go |
| 9 | 2 | 2 | 2 | 2 | 1 | 2 | 0 | 2 | 13 | Go for 1.1 |
| 10 | 2 | 2 | 2 | 2 | 1 | 2 | 0 | 2 | 13 | Go for 1.1 |

Brand scores 1 throughout: none of these makes NEVORA more distinctive on its own. Release 1.1's Spanish and dynamic text work carries that.

---

## 6. Not checked

- **Anything after a submit.** That covers payroll Review, Fix, People and Approve after "Prepare draft"; Publish confirmation; Approve or Decline results; tablet setup-code display and expiry; Add employee success; Deactivate; Reset password. I saw no success toasts.
- **Find cover with someone available.** All three of today's open shifts had 0 candidates, so the "Best fit first" list and Assign weren't seen.
- **Payroll details with amounts.** The approved runs in this data have none, so whether "No amounts are saved" is a fixture artifact is unconfirmed.
- **Pending employee corrections.** None existed, so the correction review UI inside Who's working wasn't seen populated.
- **The account menu's "Profile and device settings" popover.** It showed nothing visible in automation and needs a manual check.
- **Other browsers and states.** WebKit and Firefox, keyboard and focus order, screen reader, reduced motion (captures had reduced motion on, but I didn't compare without it), landscape, and an offline state.
- **Out of scope by instruction:** AI manager (off; returns "There's no page here"), the Lead role, and phone clock-in.
- **Real empty Home and Inbox for a new company.** This data always has items.
