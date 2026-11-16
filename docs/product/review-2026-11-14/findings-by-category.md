# Findings by category (Nov 14, 2026)

Start with [README.md](README.md): it holds the release blockers, the decisions for Jose and the evidence method. This file lists the remaining findings for each of the seven review areas, most severe first.

**How to read a row**

- **Type:** D = observed defect. P = design preference. F = proposed feature.
- **Evidence:** [B] seen in a running browser with real sign-in on fictional local data. [C] read in code. [R] research with a source. Screenshots are in [evidence/](evidence/).
- **Severity:** High, Medium, Low. Blockers are in the README and are referenced here by ID only.
- **Effort:** S is two days or less. M is two weeks or less. L is more.
- **Owner:** Codex (backend, hosting), Claude (UI), Jose (decision). Counsel or a CPA where named.
- **IDs** match the appendices (AR, JR, MK, PY, RA, UI). BR marks a finding from my own browser run.

---

## 1. Application architecture and organisation

Full route inventory and navigation trees: [appendix/architecture-and-navigation.md](appendix/architecture-and-navigation.md).

**What holds up.** Each role has five clear destinations. Owner on desktop: Home, Schedule, Time, Payroll, Team, Things to do. Employee: Home, Schedule, Time, Pay, Requests. The pages that look like duplicates are not: Things to do holds decisions, Notifications holds events, Updates holds announcements, Requests holds an employee's own requests. A wrong-role visit to Payroll or Settings gets a polite explanation ("Payroll is for Owners. Jose Natal can give you payroll access.").

Blockers in this area: AR-1 (no error log), AR-8 (flags), AR-4 (payroll blocker routing), AR-2 (guided setup). See README.

### Near-term improvements

| ID | Finding and evidence | Affects | Impact, severity | Recommended improvement | Effort, depends on | Owner | Existing work |
|---|---|---|---|---|---|---|---|
| AR-5 | D [C]. A Manager limited to certain locations gets Home, Schedule and Team only, drawn in the older interface, and cannot publish, approve hours or decide time off. `src/lib/navigation.ts:229-232` | Location Manager; multi-location owners | The Owner still does every approval. High for multi-location customers. | Decide if this role is in the release. If yes, scope Timecards, Time off and Things to do by location. If no, hide the option. | L to build, S to hide | Jose, then Codex + Claude | No. The Nov 11 Manager review never captured this state. |
| BR-1 | D [B]. One week's hours appear four ways: More "383 h this week", Timecards tile "382 h", Timecards total "382 h 51 min", Insights "382 h 55 min". Home says "6 timecards to review"; Things to do says "Timecards to approve · waiting 16". [owner-timecards-1440.png](evidence/owner-timecards-1440.png), [owner-more-390.png](evidence/owner-more-390.png) | Owner, Manager | Two numbers for one fact make an Owner doubt both. High. | One formatter and one count per fact, read by every screen. | M | Claude; Codex for a server count | Planned: Phase 1 formatter set, Phase 2 vocabulary. Not started. |
| AR-11 | D [C]. After every timecard is finalised, nothing leads to Payroll. Payroll links back to Timecards; Timecards offers only Time exports and Time corrections. `src/components/timecards.tsx:547-549` | Owner; approval to pay | The Owner finishes approvals and lands on a list. Medium. | One next-step row: "Prepare payroll for {period}". For a Manager: "All done. {Owner} runs payroll." | S | Claude | Not found in earlier reviews. |
| BR-2 | D [B]. "Approve" and "Finalize" name one step. Button "Approve timecard", chip "Ready to finalize", tile "Approved 6/12", Time exports "Only finalized timecards are exported" next to "Approve 10 timecards first". [owner-timecard-sheet-390.png](evidence/owner-timecard-sheet-390.png), [owner-time-exports-1440.png](evidence/owner-time-exports-1440.png) | Owner, Manager | The Owner cannot tell if there are one or two steps. Medium. | Pick one verb per step and use it on every screen. | S | Claude, Jose for the word | Partly: MG-010 asks for this. |
| AR-9 | D [C]. Team availability has no menu entry for an Owner or Manager. The path is Team, Hours this week, View availability. `src/lib/navigation.ts:52-57` | Owner, Manager; building a week | They cannot check who is free before scheduling. Phones have no Search to fall back on. Medium. | A row on Schedule and in Build and publish; a row in Things to do beside Time off. | S | Claude | No |
| AR-10 | D [C]. On a person's page, "Shifts" and "Availability" open the whole team's pages. `src/app/app/employees/[employeeId]/page.tsx:109-111` | Owner, Manager | Tap one person, land on everyone. Medium. | Pass the person and week to both links. | S | Claude | No |
| BR-3 | D [B]. The person page shows three bare rows (Shifts, Timecards, Availability) and "No Clocker PIN yet". It shows no hours this week, no next shift and no invitation status. [owner-person-1440.png](evidence/owner-person-1440.png) | Owner, Manager | The page where an Owner checks on one employee answers nothing. Medium. | Today and This week figures, next shift, and sign-in status ("Invited Nov 12, not activated"). | M; server read exists (`readOperationalEmployeeHours`) | Claude | Planned in Phase 3; invitation status is new. |
| AR-12 | P [C]. Hours export from three places with different meanings: Insights "Export", Time exports, and period-close files inside Time exports. | Owner sending hours to an accountant | Two files of "hours" with different totals. Medium. | One export for payroll. Label the Insights download as a report. | M | Claude; Codex if files move | Partly (owner-simplicity handoff) |
| BR-4 | D [B]. On phones the bottom bar lights "Home" on More, Insights, Settings, Profile and Notifications. Desktop Help shows a back link to "More", a page desktop never shows. [owner-more-390.png](evidence/owner-more-390.png), [owner-help-1440.png](evidence/owner-help-1440.png) | All roles | The bar says you are somewhere you are not. Low. | No lit tab on pages outside the five; back links name the real parent. | S | Claude | No |
| AR-15 | D [B][C]. One place, two names: tab "Time" opens "Timecards"; browser tab "Shift requests" over heading "Pick up and swap"; "My pay" over "Pay"; "Week templates" over "Templates"; "Help someone sign in" over "Account recovery". Labels live in five files. | All roles; support calls | "Open Timecards" in a help answer matches no tab. Low to Medium. | One route table (path, name, short name, icon) that menus, Search, back links and titles read. | M | Claude | Partly (copy glossary, UI backlog #6) |
| AR-16 | P [B]. With payroll on, the Owner's phone has no "To do" tab; a Manager's phone has one. | Owner on a phone | The Owner's most frequent job sits one level deeper than the Manager's. Low to Medium. | Keep it and make the Home entry the hero (it is today), or give both roles the same five tabs and move Payroll under More. | S | Jose, Claude | Partly (MG-006, MG-007) |
| AR-6, AR-7, UI-4 | D [C]. Every signed-in page loads about 2.3 MB of raw CSS from 42 stylesheets written in nine design rounds. 6,988 `!important`. Eight component kits; several pages render a phone version and a desktop version and hide one. | Everyone; phones and the kiosk most | Slower first load (not measured) and every visual fix risks a break elsewhere. High for speed of improvement. | Run Phase 1, then move pages to the Direction B kit one at a time and delete each page's old rules. Set a size budget. | L | Claude | Partly: Phase 1 and the B8 rule. No retirement phase exists. |
| AR-21 | D [C]. 80 Vitest config files at the root; 27 are run by nothing I could find. CI runs on `development`, `main` and pull requests, so pushes to this branch get no CI. The unit suite takes 14 to 15 minutes. | Developers; release confidence | UI work sits unverified until a pull request. Medium. | Add this branch to CI push triggers; one base config with named projects. | M | Codex | Partly (Oct 21 inspection) |
| AR-23, JR-25 | D [C]. `docs/` holds 12,812 files, 77% of the repository, with 173 dated handoffs in six weeks. The root README still says SaaS is paused. `docs/architecture.md` never mentions payroll, billing or onboarding. | Jose, both agents | Each session spends time working out what is current. Medium. | One `docs/CURRENT.md`: state, flags per environment, open decisions, latest handoff. | S | Jose, Codex, Claude | Partly (developer guide is current) |
| AR-18, RA-7 | D [B]. An employee who opens `/app/employees` lands on Home with no message. About 14 pages do this; six explain. | Employee, Lead following an old link | "The link did nothing." Low. | Show the same notice Payroll and Settings use. | S | Claude | Partly (NV-136 covered six pages) |
| BR-5 | D [B]. Form buttons sit in two places: at the card bottom on Add shift and Add employee, in the teal band on New update and Build and publish. | Owner, Manager | Small hunt for the save button. Low. | One placement for form actions. | S | Claude | Covered in spirit by Phase 2 (one frame) |
| AR-19, UI-19 | D [C]. 41 of 340 component files have no importer; 15 stylesheets are imported nowhere; `gsap` is installed and never imported; 274 dark-mode selectors remain though the brand is light only. | Developers | Dead code misleads and adds weight. Low. | Delete after one confirmation pass per file. | S | Claude | No |
| AR-20 | P [C]. "fuel" survives in the package name, session cookie, service worker and manifest path. No user sees the word. | A second customer's IT reviewer | Cosmetic. Low. | Rename the package and icons when convenient; leave the cookie until a planned sign-out. | S | Codex | Documented as intentional |

### Future

| ID | Item | Why later |
|---|---|---|
| AR-24 | Split billing, onboarding and operations from the workforce app deployable | No restructuring before release. Record what is in the release and what is held. |
| AR-17 | Give Who's working, Hours this week and Activity their own addresses | Works today through exceptions in the shell. |
| AR-25 | Screens for conversations, staff tasks and manager reminders (APIs exist) | Decide per feature; each adds a surface to learn. |

---

## 2. Market research and product usefulness

Full research with 66 sources: [appendix/market-research.md](appendix/market-research.md). Sources were read on Nov 14, 2026. Gusto's own pages and the Homebase help centre blocked direct reading, so those details come from search summaries and are marked in the appendix.

### What small hourly businesses need, and how NEVORA does

| Need | Evidence | NEVORA today | What the benchmarks do | Recommendation |
|---|---|---|---|---|
| First schedule out the same day | Homebase's first run is three steps: add team (typed or CSV), upload the old schedule, publish. [R] [joinhomebase.com/employee-scheduling](https://www.joinhomebase.com/employee-scheduling) | Partly. Staff are added one at a time. Roster import is backend only. No guided first week. [B][C] | Homebase and Gusto turn a photo of the old schedule into shifts. ADP assigns a specialist. | Build the roster import screen, then a three-step first run that ends in Publish. |
| Staff join without training | Homebase sends a link by text and email, assigns a PIN and shows "Signed In" per person. [R] | Partly. Invitation by email only, off by default; no joined status on the person page. [C][B] | Gusto: welcome email and checklist. | Fix JR-5, show joined or not joined per person, add a path for staff without email. |
| Stop early clock-ins and forgotten clock-outs | 45% of hourly workers report clocking in while not working, such as early clock-in or no clock-out. Centiment for OnTheClock, 831 workers, July 2026, vendor survey. [R] [wftv.com](https://www.wftv.com/news/time-theft-report/SF4F7UB7PY677GFBEXZISEXSSA/) | Not seen. In the test data James clocked in at 9:02 AM for a 9 to 5 shift and was still "Clocked in" at 10:52 PM with nothing flagged; the kiosk also accepted a clock-in at 11:24 PM with no shift. [B] I did not check Owner policy settings. | Homebase blocks early clock-in and auto clocks out on its $70 tier. | Two plain toggles: block clock-in more than N minutes early; flag a punch left open N hours past the shift. |
| Clean timesheets before pay | Nearly half of HR teams spend 5 or more hours per cycle fixing errors. Paylocity, 776 leaders, not SMB-only. [R] | Yes. Corrections with recorded versus asked-for times are a strong screen. [B] | Homebase: missed-punch list, employee fixes, lock. | Keep. Add a "fix before close" list inside Payroll. |
| Spanish for staff and managers | 95% of Puerto Rico residents speak a language other than English at home (Census). [R] | No, after sign-in. | Homebase: English, Spanish, French, chosen per person, remembered at the kiosk. ADP Mobile: Spanish. | The largest gap against Homebase. See README, Spanish gate. |
| Pay calculated and documented for Puerto Rico | Homebase payroll covers "all 50 states and Washington D.C."; 7shifts Payroll and QuickBooks Payroll exclude Puerto Rico. [R] | Yes, and beyond intended scope. | None of the self-serve payroll products runs Puerto Rico payroll. | NEVORA's real comparison is statement accuracy and export quality. See section 7. |
| An export an accountant accepts | When I Work lists what its export omits; Connecteam marks periods "already exported". [R] | Partly. Hours only. No export of calculated amounts. No exported marker. | Deputy and When I Work send approved timesheets to a named payroll partner. | CSV of approved amounts (PY-5) and an exported state per period. |
| Predictable low price | Complaints centre on tier jumps, per-user metering and paid add-ons. Homebase sells Tip Manager, Task Manager and Hiring as add-ons. [R] | Jose's decision. | Homebase $30 / $70 / $120 per location; 7shifts about $40 / $80; Connecteam $29 to $35 for the first 30 users; free tiers up to 10 or 15 staff. | One flat price per location with everything included. Thirty days is generous against the 14-day norm and suits a product whose value shows at period close. |
| Works when Wi-Fi drops | Homebase says its clock works offline. [R] | No kiosk offline shell. The employee Home hides the next shift offline. [B][C] | | Kiosk offline screen first; queued punches later. |

**Total cost caveat.** In the 50 states, Homebase Essentials plus payroll for 15 staff is about $169 a month and includes tax filing. A NEVORA customer pays NEVORA plus a local accountant or provider. If NEVORA does not shrink that second bill, "low cost" is hard to claim. Test this with real customers. I found no Puerto Rico pricing evidence.

### Essential, and worth building

| ID | Capability | Why essential for this audience | Effort | Type |
|---|---|---|---|---|
| MK-1 | Spanish across employee screens, then manager | First market; Homebase and ADP Mobile have it | L | UI and content; Jose's timing |
| MK-2 | Roster import and a guided first week | Sets the first-hour impression; backend is merged | S to M | UI |
| MK-3 | Invite link with joined status; a path without email | Category norm | M | Backend + UI |
| MK-4 | Early clock-in and forgotten clock-out rules | The most common time-theft behaviours; Homebase charges for them | S to M | Backend rule + UI |
| MK-5 | Pay statement checked against Puerto Rico content rules | ADP's chart lists eight required items under Regulation 9017. I did not read the regulation itself. | S, plus counsel | Template; counsel |
| MK-6 | Export of calculated amounts, with an exported marker | The export is the hand-off to whoever pays and files | M | Backend + UI |
| MK-7 | Puerto Rico overtime and meal-period flags on schedule and timecard | Where a US-built tool gives wrong answers. Counsel must confirm the rules. | M to L | Backend + UI; counsel |
| MK-8 | Kiosk offline screen | Shared tablets on weak Wi-Fi | M | UI, then backend |
| MK-9 | Christmas bonus hours report (Oct 1 to Sep 30 against the threshold) | Cheap, local, no competitor found | S, plus counsel | Backend report |

### Would add complexity without enough value now

| Feature | Why not now |
|---|---|
| Moving money or filing taxes | Regulated and outside scope. No self-serve vendor does it for Puerto Rico. |
| GPS clock-in from phones | The kiosk covers cafés, restaurants and retail. 66% of workers say more monitoring would not change behaviour (same survey). |
| Face or fingerprint clock-in | Privacy risk; local rules unchecked. |
| POS integrations, sales forecasting, tip pooling | Ongoing upkeep per POS; tip law adds counsel work. Revisit tips after launch. |
| Hiring, background checks, HR advice, training | These are the add-ons customers complain about. |
| Schedule import from a photo | Homebase and Gusto now do it, so expect to be asked. CSV or paste gets most of the value at far lower cost. |
| AI that acts on schedules or pay | Among small businesses not using AI, 31% fear mistakes and 31% want a person in control (Homebase survey, vendor). Keep the advisor advisory. |
| Per-user pricing and paid add-ons | The complaint NEVORA can position against. |

---

## 3. UI quality and usability

Measured audit and plan status: [appendix/ui-system-audit.md](appendix/ui-system-audit.md).

### Verdict

**Reading this as:** an operations tool for small-business owners on desktop and hourly staff on phones, where the register should be calm and trustworthy, the stakes are high because it shows pay, and the right ceiling is a coherent, finished product with character on Home, sign-in and the kiosk.

**First impression.** Home, the Employee app, sign-in and the Clocker look like one product that someone decided. The teal band carries one fact ("11 things need you"), white cards hold one message each, and the Clocker receipt ("Clock In recorded 11:24 PM. Have a good shift, James.") is the best moment in the product. [owner-home-1440.png](evidence/owner-home-1440.png), [clocker-receipt-1024.png](evidence/clocker-receipt-1024.png)

That impression breaks in four places: the billing pages, the notification lists, the older Settings and form pages, and anywhere two numbers disagree.

**Craft floor**

| Dimension | Read | Evidence |
|---|---|---|
| Spacing | Holds on the new screens | [B] even rhythm on Home, Things to do, Employee app. [C] 51% of Direction B spacing values sit on the 4-point scale. |
| Type | Needs work | [B] four duration formats in one flow ("32 h 12", "2 h 00", "382 h 51 min", "8a–4p" beside "9 AM – 5 PM"). [C] 22 fixed sizes in the Direction B sheets against a plan of 8 roles. |
| Colour | Mostly holds | [B] one accent, used with restraint. Payroll and Pay pages have a near-black band while every other page is teal. "Done" is green in some places and teal in others. |
| Shadow | Holds in render | [B] one soft shadow on cards. [C] 104 shadow definitions behind it. |
| Alignment | Needs work | [B] three desktop content widths: Payroll and Team stop at about 812 px with an empty right half, Timecards and Schedule run to 1080, Settings uses two columns. [owner-payroll-1440.png](evidence/owner-payroll-1440.png) |
| Density | Right for the job | [B] The person page and Help are thin. |

**Grade: Competent.** The craft floor holds on the screens built in Direction B and slips where older layers show through. The product reaches coherence screen by screen and has not reached it as a whole. This grade covers craft and taste. Usability and accessibility are in sections 1 and 5.

**Protect:** the band with one headline fact; one message per card; the kiosk's large targets, clock and receipt; plain notices such as "Payroll is for Owners. Jose Natal can give you payroll access."; the Time corrections card that sets "Recorded" beside "Asked for" with the difference ([owner-time-corrections-1440.png](evidence/owner-time-corrections-1440.png)); locked settings that say why ("5 requests for time off are waiting for a decision. Decide them first.").

**The climb:** finish the system before more screens (one button, one row, one state pattern, one desktop frame), then make every row title state what happened.

### Near-term improvements

| ID | Finding and evidence | Affects | Impact, severity | Recommended improvement | Effort, depends on | Owner | Existing work |
|---|---|---|---|---|---|---|---|
| UI-1 | D [C]. The Nov 11 plan has not started in code: 0 of 59 spot-checked findings fixed. No `status.json`. | All | Every reviewed defect still ships. High. | Create `status.json` from the six review files, then start Phase 1. | S for tracking | Claude; Jose for priority | Step 0 partly done |
| UI-3 | D [C]. Four documents disagree on font, icon weight, band colour, canvas, status colours and the primary button. `DESIGN.MD:356-371` against `TEAM-RULES.md:6-25,78-101`. | Every session and agent | Work gets built to the wrong brand. The billing pages are the proof. High. | One token and status table at the top of `DESIGN.MD`; the other files point to it. | S | Jose decides the status colours; Claude edits | No |
| BR-6 | D [B]. Notifications say nothing. Owner: five rows titled "Operations need review". Employee: "Team update", "Shift request update", "Schedule update · Action needed". [owner-notifications-1440.png](evidence/owner-notifications-1440.png), [employee-notifications-390.png](evidence/employee-notifications-390.png) | All roles | People must open each row to learn what happened. High. | Titles that state the outcome: "Maria's time off Nov 26 was approved". | M | Claude; Codex for outcome text beyond `subject` | Planned (EM-005, OW-002); not started |
| BR-7 | D [B]. Things to do: time-correction rows read "Time correction waiting for review. James Ortiz · Recorded time correction."; swap rows show one name; two "waiting" sections sit outside the count of 11. [owner-things-to-do-1440.png](evidence/owner-things-to-do-1440.png) | Owner, Manager | The busiest list needs a tap to understand each row. Medium. | "James asked to start 20 min earlier, Nov 10"; "Ana ↔ James, Sat Nov 21"; one rule for what the count includes. | S to M; server fields exist (`counterpartName`) | Claude | Planned in Phase 3 |
| UI-5, UI-12, UI-11 | D [C][B]. Nine button families with eight base sizes and four primary fills; three row systems; nine empty, loading and error patterns. The Payroll phone page shows two "Prepare" buttons in different styles. [owner-payroll-390.png](evidence/owner-payroll-390.png) | All | The same action looks different page to page. High. | Phase 1 as written: one button set (48/40/32), one row, one state component. | M | Claude | Planned: SY-014, SY-015, SY-016, SY-022 |
| BR-8 | D [B]. Three desktop content widths and two band colours (see craft table). Phone Payroll has a three-step guide that desktop Payroll lacks. | Owner, Manager on desktop | Half-empty screens at 1440 px; Payroll looks like a different section. Medium. | Phase 2: one desktop frame, one band, three band heights. Match desktop Payroll to the phone. | M | Claude | Planned: Phase 2; OW-005; EM-011 |
| UI-6 | D [C]. 309 of 678 icons draw at regular weight; the rest are bold. Worst: Update compose (24), Update detail (17), Insights (13). | Updates, Insights, Pay, Notifications | Thin and bold icons on one screen. Medium. | One icon wrapper that defaults to bold; a lint rule. | S to M | Claude | Planned: SY-012 |
| UI-9, UI-24 | D [C][B]. Same state, different colour or word: "Approved" is teal on some Employee screens and green on Manager screens; "Pending" on Time corrections where the plan says "Waiting". Three reds are documented. | Employee, Manager | Colour stops carrying meaning. Medium. | One status table: grey neutral, amber waiting or review, green done, red urgent, teal for information. One chip mapping. | S to M; needs Jose's choice | Jose, Claude | Partly: Phase 2 vocabulary |
| BR-9 | D [B]. Jose's Nov 11 attendance words are not in the product. Home says "Missed 1" and "1 missed clock-in" for a shift that began 53 minutes earlier; Team says "Late 55 min". | Owner, Manager | "Missed" for someone who is late reads as a no-show. Medium. | "Not clocked in", "Clocked in late", "Missed" as decided. | S | Claude | Decided Nov 11; not built ("Clocked in late" appears in 0 files) |
| UI-17 | D [C]. Eleven Settings pages, Insights, Scheduling rules, Week templates, Payroll settings, Update compose and detail, Add shift and the PIN page are older markup under an override layer. | Owner, Manager | The most likely home of off-brand details. Medium. | Name them in Phase 3 and rebuild on the Direction B kit. | M to L | Claude | Phase 3 says "Settings sub-pages" only |
| UI-18 | D [C][B]. Sign-in draws its own button (52 px, its own teal) and carries 543 unlayered `!important`. It looks right today. | Signed-out pages | Drifts from the app as tokens change. Medium. | Read band, pill radius and focus colours from the shared tokens. | S to M | Claude | Phase 5 |
| BR-10 | D [B]. Capitalisation mixes "Clock Out", "Clock In recorded", "Try Again" with "Start break", "Connect tablet", "Sign in". Kiosk wording for staff includes "Refresh clock state" and "Help with a saved action". [clocker-lockout-1024.png](evidence/clocker-lockout-1024.png) | Kiosk | Small roughness on the best surface. Low. | Sentence case throughout; "Refresh", "Something didn't save?". | S | Claude | Phase 6 copy |
| BR-11 | D [B]. Small tap targets at 390 px (under 36 px on one side): Schedule "Previous week" and "Next week", Pay "See your hours", Profile "English" and "Español", Help "Forgot password?" and the support email, Team "Apply search". | Phone users | Missed taps. Medium. | 44 px hit areas. | S | Claude | Phase 1 button sizes cover most |
| UI-7, RA-21 | D [C]. Buttons scale on press regardless of the reduced-motion setting; 14 stylesheets with motion have no reduced-motion rule. `src/app/app/b-foundation.css:180` | Motion-sensitive users | Breaks the project's own rule. Medium. | Gate the scale behind `prefers-reduced-motion: no-preference`. | S | Claude | Planned: SY-018 |
| UI-23 | F [C]. Nothing stops the counts from drifting back after Phase 1. No style lint exists. | All | Gains erode. Medium. | A token lint and a CI budget for sizes, colours, radii and `!important`. | S to M | Claude | No |
| BR-12 | P [B]. Help offers one support email, three collapsed questions and the policies. The repo has role guides in `docs/guides/web/` that the app never shows. [owner-help-1440.png](evidence/owner-help-1440.png) | New Owners and staff | "Minimal training" depends on help being inside the product. Medium. | Short how-to cards per role, drawn from the existing guides. | M | Claude | No |

### Future

| Item | Why later |
|---|---|
| Phase 7 motion and success moments (sheet enter and exit, one success pattern) | After the system and screens settle. |
| Undo on approve and decline; keep the last result readable after the toast leaves (RA-20) | Needs a server reversal. |
| Retire the five older CSS generations page by page (UI-4) | Follows each phase; needs a visual-diff check. |

---

## 4. Complete customer journey

Journey table and blockers: README. Full trace: [appendix/customer-journey.md](appendix/customer-journey.md).

**What is true today.** NEVORA runs as one company per deployment, set up by an operator. Self-service signup, provisioning, trial and billing exist as backend code behind switches that are off. Velani's site sends every "Request a free trial" to a contact form. So the working journey is: contact form, operator runs `setup-company`, Owner receives an address, ID and password out of band, Owner signs in.

Legend for status: **Implemented** (screen, API, storage and tests exist), **Incomplete integration** (one side exists), **Future** (documented intent).

### Near-term improvements

| ID | Finding and evidence | Affects | Impact, severity | Recommended improvement | Effort, depends on | Owner | Existing work |
|---|---|---|---|---|---|---|---|
| JR-7, BR-13 | D [C][B]. The sign-in ID is in no email, and the Profile page does not show it either (it shows Name, Locations, Time zone). Velani says "Your address and ID: they're in the invitation email". [employee-profile-390.png](evidence/employee-profile-390.png) | Every employee and Owner | Anyone who did not copy the ID from the one-time success screen must ask a manager. Password reset needs the ID too. High. | Put the ID in the invitation email and on Profile. Send the Owner a "workplace ready" email. Fix the Velani sentence. | S to M | Codex (email), Claude (Profile, Velani copy) | No |
| JR-6, BR-14 | P [C][B]. Add employee marks email "(optional)" with no warning. Without it the person can never get a sign-in. [owner-add-employee-1440.png](evidence/owner-add-employee-1440.png) | Staff without email | They can use the kiosk and nothing else. Medium. | Say so on the form now. Then decide: require email, or add an Owner-handed activation code or QR. | S for the note; M for a new path | Claude, Jose, Codex | No |
| BR-15 | D [B]. A wrong password returns the sign-in form with both fields empty. An invalid or expired activation link shows the same screen as no link at all. [signin-error-es-390.png](evidence/signin-error-es-390.png), [activate-invalid-link-390.png](evidence/activate-invalid-link-390.png) | Everyone signing in or activating | Retyping an unfamiliar ID; no idea the link expired. Medium. | Keep the ID after an error. Say "This link has expired or was already used" with one next step. | S | Claude | Planned: PB-006, PB-007 |
| RA-5 | D [C]. When a session ends the app sends you to a bare `/login`: no message, no way back. 77 of 80 in-page sign-in links are bare. `src/lib/auth/session.ts:125-135` | All roles mid-task | Lost place and lost typed work. High. | Redirect with a reason and a safe return path; "Your session ended. Sign in to continue." | S to M | Claude; Codex if the helper is theirs | Planned: PB-005 |
| JR-9, JR-10, JR-11, JR-19 | D [C]. The billing page ignores the reason it receives and shows "Access paused"; "17 / 15" has no explanation; dates are UTC; every refusal becomes "Billing could not be opened"; a refresh loses the billing session and there is no link back; returning from Stripe shows no "confirming payment" state. | Owner at the worst moment | The Owner cannot tell an ended trial from a failed card from too many staff, and may pay twice. Medium each; High together. | One sentence and one action per reason, in workplace time; "Back to {business}" in every state; a confirming state after Stripe. | S each | Claude; Codex adds the time zone | Velani's page handles some of these; NEVORA's does not |
| JR-12 | D [C]. The paused page has no sign-out, so a manager's session blocks the Owner on that browser. The kiosk's paused page invites the Owner to sign in on the shared tablet. | Shared devices | An Owner session left open on a kiosk. Medium. | Add Sign out. On the tablet say "Open billing on your own device." | S | Claude | No |
| JR-17 | F [C]. Roster import and batch invitations are backend only. | Owner with 15 to 30 staff | 30 forms and 30 invitations. Medium. | Build the import screen per the Nov 14 owner-simplicity handoff. | M | Claude | Planned |
| BR-16 | D [B]. A new workplace with no tablet set up shows "Clocked in 0/2 · Missed 2" and "2 missed clock-ins" on Home. The setup card is the last card on the page. [owner-home-new-workspace-1440.png](evidence/owner-home-new-workspace-1440.png) | New Owner, first week | Day one opens with alarms about a feature not yet set up. Medium. | Until a tablet is registered, replace attendance tiles with "Set up your time clock". Move setup to the top until done. | S to M | Claude | Partly (owner setup card PRD) |
| JR-26 | D [C][B]. When punches are off, the tablet says "Time punches are not enabled yet." with no next step. Setup asks the Owner to paste a long one-use code typed or carried from another device. [clocker-setup-1024.png](evidence/clocker-setup-1024.png) | Owner setting up a tablet | Friction at the first physical step. Medium. | A QR or six-character code. A next step on the disabled message. | M | Claude + Codex | Similar to PB-008 (recovery code) |
| JR-13, JR-14, JR-15 | P [C]. Signup answers "check your email" even when no mail went out; the Owner activation link lasts 15 minutes and needs the same browser; provisioning can wait forever if the worker is off. | New Owner (once signup opens) | A prospect waits for mail that never comes. Medium. | Resend timer, "link expired, send a new one", "continue on this device", a time-boxed wait with a support path. | S each in the new screens | Claude | Rules written in the Nov 12 handoff |
| JR-23 | D [C]. The operator-set Owner password comes from an environment variable and is stored with `must_change_password=false`. `src/lib/company-bootstrap/server.ts:40` | Owner on the assisted path | Whoever set up the workplace knows the Owner's password. Medium. | Force a change at first sign-in, or send an activation link. | S to M | Codex | Not found |
| JR-22 | P [C]. A trial request gets no acknowledgement beyond the Shopify form. | Prospect | Up to two business days of silence. Medium. | An automatic reply with next steps and an internal checklist. | S | Jose (process), Claude (copy) | Partly (reply time in copy) |
| JR-31 | P [C]. Velani publishes $19 and $29 and a no-card 30-day trial; the backend calls them proposed; trial-end retention is policy only. | Prospect | Published promises ahead of approved terms. Medium. | Confirm prices and the trial-end rule before billing opens. | S | Jose | Open in both repos |

### Future

| ID | Item |
|---|---|
| JR-21 | A workplace finder on Velani ("Open NEVORA") once a production address exists |
| JR-27 | "Ask for a new invitation" on an expired link, which raises an Owner task |
| JR-16 | Show the trial end date at activation (the clock starts at provisioning by recorded decision) |
| JR-18 | Decide between the guided setup API and the Home setup card, and wire one |

---

## 5. Roles, devices and accessibility

Language table, state matrix and 30 findings: [appendix/roles-languages-accessibility.md](appendix/roles-languages-accessibility.md). No screen reader or physical device was used. Source reading cannot establish what assistive technology announces.

### By role

| Role | Devices seen | Verdict | Main gaps |
|---|---|---|---|
| **Owner** | 1440, 900, 390 | Strong on Home, Schedule, Timecards, Corrections. Keyboard focus is visible on the sidebar. Layout holds at every width. | Counts disagree (BR-1). Notifications say nothing (BR-6). Payroll expectations (section 7). No billing entry. Person page is thin. |
| **Manager** | 1440, 390 | Same screens as Owner minus Settings and Payroll, with clear notices. | A Manager who clocks in has no personal time view: "My time is for employees" while her own card (40 h 37) sits in the team list she approves. [manager-my-time-1440.png](evidence/manager-my-time-1440.png) Location-scoped Managers get the older interface (AR-5). |
| **Lead** | 390, 1440 | Identical to Employee plus a "Shift lead" chip. | Nothing a Lead can do that an Employee cannot. Fine if that is the intent. |
| **Employee** | 320, 390, 844×390, 900, 1440 | The most finished role. Requests uses clear chips ("With teammate", "Needs approval", "Waiting"). | English only. Payday wording (PY-7). Profile omits the sign-in ID. Offline hides the next shift. |
| **Shared tablet** | 1024×768, 768×1024, EN and ES | The most polished surface. Auto-clears a verified screen after 30 s and the receipt after 8 s. Spanish is complete. | PIN only (approved ID step not built). Lockout wording. No kiosk error page. No offline shell. English by default. |
| **Signed-out** | 390, 1440, EN and ES | On brand and bilingual. | Policies, Support and Account deletion are English only; the Spanish footer says "(en inglés)". Billing pages look like another product. |

### Languages

| Surface | English | Spanish |
|---|---|---|
| Sign-in, forgot, reset, activate, 404 | Yes | Yes [B] |
| Clocker kiosk | Yes | Yes, complete [B] |
| Billing pages | Yes | Yes [B] |
| Pay statement PDF | Yes | Yes [C] |
| Employee, Lead, Manager, Owner apps, Settings, Payroll | Yes | No [B]. Profile says: "Sign-in pages only. The rest of NEVORA is in English for now." |
| Privacy, Terms, Support, Account deletion, error screens, offline page | Yes | No [B] |
| Push notifications | Yes, generic | No [C] |
| Account emails | Both languages in one message, English first [C] | |

Language is a cookie on the device. The app never reads the browser's language and stores no language per person, so emails and push cannot match the reader.

### Near-term improvements

| ID | Finding and evidence | Affects | Impact, severity | Recommended improvement | Effort, depends on | Owner | Existing work |
|---|---|---|---|---|---|---|---|
| RA-3, UI-8 | D [B][C]. The kiosk asks for a PIN only. Lockout reads "This tablet is paused. Too many wrong PINs were entered on this tablet. Wait about five minutes". The server already sends who is paused and for how long. [clocker-pin-1024.png](evidence/clocker-pin-1024.png), [clocker-lockout-1024.png](evidence/clocker-lockout-1024.png) | Every employee | A paused person reads that the tablet is broken; nobody knows when to retry. Jose's Nov 11 decisions are unbuilt. High. | Employee ID then PIN; "Your PIN is paused. Try again at 10:58 PM." | M; server contract delivered | Claude | Decided Nov 11; Phase 6 not started |
| RA-4 | D [C]. The kiosk has no error page of its own. A render failure shows the public English screen with "Go to sign in". | Shared tablet | A shared tablet invites someone to sign in. High. | A kiosk error page in the kiosk's language: "Try again" and "Ask a manager". | S | Claude | Flagged Oct 21; open |
| RA-6 | F [C][B]. No offline shell for the kiosk: a reload without Wi-Fi shows the browser's error page. The employee Home offline shows "You're offline. Your shift updates when you reconnect." and hides the shift it already had. [employee-home-offline-390.png](evidence/employee-home-offline-390.png) | Kiosk; phone users with weak signal | No clock-in and no schedule exactly when the network fails. High at the kiosk. | Kiosk offline screen naming the manager fallback. Keep the last-known next shift on Home. Decide on queued punches. | M shell; L queued punches | Jose, then Codex + Claude | Portal part in the UI backlog (#9); kiosk part is new |
| RA-13 | D [B][C]. Tablets start in English; the choice sticks for the next person; the paused page reads the sign-in cookie instead of the kiosk's choice. | Puerto Rico tablets | The first screen staff see is in the wrong language. Medium. | An Owner setting for each tablet's default; decide if it resets after each punch. | S to M | Jose, Claude | No |
| BR-17 | P [B]. A Manager who works shifts cannot see her own time or ask for a correction on her own punch. | Working Managers | Common in small businesses, where the manager is on the floor. Medium. | Give Managers "My time" for their own entries; keep their card out of their own approval count. | M | Claude; Codex if a read is needed | Related: MG-004 |
| RA-8 | D [C]. Direction B sets type in fixed pixels, so a larger default text size in the browser changes nothing. Zoom still works. `src/app/b-tokens.css:41-46` | Low-vision users | A stated preference is ignored. Medium. Needs a browser check at 200%. | Express type roles in rem during Phase 1. | M | Claude | No. Looks like a regression. |
| RA-14 | D [C]. Colour pairs under target, computed from tokens: grey text on tinted fills 4.3 to 4.4:1; second-line white on the band's glass 3.8:1; coral dot on the band 2.1:1; field edge 3.1:1. Not sampled from rendered pixels. | Low vision; phones outdoors | Small grey text and band sub-lines are hard to read. Medium. | Apply the token fixes already proposed. | S | Claude | Planned: SY-008 |
| RA-10 | D [C]. In the schedule grid the empty-cell "+ Add" appears on hover only, and the grid has no arrow-key movement. `src/components/manager-weekly-roster.tsx:371` | Keyboard and iPad users | No way to add a shift for a person and day without a mouse. Medium. | Make the cell action focusable and visible on touch; add arrow keys. | M | Claude | Arrow keys are in the UI backlog (#4); hover-only is new |
| RA-9 | D [C]. Shared form validation is English, can fall back to the browser's language, and is not announced to screen readers. `src/components/form-validation.tsx:41-66` | Every form | Mixed-language errors; silent errors for screen-reader users. Medium. | Add `role="alert"`, re-link the message to its field each time, route text through the dictionary. | S | Claude | Known, open |
| RA-17 | D [C]. Focus rings drawn with box-shadow vanish in Windows High Contrast on the PIN field, team search and sidebar. | Keyboard users in High Contrast | No visible focus. Medium. | Add a transparent outline that forced colours can paint. | S | Claude | Older layers fixed; Direction B and the kiosk are not |
| RA-15 | P [C]. Error screens always blame the connection and show no reference. | All | Support has nothing to quote. Medium. | Separate offline from server fault; show a short reference (pairs with AR-1). | S | Claude + Codex | Partly |
| RA-16, RA-30 | D [C]. Notification times and Owner advisor dates use the device's time zone and `en-US`. | Anyone whose device differs from the workplace | Times disagree with the rest of the app. Medium. | Pass the workplace zone. | S | Codex + Claude | Half-fixed |
| RA-11, RA-12 | D [C][B]. Push text is English and generic ("Your request has an update"). Policies, Support, deletion and error screens are English only. | Spanish speakers | Mixed-language product edges. Medium. | Per-language push after a stored language exists; translate Support, deletion and errors; ask counsel about Spanish policies. | M | Codex, Claude, Jose | Planned: PB-001, PB-025 |
| RA-19 | D [C]. The offline page exists only for people who turned on alerts; the installed app's sign-in sits outside the manifest scope. | Phone users | Most people see the browser's offline page. Medium. | Register the service worker for every role; widen the scope. | S to M | Claude | UI backlog #9 |
| RA-28 | F [C]. Automated accessibility checks (`axe-core`) run in a few browser suites: Owner advisor, central billing and the Phase E navigation scenarios. The rebuilt role screens and the kiosk have none. This corrects the appendix, which says no check exists. | All | Regressions on the main screens arrive unnoticed. Low. | Add an axe pass to the role and kiosk browser suites. | S to M | Claude | Partly |
| RA-24, RA-25, RA-23 | D [C]. Billing, Help and More load under a Home-shaped skeleton; the delegated correction page has no title; `<html lang>` is always `en`. | All | Small. Low. | Add the entries, the title, and set `lang` from the chosen language. | S | Claude | Partly |

**Checked and sound.** [B] 474 layout checks across roles, widths and languages found no horizontal overflow. Focus is visible on sidebar items. Restricted pages explain themselves on Payroll, Settings and My time. [C] No positive `tabindex`; icon buttons are named; sheets are native dialogs; schedule, timecards and pay use real tables; skip links exist; zoom is not blocked; private screens clear when the person steps away.

**One correction to the appendix.** RA-18 says draft and published shifts differ only by a pale fill. In the rendered schedule, drafts have a dashed border and grey fill, and published shifts a solid teal tint. I did not reproduce the defect.

### Future

| Item | Why later |
|---|---|
| Queued offline punches at the kiosk | Needs server rules for late-arriving punches. |
| A stored language per person, used by email and push (RA-2) | Groundwork for the Spanish decision. |
| Screen-reader passes with VoiceOver and TalkBack | Needs devices; nothing in this report claims that coverage. |

---

## 6. Evidence and verification

**Observed defects, preferences and features are marked per row** (D, P, F). The near-term tables in this file hold 54 observed defects, 15 design preferences and 6 proposed features. The README adds 13 blocker rows, and the market section adds 9 proposed capabilities.

**What each evidence level proves**

| Level | Proves | Does not prove |
|---|---|---|
| [B] browser | The screen and flow behaved as described with real sign-in, real server code and a local Postgres of fictional data. | Hosted behaviour, performance, real email, push, Stripe, or anything behind a switch that was off. |
| [C] code | The file says what the finding says. | That the screen renders that way. Three of the 59 plan findings need a render to judge. |
| [R] research | The source said it on Nov 14, 2026. | That a vendor's claim is true. |

**Not exercised in a browser, so code-only:** self-service signup and onboarding; trial expiry, the billing gate and billing recovery; the Owner AI advisor; passkeys; the mobile-access welcome and help pages; push notifications; the native app shells; the location-scoped Manager.

**Fixture effects to keep in mind.** The seeded data includes two periods "with no payroll" and one punch left open all day. Those are deliberate fixture states. I cite them only for how the product words and handles them.

**Could not verify**

- Which switches are on in the hosted development or production environments, and which commit is deployed.
- SMTP, Stripe, DNS and Velani's published theme.
- Whether the tax tables and rates in the payroll engine are right. That needs a CPA.
- Legal requirements in Puerto Rico. Every rule in the market appendix needs counsel.
- Screen-reader output, real-device behaviour, rendered contrast, 200% text.
- Whether Back shows a private page after sign-out on a shared computer (no-store headers cover kiosk and recovery routes only).
- Load time. The 2.3 MB CSS figure is raw source size before bundling and compression.
- The repo's own test suite. I did not run it.

**Corrections I made to my own evidence.** Two `403` console errors on Notifications came from the capture tool's extra request, so I dropped them. A first Spanish run failed because my script looked for the English "Employee ID" label; I fixed the script and reran it.

---

## 7. Payroll scope

Full capability summary and a string-by-string table with suggested wording: [appendix/payroll-scope-and-language.md](appendix/payroll-scope-and-language.md). This is not legal advice. Payroll copy is locked in `DESIGN.MD`, so every wording change below needs Jose's approval, and counsel should read the lines about taxes.

### What the code does

| Question | Answer | Evidence |
|---|---|---|
| Calculates gross pay from approved time, with overtime | Yes | [C] `src/lib/payroll/native/calculate.ts:23-151` |
| Calculates tax withholding and employer contributions | Yes. Puerto Rico 2026 only, under a provisional policy with no accountant validation | [C] `src/lib/payroll/native/rules/pr-2026.ts:46-62,119-132` |
| Calculates net pay and year to date | Yes. Year to date advances at approval, with no knowledge of payment | [C] `src/lib/payroll/service.ts:515-519` |
| Produces pay statements and a company summary as PDFs | Yes, in English or Spanish | [C] `src/lib/payroll/native/paystub-document.ts` |
| Shares statements with employees | Yes, at once on approval for every new payroll | [C] `src/lib/payroll/worker.ts:121-122` |
| Moves money, stores bank accounts, prints checks | No | No such code or tables |
| Has a "paid" state | No. States are waiting, blocked, review required, approved | [C] `src/lib/payroll/contracts.ts:158` |
| Files or remits taxes; W-2, 499R-2, 941 | No | No such code or tables |
| Exports calculated amounts as data | No. Time exports carry hours only | [C] `src/lib/payroll-export/model.ts:11` |

So the product stays inside "no money moves, nothing is filed". It goes past "calculate pay from approved time" by computing taxes and net pay. That is Jose's first payroll decision.

**Good wording that exists and should be reused:** "Adds up approved hours. Nothing is approved until you say so, and no money moves." (Prepare, [B]); "Approving doesn't send any payment." (Settings); "A file only. NEVORA doesn't send money."; and on one older Employee view, "Next scheduled payday. From your workplace's pay schedule."

Blockers in this area: PY-1, PY-2, PY-6, PY-3, PY-4, PY-7, AR-4. See README.

### Near-term improvements

| ID | Finding and evidence | Affects | Impact, severity | Recommended improvement | Effort, depends on | Owner | Existing work |
|---|---|---|---|---|---|---|---|
| PY-14, BR-18 | P [B]. The feature is called "Payroll" and its home says nothing about scope. Home shows a "PAYDAY Friday, Nov 20" card with "Prepare payroll". Payroll says "2 pay periods have no payroll. Its payday was Fri, Nov 6." [owner-home-1440.png](evidence/owner-home-1440.png), [owner-payroll-1440.png](evidence/owner-payroll-1440.png) | Owner, from the first click | Reads as a full payroll service. "Its payday was" equates a NEVORA calculation with paying people. Medium to High. | A standing line under the title: "Calculate pay and share statements. You pay your team outside NEVORA." Reword to "Scheduled payday was Fri, Nov 6". | S | Jose, Claude | No |
| PY-5 | F [C]. No export of calculated amounts. The Owner retypes net pay and withholding from a PDF. | Owner, accountant | Transcription errors on the numbers that matter most. High. | A CSV per payroll: gross, each tax, deductions, net, employer contributions. Label it "For your accountant or payroll provider." | M | Codex, Claude | No |
| PY-8 | P [C]. "This year" on statements counts every approved payroll as paid. | Employee, accountant at year end | Year to date can differ from real payments. High. | Label it "Year to date (approved payroll)"; tell the Owner to correct in NEVORA when real pay differs. | S for the label | Jose, Codex, Claude, CPA | No |
| PY-9 | D [C]. The one calculation caveat sits two collapsed levels deep on the People page. | Owner at Approve | The Owner approves tax figures believing NEVORA validated them. Medium. | One visible line above Approve: "NEVORA calculated these amounts from your setup. Check withholding with your accountant." | S; depends on PY-1 | Claude, Jose, counsel | No |
| PY-10 | D [C]. Fix cards say "Ask the Owner to confirm the payroll rounding rules", and no screen lets the Owner do it. Unmapped problems show raw codes such as `BELOW_APPLICABLE_MINIMUM_WAGE`. | Owner, Manager | A blocked payroll with an instruction nobody can follow. Medium to High. | Decide how rules get confirmed; word the card to match; map every code to a sentence. | M | Jose, Codex, Claude | Copy audit covers wording only |
| PY-11 | P [C][B]. A correction shows neither what changed nor who settles the difference. Employees see "Corrected" and "Replaced" chips. [employee-pay-390.png](evidence/employee-pay-390.png) | Owner, Employee | An under- or overpayment found by a correction never gets settled. Medium. | Owner: "Net pay changed by $X for N people. Settle the difference outside NEVORA." Employee: "If this differs from what you received, ask your manager." | M + S | Codex, Claude | Partly (R13) |
| PY-12 | D [C]. Terms and Privacy carry no payroll scope clause. Privacy says NEVORA preserves "payment history", which it does not hold. `src/lib/legal/policies.ts:64,86` | Everyone | No written basis for "we calculate, you pay and file". Medium. | A counsel-drafted clause; fix "payment history". | S, plus counsel | Jose, counsel, Claude | Partly |
| PY-13 | P [C]. Payroll setup states legal rules and asks for attestations with statute citations (Law 17 §5, the statutory workweek, five-day notice). | Owner | Reads as legal guidance from NEVORA. Medium. | Counsel reviews each statement; plain labels, citations under Details, "Check this with your accountant or attorney." | M, plus counsel | Jose, counsel, Claude | Partly |
| PY-15 | D [C][B]. One thing, several words: "pay", "pay statement", "statement", `?paycheck=` in the address; "share" and "publish"; "Pay history" means payroll runs for the Owner and statements for the Employee; Spanish uses "Comprobante de nómina" and "Comprobante de pago". | Owner, Employee | Unclear if "pay" means money or a document. Medium. | One word each: pay statement, share, payroll history, scheduled payday, one Spanish term. | S in the app; S to M for PDFs | Claude, Codex, Jose | Partly (Nov 10 glossary) |
| PY-16 | F [C][B]. Payroll and Pay screens are English only, while statements can be Spanish. | Spanish-reading employees | "Your employer pays you" would reach them in English. Medium. | Spanish for Employee Pay first. | M | Claude, Jose | No |
| PY-21 | P [B]. Sign-in promises "Shifts, hours, time off and pay, ready the moment you sign in." [signin-en-1440.png](evidence/signin-en-1440.png) | Everyone | Sets the "NEVORA handles my pay" frame before sign-in. Low. | "…and pay statements". | S | Claude, Jose | No |
| PY-17, PY-18, PY-19 | D [C]. "Prepare payment instructions" shows on corrections where the server always refuses; import settings name banks and NACHA though the file is plain JSON; "Collected" labels calculated withholding. | Owner (older import mode) | Confusing on a money-adjacent action. Low. | Hide the row; relabel "for your records"; "Calculated". | S | Claude | Partly |

### Future

| Item | Why later |
|---|---|
| A manual "share statements" step for new payrolls, as import mode has (PY-4) | Jose's call after the wording fix. |
| 2027 rule set and each later year (PY-6) | Tied to the PY-1 decision. |
| Year-end summaries for the accountant | After the export exists. Stay clear of tax forms. |
