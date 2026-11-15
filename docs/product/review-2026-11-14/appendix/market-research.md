# NEVORA Workforce: market research for product inspection (2026-11-14)

All web sources accessed 2026-11-14 unless marked "Oct brief" (read 2026-10-17 in `docs/product/competitive-2026-10.md`). I wrote no files.

**Evidence tags used below**
- **[P]** vendor or government page I fetched and read today.
- **[P-s]** vendor page whose content I saw only through a search-result summary because the direct fetch was blocked (Gusto 403, Homebase help center 401, Capterra 403). Treat as likely but not read first-hand.
- **[S]** secondary (review site, law firm, press, aggregator).
- Vendor statistics are vendor claims, not verified outcomes.

**What I extended rather than repeated:** the October brief already covers the feature matrix, app ratings, 2026 launches, technology shifts, app-store review themes, the Ley 379 rule table and the app-store route. This report adds step-by-step workflows for Homebase, Gusto and ADP, trial and billing behaviour, Puerto Rico pay-statement and Christmas-bonus rules, boundary wording for "payroll prep" products, and a pricing check of $39/$79.

**Limit on my judgement of NEVORA:** every "does NEVORA serve it" call is from the feature list in the brief plus the October docs. I did not inspect the code.

---

## 1. What small hourly businesses need, and their top complaints

### Needs (with evidence)

| Need | Evidence |
|---|---|
| Accurate pay without rework | 40% of small-business owners call payroll accuracy a constant major concern; 45% of owners and payroll handlers say a payroll mistake cost them time, 30% money (OnTheClock/Centiment, 525 respondents, vendor survey, seen via search summary only) https://krdo.com/?p=1767400 [S] |
| Fewer manual steps between hours and pay | 40% of organisations name manual processes as a main source of payroll errors; 69% use two or more systems for payroll inputs; nearly half of HR teams spend 5+ hours per cycle fixing errors (Paylocity State of Payroll, 776 HR/finance leaders, not SMB-only) https://stacker.com/stories/small-business/payroll-accuracy-now-retention-strategy [S] |
| Error cost matters at this size | 46% of respondents estimate manual payroll and scheduling errors cost $500+ a month; 11% say $2,000+ (Homebase survey, 750 decision-makers at 5–499-employee hourly businesses, published 2026-09-22; vendor survey) https://www.joinhomebase.com/blog/small-business-ai-gap-report [P] |
| Time theft controls that do not feel like surveillance | 25% of hourly workers buddy punched in the past 12 months; 43% have adjusted reported hours; 45% have clocked in while not working (early clock-in, no clock-out for lunch, forgot to clock out); 66% say more monitoring such as GPS would not change behaviour (Centiment for OnTheClock, 831 hourly workers, fielded 2026-07-01 to 07-09) https://www.wftv.com/news/time-theft-report/SF4F7UB7PY677GFBEXZISEXSSA/ [S] |
| Low admin time | 34% of businesses spend 1–5 hours a week on HR admin and 24% spend 6–10; payroll is 17% of that time (Paychex, 750 firms of 5–1,000 employees, Sept 2025; not SMB-only) https://www.paychex.com/articles/human-resources/business-leader-priorities-2026 [P] |
| AI only with control | Among non-adopters, top barriers are data privacy (38%), fear of mistakes (31%), distrust (27%); 31% would be moved by a person staying in control (same Homebase survey) [P] |

I found no current survey that measures hours per week spent on scheduling alone, and none specific to Puerto Rico.

### Complaints about existing tools

| Complaint | Evidence |
|---|---|
| Price creep and steep jumps between tiers | Capterra's Homebase summary tags limited payroll and pricing flexibility; reviewers call the jump to paid features too steep https://www.capterra.com/p/153076/Homebase/reviews/ [P-s]. Homebase free tier is capped at 1 location and 10 employees https://www.joinhomebase.com/pricing [P]; a 2026-10-02 app review says it was cut from 20 (Oct brief). G2 lists "high fees" in 213 RUN reviews https://g2.com/products/run-powered-by-adp/reviews [P-s] |
| Per-location cost compounds; per-user cost is unpredictable | Third-party comparisons, some vendor-affiliated https://checkthat.ai/brands/7shifts/alternatives [S]. Connecteam user charged $102 against an expected $23 (Oct brief, app review 2026-08-22) |
| Add-on sprawl | Homebase add-ons: Tip Manager $25, Task Manager $13 per location, Hiring Assistant from $99 https://www.joinhomebase.com/pricing [P]. Deputy add-ons: HR, Messaging+, Analytics+, Payroll https://www.deputy.com/pricing [P] |
| Opaque pricing | ADP RUN shows no prices, only "Get Pricing" https://www.adp.com/what-we-offer/products/run-powered-by-adp.aspx [P] |
| Support hard to reach | G2: 452 RUN reviews cite poor support or trouble reaching a person [P-s]; about 600 Gusto reviews cite slow support https://g2.com/products/gusto/reviews [P-s]; Homebase complaints about a chatbot gatekeeper and no phone line https://checkthat.ai/brands/homebase/reviews [S] |
| Glitches | Capterra Homebase summary: frequent glitches and malfunctions [P-s] |
| Manager work is weak on phones | Capterra Gusto reviewer says the mobile app requires a computer for real management https://capterra.com/p/131882/Gusto/reviews/ [P-s]; also Oct brief theme 10 |
| Clock-in failures, forced logouts, redesign backlash, location tracking off shift | Oct brief section 6 (dated app-store reviews); not repeated here |
| Spanish | Still no review text asking for Spanish in the US-centred feeds. Indirect evidence only: 95.1% of Puerto Rico residents aged 5+ speak a language other than English at home (Census QuickFacts, 2019–2023 ACS) https://www.census.gov/quickfacts/fact/table/PR/HCN010222 [P-s] |

Reddit remains unreachable by my tools; the Reddit sentiment above is second-hand through comparison sites.

---

## 2. Homebase, Gusto and ADP today, workflow by workflow

### (a) Signup, first-run setup, time to first schedule or payroll

- **Homebase.** Free account, no card. The scheduling page gives three steps: sign up and add the team; photograph or upload the existing schedule, which the Scheduling Assistant converts; review the AI draft and publish in one click https://www.joinhomebase.com/employee-scheduling [P]. Team can be typed in or uploaded as CSV/Excel from a template https://support.joinhomebase.com/hc/en-us/articles/360012671551-Add-employees-to-Homebase [P-s]. No time-to-first-schedule figure is published; "85% rated extremely easy" and "20 hours saved per month" are vendor claims [P].
- **Gusto.** Create a free account, then enter FEIN and entity type, link a bank (instant through Plaid, or 2–3 business days with test deposits), and add a pay schedule https://support.gusto.com/article/106622100100000/Set-up-your-Gusto-account-for-employers [P-s]. Gusto cannot finalise the account until all team members complete setup [P-s]. A CPA firm's guide estimates 15–30 minutes of entry plus 1–2 business days of verification https://www.sdocpa.com/gusto-onboarding-guide/ [S]; Gusto states no official figure. For scheduling, new users can have Gus create shifts from an image of an existing schedule https://support.gusto.com/article/240826140742287/Review-and-manage-your-team-s-schedules-for-managers [P-s].
- **ADP RUN.** Sales-led: quote, then an assigned implementation specialist. Steps are account setup, employee and payroll data (with migration), tax settings and pay schedules, first payroll; mid-year starts need year-to-date history https://www.adp.com/knowledge/products/run/implementation [P-s]. No duration published. Roll by ADP is the self-serve alternative: chat-driven, "No training required" https://www.rollbyadp.com/pricing [P].

### (b) Inviting employees and activation

- **Homebase.** Tick "Invite to App" when adding a person, or press Invite/Resend from the roster; the employee gets a link by email and text; the roster shows "Signed In" once they join. Employees sign in with a phone number or email and own their account [P-s, same article]. A random 6-digit PIN is assigned automatically; PINs are unique per location and employees cannot change their own; they can see it in the app https://support.joinhomebase.com/hc/en-us/articles/360040529031-PINs-in-Homebase [P-s].
- **Gusto.** Recommends inviting employees to enter their own details; the employee follows a welcome email and an onboarding checklist https://support.gusto.com/article/100201315100000/Set-up-your-Gusto-account-for-employees [P-s]. Kiosk PIN: employee sets a 4-digit PIN at the kiosk or in their account; reset by email https://support.gusto.com/article/192354597100000/Track-your-contractor-hours-worked-in-Gusto [P-s].
- **ADP RUN.** Employee goes to the RUN login page, presses Register Now, completes two forms and accepts terms (ADP visual guide, dated 2015, so possibly outdated) https://support.adp.com/adp_payroll/content/hybrid/TLM/Registering_an_Employee_in_Run_Powered_by_ADP.pdf [P]. Other ADP services use registration codes that typically expire in 15 days [P-s].

### (c) Schedule building, templates, auto-scheduling, availability, time off, swaps, open shifts

| | Homebase | Gusto | ADP (RUN add-on) |
|---|---|---|---|
| Builder | Drag-and-drop on all plans, including free | Create and publish up to 6 months ahead; save draft or publish | Online scheduling in "Timekeeping Plus Scheduling" |
| Templates / copy | Templates and copy previous week | Duplicate a day or week | Not stated |
| Auto-schedule | AI draft from availability, roles, past patterns; Plus and up; owner approves before publishing | Image-to-shifts through Gus only | Not stated for small business |
| Availability | Employees set from phones; approvals | Per day: all day, time ranges, or unavailable; future dates only | Employees submit unavailability |
| Time off | Requests on free plan; PTO controls on Plus | In Gusto time-off policies | Requests and PTO balances |
| Swaps / open shifts | Swaps and trades on free plan; open shifts; auto-suggested fill | Help docs say employees cannot schedule their own shifts; marketing mentions swaps with no mechanics | Employees swap shifts and request coverage; manager approves on mobile |
| Publish notice | Text, email and app | Email and in-app | ADP Mobile |
| Conflict / overtime warnings | Conflict detection on free plan; overtime alerts | Not confirmed | Configurable work rules such as maximum daily hours |

Sources: Homebase https://www.joinhomebase.com/employee-scheduling [P]; Gusto https://support.gusto.com/article/240820142138347/Set-up-and-manage-Gusto-Time-Scheduling and the managers article above [P-s]; ADP https://www.adp.com/what-we-offer/time-and-attendance.aspx [P] and https://apps.adp.com/en-US/apps/333402/ADP%C2%AE-Timekeeping-Plus-Scheduling-for-RUN-Powered-by-ADP%C2%AE/features [P].

### (d) Time clock options

- **Homebase** https://www.joinhomebase.com/time-clock [P]: any phone, tablet, computer or POS; shared-device clock with a PIN per person; photo at clock-in on shared devices only, Essentials and up; geofenced mobile clock-in on Essentials; break tracking with paid, unpaid, missed or waived status and missed-break pay; early clock-in prevention and auto clock-out on Plus and up; missed-punch and late alerts; says the clock works offline.
- **Gusto.** Browser kiosk at kiosk.gusto.com; employee finds their name, enters a PIN, taps Clock in; owner must bookmark the page manually https://support.gusto.com/article/230223131618657/Time-Kiosk-for-time-tracking [P-s]. Location: admins add authorised workplaces with a range https://support.gusto.com/article/211012201329597/location-sharing-for-time-tracking [P-s]; a competitor page disputes that this is geofencing, so treat as unsettled. No photo capture documented. Time tracking needs Plus, Premium, or the Time & Attendance Plus add-on on Simple https://support.gusto.com/article/112700542100000/Set-up-and-manage-Gusto-Time-Tracking [P-s].
- **ADP.** Time Kiosk app on a tablet with face or fingerprint login and voice commands; clock in/out, meal breaks, job transfers; ADP Mobile clock-in with geofencing that "keeps clock-ins within a set distance" https://www.adp.com/what-we-offer/time-and-attendance.aspx [P].

### (e) Timesheet review, edits, approval, alerts

- **Homebase** https://www.joinhomebase.com/timesheets [P]: managers "review, approve, and lock timesheets"; employees verify hours and fix errors in the app; a running list of missed shifts, clock-outs and breaks; alerts near overtime; edit history report on Essentials; time cards stored four years on Essentials, 90-day view on free.
- **Gusto.** An article titled "Review, edit and approve Gusto time tracking hours" exists; I could not read it. Overtime policies must be assigned before tracking starts [P-s]. Break and overtime compliance alerts are claimed on a Gusto resources page only [P-s]. Gusto's April 2026 payroll-prep anomaly flags are in the Oct brief.
- **ADP.** Managers approve timecards before hours flow to payroll; exception alerts flag missed punches and edits; dashboard shows location violations, overtime cost and unplanned hours [P].

### (f) Payroll run or export, pay stubs, employee pay view

- **Homebase.** Full-service payroll add-on built on the time clock: tax calculation, filing and payment, W-2s and 1099s; employee app for pay stubs and tax forms https://www.joinhomebase.com/payroll [P]. Without the add-on, timesheets export to another provider such as QuickBooks or Gusto, with ADP also named as an integration https://www.joinhomebase.com/timesheets [P].
- **Gusto.** Full-service payroll; hours sync from its own time tools. Employees view pay in their account and app (Oct brief).
- **ADP RUN.** Full-service payroll with tax filing; employees get mobile access to pay statements, tax forms and direct-deposit details https://www.adp.com/mobilesolutions [P].

### (g) Trial, pricing, limits, trial end, failed payment

| | Price model | Current prices | Trial and trial end | Failed payment |
|---|---|---|---|---|
| Homebase | Per location; payroll per employee | Basic $0 (1 location, 10 employees); Essentials $30; Plus $70; All-in-One $120; page shows an annual toggle with "Save 20%" but one price per plan, so I could not tell which billing basis is displayed. Payroll $49 + $6 per paid employee, or $29 for teams up to 5; promo 6 months free Payroll and Plus [P] | 14 days of All-in-One, no card. With a card on file it bills at trial end; with no card and no plan the account drops to free Basic with a notice https://support.joinhomebase.com/hc/en-us/articles/4425314739085-Billing-FAQS [P-s] | Not found |
| Gusto | Base + per person | Simple $49 + $6; Plus $80 + $12; Premium $180 + $22; time tracking on Plus and up, or $6 per person add-on on Simple. Confirmed only through Homebase's comparison page and aggregators https://www.joinhomebase.com/compare/homebase-vs-gusto [S], https://www.usagepricing.com/blueprint/gusto [S]. Simple base reportedly rose from $40 on 2026-03-01 https://rivermate.com/blog/gusto-pricing [S] | Free account creation; trial terms not confirmed | Payroll is blocked until an outstanding balance is paid; no pause option https://support.gusto.com/article/106621966100000/Fix-payroll-blockers-in-Gusto-for-admins [P-s]. Suspension for unpaid fees is in a third-party summary of the terms only [S] |
| ADP RUN | Quote | Not published. Third-party estimates around $79 + $4 per employee for Essential; unverified https://tech.co/hr-software/adp-pricing-guide [S]. Time and scheduling are add-ons [P] | "Up to 6 months FREE payroll" promo, terms not read [P] | Not found |
| Roll by ADP | Base + per person | $59 a month + $7 per employee on its pricing page today; a secondary source says $39 + $5, so the figure is in conflict https://www.rollbyadp.com/pricing [P] | 3 months free | Not found |

### (h) Spanish

- **Homebase.** Web and mobile in English, Spanish or French (My Settings › Language Preference; mobile follows the phone); time clock language follows the tablet, and each employee can pick their own after entering a PIN http://support.joinhomebase.com/hc/en-us/articles/235242647-How-to-change-your-Homebase-language-preference [P-s]. I did not test translation depth or Puerto Rico wording.
- **Gusto.** No language setting found in help content; the only Spanish items are live 401(k) support and a translated 401(k) guide https://support.gusto.com/article/178103449533825/foreign-language-support-requirements-retirement-plan [P-s]. Gusto Mobile lists English only on the App Store (Oct brief).
- **ADP.** ADP Mobile is available in "English, Spanish, French and more than 25 additional languages", depending on employer configuration https://www.adp.com/mobilesolutions [P]. Roll has been in Spanish since 2021-12-16 https://mediacenter.adp.com/2021-12-16-Roll-TM-by-ADP-R-is-Now-Available-in-Spanish-with-Added-Features,-Expanding-Small-Businesses-Power-to-Manage-Payroll [P]. RUN's own admin language was not confirmed on a primary page.

### (i) Puerto Rico

- **Homebase.** Payroll is "currently available to US-based customers in all 50 states and Washington D.C." https://www.joinhomebase.com/payroll [P]. Puerto Rico is not listed. Whether scheduling and time tracking alone can be used in Puerto Rico (time zone, daily overtime) is not documented.
- **Gusto.** The Oct brief cites a help article saying Gusto does not run payroll for US territories. I could not re-read it today (403) and a search did not reproduce the wording. Treat as "previously confirmed, not re-confirmed".
- **ADP.** ADP's worldwide-locations page lists Puerto Rico with a "Local Services" link that points to ADP Global Payroll, not RUN https://www.adp.com/worldwide-locations.aspx [P]. ADP launched Workforce Now Time & Attendance in Puerto Rico in 2011 https://prnewswire.com/news-releases/companies-in-puerto-rico-show-strong-demand-for-adps-integrated-cloud-based-workforce-now-time--attendance-solution-135918013.html [S]. I found no primary statement that RUN or Roll serves Puerto Rico employers; Roll says "all 50 states" [P].
- **Others.** 7shifts Payroll excludes employees or companies in Puerto Rico https://kb.7shifts.com/hc/en-us/articles/27121799960851 [P-s]. QuickBooks Payroll supports only the 50 states and DC, per an Intuit community answer https://quickbooks.intuit.com/learn-support/en-us/employees-and-payroll/hello-does-quickbooks-payroll-work-in-puerto-rico/00/564666 [S].

**Read-out:** the small-business self-serve payroll products do not run Puerto Rico payroll, so a Puerto Rico employer using any of them for scheduling and time still needs a local provider or accountant for filing. That is the same position NEVORA is in, which makes NEVORA's export quality and statement accuracy the comparison point, not money movement.

---

## 3. Other tools buyers compare, and the expectation each sets

| Tool | Expectation it sets | Meet or skip |
|---|---|---|
| **When I Work** ($2.50 / $5 / $8 per user; 14-day trial, no card; time tracking is a toggle with unclear pricing; no native payroll, Rippling is the preferred partner) https://wheniwork.com/pricing [P] | Auto-scheduling, templates, open shifts and swaps in the cheapest tier; a "close and export pay period" step | Meet: all scheduling basics in the entry tier. Meet: an explicit close-then-export step (NEVORA has period close) |
| **7shifts** (free to 15 employees at one location; about $39.99 / $79.99 / $134.99 per location annually with caps of 30 and 60 employees on the lower tiers; secondary sources that disagree) https://costbench.com/software/employee-scheduling/7shifts/ [S] | Restaurant-specific extras: tip pooling, POS sales forecasting, manager log book | Skip for now: each needs integrations or tip-law work. Note that the $39/$79 idea lands on 7shifts' price points |
| **Connecteam** (free for life to 10 users; $29–35 / $49–59 / $99–119 a month for the first 30 users, then $0.80–$5 per extra user; 14-day trial, no card) https://connecteam.com/pricing/ [P] | Flat price that covers a whole small team; "which timesheets were already exported" status | Meet: flat predictable price; meet: an exported/not-exported marker per period |
| **Sling** (free to 30 users without time clock; $2 and $4 per user monthly; kiosk only on the $4 tier; 15-day trial) https://getsling.com/pricing/ [P] | Free scheduling as a baseline | Decide: NEVORA's low-cost story needs an answer to "why not free" (Spanish, Puerto Rico rules, pay calculation) |
| **Deputy** ($5 / $6.50 / $9 per user; $30 monthly minimum; payroll add-on $8 per user + $49 base, US, annual plans) https://www.deputy.com/pricing [P] | AI included in base price; break-policy rules | Meet on break rules for Puerto Rico; skip add-on sprawl |
| **Square Shifts** (bundled into Square Plus and Premium; Plus is about $49 per location per secondary sources) https://squareup.com/us/en/staff/shifts/pricing [P] | Scheduling bundled with the POS the business already pays for | Skip: NEVORA cannot match a POS bundle; compete on Puerto Rico fit |

---

## 4. Puerto Rico specifics that affect usefulness

Not legal advice. Every item needs Puerto Rico labour counsel before NEVORA ships copy, rules or calculations that depend on it.

- **Overtime and meal periods (Ley 379 as amended by Ley 4-2017).** Already tabulated against the DTRH compilation in the Oct brief section 7.1. SHRM's overview matches: overtime over 8 hours in a calendar day and over 40 in the week at time and a half; meal period starting between the end of the 2nd and the start of the 6th hour; waivable when the day is 6 hours or less; reducible to 30 minutes by written agreement; worked meal periods paid at time and a half; second meal after 10 hours unless the day is 12 or less https://www.shrm.org/topics-tools/employment-law-compliance/overview-puerto-rico-employment-law [P]. Ley 41-2022 was voided in March 2023, so the 2017 text applies [P]. Counsel must confirm, including treatment of employees hired before 2017-01-26.
- **Christmas bonus (Ley 148-1969).** Eligibility is measured on hours worked from October 1 to September 30: 1,350 hours for employees hired on or after 2017-01-26, 700 for earlier hires. For post-2017 hires the bonus is 2% of wages, capped at $600, or $300 at small employers; first-year bonus is half. Payment window is November 15 to December 15. Late payment carries a 50% penalty within six months and 100% after. Exemption for insufficient profits needs CPA-certified statements; the 2025 filing deadline was December 1 (Jackson Lewis, 2025-11-14) https://natlawreview.com/article/avoiding-naughty-list-christmas-bonus-compliance-puerto-rico-employers [S]. Sources disagree on the small-employer threshold (20 employees in SHRM; 15 for pre-2017 hires in Jackson Lewis). I found no 2026 DTRH notice. Counsel must confirm thresholds and the 2026 deadline.
- **Pay statement content.** ADP's pay-statement chart (last updated 2026-10-06) cites 29 L.P.R.A. § 171 and PR Regulation 9017, Art. XV. It says every covered employer must give each employee, at each payment, a notice with: employer name and address; worker name; occupation; date and period of work; total regular and extra hours; wages for regular and extra hours; additions and deductions with their concept; net pay. Exempt employees are excepted from the hours records. Employers paying by electronic transfer must deliver a voucher of the deposit https://www.adp.com/-/media/adp/resourcehub/pdf/pay_statement_requirements_chart.pdf [S, vendor compliance chart; I extracted the text from the PDF]. Other vendor guides claim no payslip requirement exists, so there is a conflict. I did not read Regulation 9017 itself. Counsel must confirm, and must confirm whether an electronic statement satisfies it.
- **Deductions.** Beyond taxes and statutory contributions, deductions generally need the employee's written authorisation for listed purposes; a newer act allows agreed debt repayment capped at 20% of net pay (Littler) https://www.littler.com/news-analysis/asap/puerto-rico-new-act-extends-list-authorized-deductions-non-exempt-employees [P-s]. Counsel review needed before NEVORA offers free-form deduction lines.
- **Vacation and sick accrual (Ley 180-1998).** DTRH's text requires at least 130 hours worked in a month to accrue https://trabajo.pr.gov/docs/Normas_del_Trabajo/Leyes/Ley_Num_180_27_julio_1998_Ley%20de%20Salario%20Minimo.pdf [P-s]. Rates by tenure and the small-employer rule were not confirmed today. Counsel needed.
- **Minimum wage.** $10.50 an hour since 2024-07-01, reported unchanged for 2026; tipped and agricultural rates are under review and sources conflict https://www.morganlewis.com/pubs/2024/06/puerto-rico-increases-minimum-wage-and-extends-deadline-to-file-payroll-statement [P-s], https://www.paulhastings.com/thought-leadership/puerto-rico [P-s]. Verify with DTRH.
- **Spanish.** Contracts may be in any language the employee knows, and a signature creates a presumption of understanding (SHRM) [P]. A poster vendor says labour notices must be posted in Spanish https://www.postercompliance.com/labor-law-posters/puerto-rico/ [S, unverified]. Ley 379 Art. 11 requires written notice of hours and meal period (Oct brief). Practical reading: schedules, pay statements and policy acknowledgements should be readable in Spanish. Counsel to confirm any strict requirement.
- **Record retention.** Sources range from three to six years and none is primary. Not verified.

---

## 5. How comparable products describe the "we prepare, someone else pays" boundary

| Product | Wording pattern | Source |
|---|---|---|
| Homebase (without payroll add-on) | Timesheets can be exported "to another payroll provider like Quickbooks or Gusto"; managers "review, approve, and lock timesheets before you run payroll" | https://www.joinhomebase.com/timesheets [P] |
| When I Work | "Payroll and POS integrations" on the plan card; help article: "close and export pay period hours", then "Send to Gusto". It lists what is not sent: its overtime figures, holiday hours, pay rates and estimated wages; the payroll provider applies its own overtime rules | https://wheniwork.com/pricing [P]; https://help.wheniwork.com/articles/gusto-integration [P] |
| Deputy | Add-on "sends your approved timesheets, pay rates, and leave directly into Paycor"; payroll is "enabled by Paycor" | https://www.deputy.com/pricing [P] |
| Connecteam | "Payroll integration", "Exportable Timesheet", and a marker showing "which timesheets were already exported to payroll" | https://connecteam.com/pricing/ [P] |
| Sling | "pull reports for payroll"; "sync reports for payroll processing" | https://getsling.com/pricing/ [P] |
| Square Shifts | "payroll prep"; works with Square Payroll or a third-party provider through export | https://squareup.com/us/en/staff/shifts/pricing [P] |

**Patterns worth copying**
1. The product names the payroll step as someone else's: "export to your payroll provider", "enabled by [provider]".
2. Verbs stay on the time side: review, approve, lock, close, export, send.
3. The clearest example (When I Work) lists what is and is not included in the export.
4. None of these pages calls its own output "payroll" or a "pay stub" unless a licensed payroll product sits behind it.

**NEVORA goes further than these products** because it calculates pay and prints statements. None of the six does that without a payroll engine behind it, so I found no direct wording precedent for "calculated statement, not a payment". That makes NEVORA's wording a counsel item. Draft direction for counsel and Jose to react to (TEAM-RULES says approved payroll copy stays as is, so this is input, not a change):
- Say what NEVORA does in one line wherever pay appears: it calculates pay from approved hours and prepares statements and an export file.
- Say what it does not do in the next line: it does not pay employees, withhold or file taxes, or send anything to Hacienda or the IRS; the employer or their payroll provider does.
- Label the PDF by what it is (a calculated statement for a period, with its revision and date) and avoid any implication that money has been deposited.
- Show an exported/not-exported state per period, as Connecteam does.

---

## 6. Synthesis for NEVORA

### 6.1 Need → NEVORA → competitors → recommendation

"NEVORA" column is judged from the feature list and October docs only.

| # | Customer need | NEVORA | Homebase / Gusto / ADP | Recommendation |
|---|---|---|---|---|
| 1 | First schedule out the same day | Partly (signup exists; roster import backend merged per git log, screen not built) | Homebase: 3 steps, photo/upload of old schedule, CSV team upload. Gusto: image to shifts. ADP: specialist-led | Finish roster import with paste/CSV; guided "first week" path ending in Publish |
| 2 | Employees join without training | Unknown/partly (Employee ID + PIN; invite-token activation was open in October) | Homebase: link by text and email, auto PIN, "Signed In" status. Gusto: self-onboarding email. ADP: Register Now form | Invite link with self-activation and a visible joined/not-joined status per person |
| 3 | Build, reuse, auto-draft, publish | Yes | Homebase: free builder, templates, AI draft on Plus. Gusto: basic. ADP: add-on | Keep auto-draft in the base tier; Homebase gates it at $70 |
| 4 | Availability, time off, swaps, open shifts, call-outs | Yes | Homebase: yes, swaps on free. Gusto: availability yes, swaps undocumented. ADP: yes in add-on | No gap. Call-out handling is a point Gusto lacks |
| 5 | Stop buddy punching on a shared tablet | Yes (PIN, optional photo) | Homebase: PIN, photo on paid tier. Gusto: PIN only. ADP: face/fingerprint | Keep photo optional and in the base tier; do not add biometrics |
| 6 | Stop early clock-ins and forgotten clock-outs | Unknown | Homebase: early clock-in prevention and auto clock-out on Plus. ADP: exception alerts | Add both as simple rules; 45% of hourly workers report these behaviours |
| 7 | Phone clock-in with location | No (kiosk by design) | All three offer it | Skip for fixed-site businesses; revisit only for field services |
| 8 | Breaks and meal compliance | Partly (breaks; Puerto Rico meal rules pending counsel) | Homebase: missed/waived breaks and missed-break pay. Deputy: break policy beta | Puerto Rico meal-period flags on schedule and timecard after counsel |
| 9 | Overtime warnings before they cost money | Partly/unknown (daily >8 for Puerto Rico not confirmed) | Homebase and ADP: alerts near overtime | Daily and weekly overtime warning at schedule time and on timecards |
| 10 | Clean timesheets before pay | Yes/partly (corrections, approval, period close; readiness check approved as direction) | Homebase: missed-punch list, employee fixes, lock. Gusto: anomaly flags. ADP: exceptions | Ship the payroll-readiness check inside period close |
| 11 | Pay calculated and documented | Yes, within stated scope | All three run full payroll, but Homebase is 50 states + DC, Gusto excludes territories (not re-confirmed), ADP RUN in Puerto Rico unconfirmed | Compete on statement accuracy and export fit for Puerto Rico; fix boundary wording |
| 12 | Statement meets Puerto Rico content rules | Unknown | ADP chart lists required items under Reg. 9017 | Check the PDF against the eight items; counsel sign-off |
| 13 | Employee sees own hours and pay | Unknown/partly | Homebase, Gusto, ADP: app access to stubs | Employee view of approved hours and statements, read-only |
| 14 | Spanish for staff and managers | Partly (Clocker, sign-in per October docs) | Homebase EN/ES/FR; ADP Mobile ES; Gusto not found | Employees first, then managers; this is the largest gap against Homebase |
| 15 | Predictable low price | Business decision | Homebase per location + add-ons; Gusto per person; ADP quote | One flat price per location with everything in the brief included |
| 16 | Works when Wi-Fi drops | Unknown (offline punches approved as direction) | Homebase says its clock works offline | Kiosk offline queue with honest states |
| 17 | Team messaging and notices | Yes | Homebase on Essentials; Gusto none | Keep in base tier |
| 18 | Text-message reach for staff without the app | Unknown | Homebase publishes by text, email and app | Business decision: SMS costs money per message; consider for invites and schedule publish only |
| 19 | Christmas bonus hours tracking | No/unknown | None found | Report of hours per employee for Oct 1–Sep 30 against the threshold; counsel |
| 20 | Store app | No (PWA) | All native | Already decided as a Capacitor spike; no new evidence |
| 21 | AI help that stays in the owner's control | Yes (Owner AI advisor) | Deputy and Gusto include AI at no charge | Keep it advisory; never let it act on pay (matches survey barrier data) |
| 22 | POS, tips, hiring, HR advice | No | Homebase add-ons; 7shifts built in | Skip for now (see 6.3) |
| 23 | Clear trial end and billing failure | Unknown | Homebase drops to free with a notice; Gusto blocks payroll until paid | Define and state the rule; never lose records or block a clock-out |

### 6.2 Essential gaps for this audience

Effort is a rough guess made without reading the code.

| Gap | Why essential | Effort | Type |
|---|---|---|---|
| Spanish across employee surfaces, then manager | First market speaks Spanish; Homebase and ADP Mobile already offer it | L (repo estimate: 8–11 engineering weeks) | UI + content; Jose's timing decision |
| Puerto Rico overtime and meal-period flags | Daily overtime and meal penalties are where a US-built tool gives wrong answers | M–L | Backend rules + UI; counsel gate |
| Pay statement checked against Reg. 9017 items | A statement missing required items undermines the core promise | S | Backend/template; counsel |
| Boundary wording on every pay surface | Prevents customers believing NEVORA pays or files | S | UI copy; counsel and Jose |
| Export that Puerto Rico accountants and providers accept | The export is the hand-off; competitors show exported status | M | Business discovery first, then backend |
| Roster import and a guided first week | Homebase's first-run is three steps | S–M | UI (backend merged) |
| Invite link with self-activation and joined status | Category norm; removes owner data entry | M | Backend + UI |
| Early clock-in prevention, auto clock-out or forgotten-clock-out handling | Most common time-theft behaviours; Homebase charges for it | S–M | Backend rule + UI |
| Payroll-readiness check in period close | Gusto, Rippling, Paylocity shipped it in 2026 | M | Backend read + UI |
| Employee read-only view of hours and statements | Expected from all three benchmarks | S–M | UI, maybe backend |
| Kiosk offline queue | Shared tablets on weak Wi-Fi; Homebase claims offline | M | Backend + UI |
| Trial-end and failed-payment rules | Billing surprises are a top complaint | S–M | Business + backend |
| Christmas bonus hours report | Cheap, Puerto Rico-specific, no competitor found | S | Backend report; counsel |

### 6.3 Features that would add complexity without enough value now

| Feature | Why not now | Effort | Type |
|---|---|---|---|
| Moving money, tax filing | Regulated; outside stated scope; no self-serve vendor does Puerto Rico | L | Business |
| GPS/geofenced phone clock-in | Kiosk covers restaurants, cafés and retail; location tracking draws backlash; 66% say monitoring would not change behaviour | L | Backend + UI + privacy |
| Face or fingerprint clock-in | Biometric privacy risk; Puerto Rico rules unchecked | M–L | Legal + backend |
| Earned wage access | Fee anger, regulation in flux, NEVORA moves no money | L | Business |
| POS integrations and sales forecasting | Ongoing integration upkeep per POS; value mainly for multi-unit restaurants | L | Backend |
| Tip pooling | Real restaurant demand (Homebase $25, 7shifts about $50 per location) but tip law adds counsel work | M–L | Backend + legal; revisit after launch |
| Hiring, background checks, HR advisors, handbook, training | Homebase and ADP sell these as upsells; they are the source of add-on sprawl | L | Business |
| AI schedule import from a photo | Now part of Homebase's and Gusto's first-run, so the expectation is rising; CSV/paste import gets most of the value at far lower cost and risk | M–L | Backend (LLM) |
| AI that acts on schedules or pay | Trust barrier in survey data; direction doc already rejects | L | Backend |
| Per-user pricing and paid add-ons | The complaint NEVORA can position against | n/a | Business |

### 6.4 Recommended improvements, tied to a cited pattern

1. **Three-step first run** ending in a published schedule: add team (paste or CSV), set a typical week or template, review the Build week draft and publish. Pattern: Homebase "how it works".
2. **Invite by link** with a per-person joined status and resend. Pattern: Homebase roster "Signed In".
3. **Assign PINs automatically** and let the owner print or send them, so no one sets up credentials in a training session. Pattern: Homebase auto PIN.
4. **Two clock rules as plain toggles:** block clock-in more than N minutes early; flag or close a punch left open. Pattern: Homebase Plus; need from the Centiment survey.
5. **A running "fix before close" list** (missed punches, missed breaks, overtime) that employees can respond to, then lock. Pattern: Homebase timesheets; Gusto anomaly flags.
6. **Exported state per period** and a one-line export summary of what the file contains and omits. Pattern: Connecteam marker; When I Work's list of what is not sent.
7. **Plain boundary line on pay screens and the PDF.** Pattern: Homebase, Deputy and Square wording in section 5.
8. **Spanish selectable per person and remembered at the kiosk.** Pattern: Homebase per-employee language after PIN.
9. **Puerto Rico presets on by default for Puerto Rico workspaces** (week start, daily overtime, meal window), each shown in plain words with the rule's source, after counsel. No competitor ships these.
10. **Everything in one price.** Keep photo, auto-draft, messaging, clock rules and Spanish out of upsell tiers; Homebase gates each of these.

### 6.5 Pricing and packaging against $39 / $79 per location with a 30-day trial

- **Per-location peers:** Homebase $30 / $70 / $120 [P]; 7shifts about $39.99 / $79.99 / $134.99 annual with 30- and 60-employee caps [S]; Connecteam $29–35 / $49–59 / $99–119 for the first 30 users [P]; Square Plus about $49 [S]. $39/$79 sits almost exactly on 7shifts and slightly above Homebase's two lower tiers.
- **Per-user peers for a 15-person shop:** When I Work $37.50–$75 before time tracking; Deputy $75–$135; Sling $30–$60 [P]. $39 flat is cheaper than all but the lowest per-user tier.
- **Free tiers set the floor:** Homebase to 10 employees, 7shifts to 15, Connecteam to 10 users, Sling to 30 users without a clock. A 5–10 person Puerto Rico café can get scheduling and a clock for $0. NEVORA's paid entry needs to be justified by what those lack: Spanish, Puerto Rico rules, pay calculation and statements.
- **Total cost matters more than list price.** In the 50 states, Homebase Essentials plus payroll for 15 employees is $30 + $49 + $90 = $169 a month and includes filing. A NEVORA customer pays NEVORA plus a local provider or accountant. If NEVORA does not reduce that second bill, "low cost" is hard to claim. Worth testing with real customers.
- **Trial length:** category norm is 14–15 days with no card (Homebase, When I Work, Connecteam, Sling). Thirty days is generous and covers two biweekly pay periods, which suits a product whose value shows at period close. Payroll vendors compete with longer promos (Homebase 6 months, ADP "up to 6 months", Roll 3 months).
- **What the two tiers should differ on:** competitors split by features (Homebase) or headcount (7shifts, Connecteam). For minimal training, a headcount or location split is easier to explain than a feature split. I found no evidence favouring a specific cap.
- **Avoid:** per-user metering, a monthly minimum (Deputy's $30), and paid add-ons for basics.
- **Not verified:** willingness to pay in Puerto Rico. No local pricing evidence found.

### 6.6 What I could not verify

1. **Gusto primary pages.** gusto.com and support.gusto.com returned 403 on every fetch. Gusto pricing, trial terms, kiosk, scheduling and time-tracking details come from search summaries and third parties.
2. **Gusto and Puerto Rico.** The October brief's citation was not re-read; today's search did not reproduce the exclusion wording.
3. **ADP RUN and Roll in Puerto Rico.** No primary statement either way. ADP's Puerto Rico "Local Services" link points to Global Payroll.
4. **ADP RUN pricing, trial terms, failed-payment handling, implementation duration, and RUN admin language.** Not published or not found. The employee registration guide is from 2015.
5. **Homebase help center.** Direct fetch returned 401; invite, PIN, language and billing details are from search summaries. Homebase failed-payment behaviour not found. Which billing basis the $30/$70/$120 prices reflect is unclear.
6. **Homebase scheduling and time tracking used in Puerto Rico** (daily overtime, time zone): not documented.
7. **Roll by ADP price conflict:** $59 + $7 on its page today versus $39 + $5 in a secondary source.
8. **7shifts and Square pricing pages** did not render; figures are secondary and conflicting. 7shifts' Puerto Rico exclusion is from a search snippet (403 on fetch).
9. **Capterra, G2 and Trustpilot** pages blocked; themes are from search summaries. **Reddit** unreachable.
10. **Survey figures** from OnTheClock, Homebase, Paylocity and Paychex are vendor-run; two are not SMB-only. The OnTheClock payroll-accuracy numbers were seen only in a search summary.
11. **Puerto Rico law:** Regulation 9017 text not read (relied on ADP's chart); Christmas-bonus small-employer threshold conflicts across sources; no 2026 DTRH bonus notice found; Ley 180 accrual rates, record-retention period, tipped minimum wage, any strict Spanish-language requirement, and whether electronic statements satisfy the rule are all unconfirmed. Counsel must review all of section 4.
12. **Spanish translation depth and Puerto Rico wording** in Homebase and ADP were not tested.
13. **NEVORA's current state.** I did not read the code; "unknown" cells in 6.1 need a check against the build. Effort sizes are guesses.
14. **Time to first schedule or first payroll:** no vendor publishes a measured figure.
15. **Deputy trial length and Deputy's payroll-integration page** (rendered empty); When I Work time-tracking add-on price.

---

## Sources (accessed 2026-11-14 unless noted)

1. Homebase, Plans and Pricing. https://www.joinhomebase.com/pricing
2. Homebase, Time Clock. https://www.joinhomebase.com/time-clock
3. Homebase, Employee Scheduling. https://www.joinhomebase.com/employee-scheduling
4. Homebase, Payroll. https://www.joinhomebase.com/payroll
5. Homebase, Timesheets. https://www.joinhomebase.com/timesheets
6. Homebase, Homebase vs Gusto (vendor comparison). https://www.joinhomebase.com/compare/homebase-vs-gusto
7. Homebase, 2026 Main Street AI Gap Report (2026-09-22). https://www.joinhomebase.com/blog/small-business-ai-gap-report
8. Homebase Support, Add employees to Homebase (search summary). https://support.joinhomebase.com/hc/en-us/articles/360012671551-Add-employees-to-Homebase
9. Homebase Support, PINs in Homebase (search summary). https://support.joinhomebase.com/hc/en-us/articles/360040529031-PINs-in-Homebase
10. Homebase Support, Billing FAQs (search summary). https://support.joinhomebase.com/hc/en-us/articles/4425314739085-Billing-FAQS
11. Homebase Support, Change your language preference (search summary). http://support.joinhomebase.com/hc/en-us/articles/235242647-How-to-change-your-Homebase-language-preference
12. Homebase Support, Homebase iPad Time Clock (search summary). https://support.joinhomebase.com/hc/en-us/articles/360031009171-Homebase-iPad-Time-Clock
13. Gusto Support, Set up your Gusto account for employers (search summary). https://support.gusto.com/article/106622100100000/Set-up-your-Gusto-account-for-employers
14. Gusto Support, Set up your Gusto account for employees (search summary). https://support.gusto.com/article/100201315100000/Set-up-your-Gusto-account-for-employees
15. Gusto Support, Time Kiosk for time tracking (search summary). https://support.gusto.com/article/230223131618657/Time-Kiosk-for-time-tracking
16. Gusto Support, Track your contractor hours (PIN details; search summary). https://support.gusto.com/article/192354597100000/Track-your-contractor-hours-worked-in-Gusto
17. Gusto Support, Set up and manage Gusto Time Tracking (search summary). https://support.gusto.com/article/112700542100000/Set-up-and-manage-Gusto-Time-Tracking
18. Gusto Support, Location sharing for time tracking (search summary). https://support.gusto.com/article/211012201329597/location-sharing-for-time-tracking
19. Gusto Support, Set up and manage Gusto Time Scheduling (search summary). https://support.gusto.com/article/240820142138347/Set-up-and-manage-Gusto-Time-Scheduling
20. Gusto Support, Review and manage your team's schedules (search summary). https://support.gusto.com/article/240826140742287/Review-and-manage-your-team-s-schedules-for-managers
21. Gusto Support, Fix payroll blockers (search summary). https://support.gusto.com/article/106621966100000/Fix-payroll-blockers-in-Gusto-for-admins
22. Gusto Support, Foreign language support, retirement plan (search summary). https://support.gusto.com/article/178103449533825/foreign-language-support-requirements-retirement-plan
23. usagepricing.com, Gusto pricing blueprint (secondary). https://www.usagepricing.com/blueprint/gusto
24. Rivermate, Gusto pricing (secondary). https://rivermate.com/blog/gusto-pricing
25. SDO CPA, Gusto onboarding guide (secondary). https://www.sdocpa.com/gusto-onboarding-guide/
26. ADP, RUN Powered by ADP. https://www.adp.com/what-we-offer/products/run-powered-by-adp.aspx
27. ADP, Time and attendance. https://www.adp.com/what-we-offer/time-and-attendance.aspx
28. ADP Marketplace, ADP Timekeeping Plus Scheduling for RUN. https://apps.adp.com/en-US/apps/333402/ADP%C2%AE-Timekeeping-Plus-Scheduling-for-RUN-Powered-by-ADP%C2%AE/features
29. ADP, ADP Mobile. https://www.adp.com/mobilesolutions
30. ADP, RUN implementation (search summary). https://www.adp.com/knowledge/products/run/implementation
31. ADP, Registering a New Employee in RUN (PDF, 2015). https://support.adp.com/adp_payroll/content/hybrid/TLM/Registering_an_Employee_in_Run_Powered_by_ADP.pdf
32. ADP, Worldwide locations. https://www.adp.com/worldwide-locations.aspx
33. ADP, Pay Statement Requirements chart (PDF, updated 2026-10-06). https://www.adp.com/-/media/adp/resourcehub/pdf/pay_statement_requirements_chart.pdf
34. Roll by ADP, Pricing. https://www.rollbyadp.com/pricing
35. ADP Media Center, Roll available in Spanish (2021-12-16). https://mediacenter.adp.com/2021-12-16-Roll-TM-by-ADP-R-is-Now-Available-in-Spanish-with-Added-Features,-Expanding-Small-Businesses-Power-to-Manage-Payroll
36. PR Newswire, ADP Workforce Now Time & Attendance in Puerto Rico (2011; secondary). https://prnewswire.com/news-releases/companies-in-puerto-rico-show-strong-demand-for-adps-integrated-cloud-based-workforce-now-time--attendance-solution-135918013.html
37. Tech.co, ADP pricing guide (secondary). https://tech.co/hr-software/adp-pricing-guide
38. G2, RUN Powered by ADP reviews (search summary). https://g2.com/products/run-powered-by-adp/reviews
39. G2, Gusto reviews (search summary). https://g2.com/products/gusto/reviews
40. Capterra, Gusto reviews (search summary). https://capterra.com/p/131882/Gusto/reviews/
41. Capterra, Homebase reviews (search summary). https://www.capterra.com/p/153076/Homebase/reviews/
42. checkthat.ai, Homebase reviews analysis (secondary). https://checkthat.ai/brands/homebase/reviews
43. checkthat.ai, 7shifts alternatives (secondary). https://checkthat.ai/brands/7shifts/alternatives
44. When I Work, Pricing. https://wheniwork.com/pricing
45. When I Work Help, Gusto Integration. https://help.wheniwork.com/articles/gusto-integration
46. Deputy, Pricing. https://www.deputy.com/pricing
47. Connecteam, Pricing. https://connecteam.com/pricing/
48. Sling, Pricing. https://getsling.com/pricing/
49. Square, Shifts pricing. https://squareup.com/us/en/staff/shifts/pricing
50. Square Community, Square Plus locations pricing (secondary). https://community.squareup.com/t5/Food-Beverage/Square-Plus-quot-Locations-quot-Pricing/td-p/836210
51. Costbench, 7shifts plans and pricing (secondary). https://costbench.com/software/employee-scheduling/7shifts/
52. 7shifts KB, Payroll: Prohibited and Restricted Businesses (search snippet). https://kb.7shifts.com/hc/en-us/articles/27121799960851
53. Intuit Community, QuickBooks Payroll and Puerto Rico (secondary). https://quickbooks.intuit.com/learn-support/en-us/employees-and-payroll/hello-does-quickbooks-payroll-work-in-puerto-rico/00/564666
54. WFTV / Stacker, OnTheClock time theft report (2026-08-28). https://www.wftv.com/news/time-theft-report/SF4F7UB7PY677GFBEXZISEXSSA/
55. Stacker, Payroll accuracy is now a retention strategy (Paylocity, 2026-06-05). https://stacker.com/stories/small-business/payroll-accuracy-now-retention-strategy
56. KRDO / Stacker, OnTheClock payroll accuracy survey (search summary). https://krdo.com/?p=1767400
57. Paychex, Business leader priorities 2026. https://www.paychex.com/articles/human-resources/business-leader-priorities-2026
58. National Law Review / Jackson Lewis, Christmas bonus compliance for Puerto Rico employers (2025-11-14). https://natlawreview.com/article/avoiding-naughty-list-christmas-bonus-compliance-puerto-rico-employers
59. SHRM, Overview of Puerto Rico employment law. https://www.shrm.org/topics-tools/employment-law-compliance/overview-puerto-rico-employment-law
60. DTRH, Ley 180-1998 text (search summary). https://trabajo.pr.gov/docs/Normas_del_Trabajo/Leyes/Ley_Num_180_27_julio_1998_Ley%20de%20Salario%20Minimo.pdf
61. DTRH, Aviso Público, Solicitud de Exención del Bono 2025 (search summary). https://trabajo.pr.gov/docs/Avisos/Aviso%20P%C3%BAblico%20-%20Solicitud%20de%20Exenci%C3%B3n%20del%20Bono%202025.pdf
62. Littler, Puerto Rico act extends authorized deductions (search summary). https://www.littler.com/news-analysis/asap/puerto-rico-new-act-extends-list-authorized-deductions-non-exempt-employees
63. Morgan Lewis, Puerto Rico increases minimum wage (2024-06; search summary). https://www.morganlewis.com/pubs/2024/06/puerto-rico-increases-minimum-wage-and-extends-deadline-to-file-payroll-statement
64. Paul Hastings, Puerto Rico (search summary). https://www.paulhastings.com/thought-leadership/puerto-rico
65. Poster Compliance Center, Puerto Rico labor law poster (vendor; secondary). https://www.postercompliance.com/labor-law-posters/puerto-rico/
66. US Census Bureau, QuickFacts Puerto Rico (search summary). https://www.census.gov/quickfacts/fact/table/PR/HCN010222
67. Internal: `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/docs/product/competitive-2026-10.md` (sources read 2026-10-17), `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/docs/product/direction.md`, `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/docs/product/trends-2026-10.md`, `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/docs/product/TEAM-RULES.md`, `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/docs/product/FIXED-AND-REMAINING.md`.