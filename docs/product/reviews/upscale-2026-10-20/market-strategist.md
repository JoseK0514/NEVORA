# Upscale review: market and competitive lens (MK)

- **Role:** market-strategist-pm
- **Date:** 2026-10-20. Web sources were read on this date unless a row says otherwise.
- **Build walked:** `http://127.0.0.1:55450`, release-candidate clean v3. Owner (`QAOWNER`) at 1440 and 390, Manager (`AUDIT-M`) at 1440 and 390. Profile used the `p35-profile` fixtures through `page.route`. Read only: nothing was saved, approved, published or submitted.
- **Evidence folder:** `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-profile-6cdee8/e8429433-65b2-4ff4-835a-8f879fb2454f/scratchpad/upscale/market-strategist/` (called `MS/` below). `crops/` holds the evidence crops, `shots/` the full pages, `text/` each page's visible text, and the `*.mjs` files are the scripts.
- **Builds on:** `docs/product/competitive-2026-10.md` (17 Oct). Ratings, pricing and launches are not repeated here.

## Verdict

NEVORA's Owner and Manager app now looks as calm and finished as Gusto. Its Inbox and payroll stepper match or beat the competitors we checked. Where it falls behind is money. A buyer who has seen Square, Homebase, 7shifts or Deputy will ask what the week costs, who is going into overtime and when payroll is due. Today NEVORA answers in hours only (Schedule header: "6 people · 336h"), and Owner Home says nothing about payroll, even though the Payroll page lists 3 pay periods with no run. The most valuable upscale is to **put money and deadlines in front of the Owner**. Start with a Home "Upcoming" rail built from data NEVORA already has (MK1). Then add labour cost and Puerto Rico overtime to the schedule (MK2, MK3), which needs Codex. The opening no competitor covers is Puerto Rico's Christmas bonus (Bono de Navidad). This year's payment window opens on 15 November, in 26 days (MK4).

## What a buyer compares in a demo

H = have, P = partial, M = missing, ? = not verified. The source for each cell is in the row note or the earlier brief.

| Owner and manager capability | Gusto | Homebase | When I Work | Deputy | 7shifts | Connecteam | Square Team | **NEVORA today** |
|---|---|---|---|---|---|---|---|---|
| Labour cost on the schedule (per person, per day, week total) | ? | H¹ | ? | H² | H³ | ? | H⁴ | **M** (hours only) |
| Overtime warning while scheduling | ? | H¹ | ? | H² | ? | ? | ? | **P** (weekly rule when set up; label reads "over limit") |
| Payroll due and payday on Home | H⁵ | ? | M | ? | M | M | ? | **M** on Home (data on Payroll and My pay) |
| Team chat, one-to-one and group | M⁶ | H⁷ | H⁸ | H⁶ | H⁶ | H⁹ | P⁶ | **P** (announcements with acknowledgement) |
| Time-off balances and accrual | ? | H¹⁰ | ? | H⁶ | ? | ? | ? | **M** |
| Puerto Rico payroll or Christmas bonus | M⁶ | ?⁶ | M⁶ | ? | ? | M⁶ | ? | **P** (export, provider import, Popular channel noted) |
| Spanish app listing | M⁶ | H⁶ | H⁶ | H⁶ | H⁶ | H⁶ | H⁶ | **P** (B5 pending) |

¹ [joinhomebase.com/labor-cost-management](https://www.joinhomebase.com/labor-cost-management), vendor page. ² Deputy "Overtime warnings and cost breakdown" beta, [whatsnew.deputy.com](https://whatsnew.deputy.com/overtime-warnings-cost-breakdown-4qol9u), shown as "6 months ago", so about April 2026. ³ 7shifts Labor Budget Tool, [kb.7shifts.com](https://kb.7shifts.com/hc/en-us/articles/4417514442771). ⁴ Square web scheduling shows each person's cost, daily totals and a week total of "$2,640.00 / 228h" next to Publish ([Mobbin](https://mobbin.com/screens/66ea4b9b-7284-4f6a-bc5f-cb0860a34724)). ⁵ Gusto Home has Tasks, "Payments in progress" and an "Upcoming" payroll date with Sync calendar ([Mobbin](https://mobbin.com/screens/f80f8026-7437-46f3-8970-5f4b2aabe0dc)). The calendar sync is described in Gusto help (search snippet; support.gusto.com returned 403). ⁶ `docs/product/competitive-2026-10.md`, sections 2 and 3. ⁷ Homebase App Store listing (search snippet). ⁸ When I Work's vendor reply on [G2](https://www.g2.com/compare/sling-vs-when-i-work) names WorkChat. ⁹ [Capterra Connecteam reviews](https://www.capterra.com/p/153140/Connecteam/reviews/?page=10). ¹⁰ [joinhomebase.com/free-pto-tracking](https://www.joinhomebase.com/free-pto-tracking). Its pricing page puts PTO controls in a paid tier, so the tier is unclear.

## Opportunities, ranked by impact

Draft scorecard (TEAM-RULES): U Usability, F Familiarity, T Trust, A Accessibility, B Brand, D Durability, C Cost, Co Continuity; 0 to 2 each, 12 of 16 to go ahead.

### MK1. Owner Home "Upcoming": payroll due, payday and deadlines

- **Page, role, width:** Home (`/app`), Owner, 1440 and 390. The Manager sees the same rail without payroll rows.
- **Today:** Home shows Finish setting up, Needs you, Working now and Shifts today. It says nothing about pay. Meanwhile the Payroll page lists "3 completed periods have no original payroll run" and a Sep 21–27 run at "Review required" ([crop](MS/crops/payroll-1440-unrun-periods.png)), and My pay shows "Next payday Oct 27". Evidence: `MS/crops/home-1440-no-money.png`, `MS/crops/home-390-no-money.png`.
- **The upscale:** add a quiet "Upcoming" card in the right column under Working now (Gusto Home's anatomy, [Mobbin](https://mobbin.com/screens/f80f8026-7437-46f3-8970-5f4b2aabe0dc)). It holds up to four dated rows, each linking to its record:
  - "Payroll, Sep 21–27 · Review required · payday was Sep 29" (amber), then "3 pay periods without a run" (amber).
  - "Next payday · Tue, Oct 27".
  - "Timecard approvals open · after Sun, Oct 25".
  - "Publish West Office · not planned".

  On phones it becomes one row under Needs you ("Payroll needs review · 3 periods"). Use the status ladder only, with no new colour.
- **Why it matters:** the Owner pays for the product because of pay. A Home that forgets payroll reads as a scheduling tool, not a "time, pay and workforce" app. Gusto's Home leads with this.
- **Effort:** M.
- **Needs:** mostly UI, since the data is already on the Payroll, Timecards and Schedule pages. Codex only if Home can't load the payroll summary without a new read route. Jose approves the payroll row wording. Roadmap Phase 6 already approved "Manager Home Upcoming (existing data only)" (`docs/execution/2026-10-15-gusto-roadmap.md`), and it hasn't shipped yet.
- **Score:** U2 F2 T2 A2 B1 D2 C2 Co2 = **15**.

### MK2. Labour cost on the schedule

- **Page, role, width:** Schedule (`/app/schedule`), Owner (Manager only if Jose allows), 1440. On phones, the day summary.
- **Today:** the header cell reads "6 people · 336h" and each person shows hours ("56h · over limit"). There are no dollars anywhere in Schedule, Home or Insights ([crop](MS/crops/schedule-1440-hours-no-cost.png)). The code has a labour-budget model whose readiness is always `not_configured` (`src/lib/business-improvements/labor-budget/model.ts`). Employee Home estimates use temporary role rates (`src/lib/employee-compensation.ts:13`, "Replace these constants with persisted employee compensation").
- **The upscale:** follow Square's pattern ([Mobbin](https://mobbin.com/screens/66ea4b9b-7284-4f6a-bc5f-cb0860a34724)):
  - Each person's hours and estimated cost under the name.
  - A footer row of daily cost and hours.
  - The week total in the header cell, for example "6 people · 336h · est. $X".

  Mark every figure "estimate". Overtime goes in amber (MK3). An optional weekly budget turns the total amber when it's exceeded, as in 7shifts' green and red days. Phone: one line, "Today · 9 shifts · est. $X".
- **Why it matters:** this is the first number a restaurant or retail owner looks for. Square, Homebase, 7shifts and Deputy all show it, and without it NEVORA loses side-by-side demos.
- **Effort:** L.
- **Needs:** Codex (per-employee rates with effective dates, owner-only access, a calculation route). Jose approves the calculation method and who sees money. This counts as payroll wording.
- **Score:** U2 F2 T1 A2 B1 D2 C1 Co2 = **13**. Trust is 1 until the "estimate" label and rate access are settled.

### MK3. Overtime in Puerto Rico terms on the schedule and in Add shift

- **Page, role, width:** Schedule grid and Add shift (`/app/schedule/new`), Owner and Manager, 1440 and 390.
- **Today:** Alexandra Rivera has 56h scheduled and reads "56 of 80h limit", with no overtime flag. Others read "56h · over limit", and the label never says which limit. The engine has only a weekly projected-overtime rule, and only when an Owner configures it (`src/lib/scheduling/operational-rules.ts:143`). Add shift says "Availability, time off, other shifts and weekly hours are checked when you save" (`MS/text/QAOWNER-1440-_app_schedule_new.txt`).
- **The upscale:**
  - Replace "over limit" with numbers: "16h overtime" (over 40 a week) and "2h daily overtime" (over 8 in a day). Show them as an amber chip on the person cell, with a tooltip naming the rule.
  - Add shift's Summary gains a live line before save: "This shift puts Casey at 48h this week · 8h overtime". This mirrors Deputy's warning at shift creation and Homebase's "approaching overtime".
  - Use the Ley 379 thresholds already set out in the earlier brief (section 7.1): daily over 8, weekly over 40.
- **Why it matters:** Puerto Rico's daily overtime rule is stricter than the US federal rule. A US-built tool that only checks 40 a week under-warns a PR employer, so this is where NEVORA can look more expert than Deputy or Homebase.
- **Effort:** M.
- **Needs:** Codex for the daily rule and the pre-save preview route. Jose and PR labour counsel approve the wording. Labels only (no daily rule) are UI-only.
- **Score:** U2 F2 T2 A2 B2 D2 C1 Co2 = **15**.

### MK4. Bono de Navidad readiness (Puerto Rico only)

- **Page, role, width:** Payroll (new card on Payroll runs) and Home Upcoming (MK1), Owner, 1440 and 390.
- **Today:** nothing in the product mentions the Christmas bonus (no match in `src/`). We found no mention of PR Christmas bonus handling for Homebase, Deputy, When I Work, 7shifts, Connecteam or Square (web search, 2026-10-20). Workday documents PR bonus tax handling at enterprise level ([doc.workday.com](https://doc.workday.com/admin-guide/en-us/payroll/payroll-for-the-u-s-/tax-setup-usa-/state-territories-and-local-taxes/kat1439613912311.html)). Gusto doesn't run PR payroll.
- **The law, from the DTRH compilation of Ley 148-1969** (revised 28 Sep 2023, unofficial, [trabajo.pr.gov](https://trabajo.pr.gov/docs/Libreria_Laboral/Leyes/Ley%20148-1969,%20Ley%20del%20Bono%20en%20la%20Empresa%20Privada.pdf); text in `MS/ley148.txt`):
  - The coverage year runs 1 Oct to 30 Sep.
  - Staff hired before Ley 4-2017 need 700 hours. The bonus is 6% of up to $10,000, or 3% for employers with 15 or fewer employees.
  - Staff hired after it need 1,350 hours. The bonus is 2%, capped at $600 for employers with more than 20 employees and $300 for 20 or fewer. It is halved in the first year.
  - The total is capped at 15% of net profit.
  - It is paid between 15 Nov and 15 Dec. A late payment adds 50% within six months, 100% after that.
  - Secondary reading: [Jackson Lewis](https://www.jacksonlewis.com/insights/avoiding-naughty-list-christmas-bonus-compliance-puerto-rico-employers), [Littler](https://www.littler.com/news-analysis/asap/puerto-rico-secretary-labor-and-human-resources-issues-new-guidelines-governing). Littler puts the larger-employer tier at 21 or more, which matches "more than 20".
- **The upscale:** a "Bono de Navidad 2026" card listing each person's recorded hours for Oct 1 2025 – Sep 30 2026 against their threshold. It sorts people into eligible, near and not eligible, and shows the window "Pay between Nov 15 and Dec 15". There are no amounts in the first version, and every row links to the timecards behind it.
- **Why it matters:** it gives NEVORA a Puerto Rico-only demo moment, and the payment window opens on 15 November. A US-built competitor can't show it without custom work, and it uses NEVORA's own verified time records.
- **Effort:** L. An hours-only first version is M.
- **Needs:** Codex (a 12-month hours rollup, a hire-date field for the 2017 split, headcount history). Jose and PR counsel must approve, since this is legal and payroll wording. Hours recorded before NEVORA was adopted are missing, so the card needs an honest "hours before [date] not in NEVORA" note.
- **Score:** U2 F1 T2 A2 B2 D2 C1 Co2 = **14**.

### MK5. Insights that answer "how did last week go"

- **Page, role, width:** Insights (`/app/reports`), Owner and Manager, 1440 and 390.
- **Today:** it opens on last week with four zeros, a flat chart and "13 people with no recorded time" ([crop](MS/crops/insights-1440-hours-only.png)). It shows recorded hours, time off and timecards only.
- **The upscale:**
  - Lead with "Scheduled vs recorded" hours per day as two series, plus three tiles: overtime hours, late or missed clock-ins, and open shifts left unfilled. Each tile links to the records behind it.
  - When the chosen period has no time, open on "This week so far" and say why.
  - Labour cost joins later, after MK2.

  Homebase sells labour reports by role and location. Deputy charges $1.50 per user for Analytics+ (earlier brief, section 3).
- **Why it matters:** an Owner judges a tool by its reports in the second demo. Comparing schedule with punches is NEVORA's strength (B4), yet Insights doesn't use it.
- **Effort:** M.
- **Needs:** UI for the empty-period default. Codex for a scheduled-vs-recorded series if the reports route lacks it.
- **Score:** U2 F2 T2 A2 B1 D2 C2 Co2 = **15**.

### MK6. Puerto Rico defaults in one step during setup

- **Page, role, width:** Home "Finish setting up", Company policies, Scheduling rules. Owner, 1440.
- **Today:** setup shows "1 of 2". Every attendance rule is "Off by default" ([crop](MS/crops/policies-1440-all-off.png)), and staffing, hour targets and weekly maximums are blank. The planner reports "21% configured coverage".
- **The upscale:** add a setup step, "Use Puerto Rico rules". One sheet previews what turns on: daily and weekly overtime flags, the meal-period window (between the end of the 2nd hour and the start of the 6th), lateness and missed clock-out review. The Owner confirms, and each rule stays editable in its usual page. The checklist grows to the steps that unlock value: hour targets, coverage, PR rules, invite the team (availability 0 of 8), register a Clocker.
- **Why it matters:** it turns NEVORA's local knowledge into one visible choice in the first ten minutes. Deputy's break policy beta is generic (earlier brief).
- **Effort:** M for the checklist (UI). L for the presets (Codex).
- **Needs:** Codex for presets the rule engine doesn't hold yet (daily overtime, meal window). Jose and counsel for the rule list and copy.
- **Score:** U2 F2 T2 A2 B2 D2 C1 Co2 = **15**.

### MK7. A team member page that leads with the person

- **Page, role, width:** Team member (`/app/employees/AUDIT-E`), Owner and Manager, 1440 and 390.
- **Today:** the page opens on an edit form (ID, names, phone, email, role, location, status) with Clocker PIN and Account recovery underneath ([crop](MS/crops/team-member-1440-thin-profile.png)).
- **The upscale:** put a read-only summary above the form, built from data NEVORA has:
  - This week's shifts and hours against the target.
  - Last two timecards with status.
  - Pending and recent time off.
  - Positions and locations.
  - Unacknowledged updates.
  - Shortcuts: Add shift, View timecards.

  Gusto's People profile and Homebase's employee page lead with the person.
- **Why it matters:** managers open a person to decide something, such as covering a shift or approving time off. A form-first page makes them hunt across four pages.
- **Effort:** M.
- **Needs:** UI if the summaries reuse existing reads. Codex for any new aggregate. Later fields (hire date, emergency contact, pay rate) need Codex and Jose.
- **Score:** U2 F2 T2 A2 B1 D2 C2 Co2 = **15**.

### MK8. Acknowledgement progress in the Updates list, and a nudge

- **Page, role, width:** Updates (`/app/updates`), Owner and Manager, 1440 and 390.
- **Today:** the list reads "This week's team schedule · Acknowledgement required" ([crop](MS/crops/updates-1440-one-way.png)). The progress "0 of 5 acknowledged" appears only after opening the update ([crop](MS/crops/update-detail-1440.png)).
- **The upscale:** show "0 of 5 acknowledged" with a thin progress bar on every list row. Add a "Remind the 5 who haven't" action in the detail view.
- **Why it matters:** read receipts are NEVORA's answer to the chat features competitors sell (MK10). Showing them at a glance makes that answer visible in a demo.
- **Effort:** S for the list row, M for the reminder.
- **Needs:** list row is UI-only if the list payload carries the counts. Otherwise Codex adds them. The reminder needs Codex and must respect notification preferences.
- **Score:** U2 F2 T2 A2 B2 D2 C2 Co2 = **16**.

### MK9. Phone Home gets "Shifts today"

- **Page, role, width:** Home, Owner and Manager, 390.
- **Today:** the phone Home stops at Working now. The desktop "Shifts today" timeline (who is on, who hasn't clocked in) has no phone equivalent ([crop](MS/crops/home-390-no-money.png)).
- **The upscale:** a compact list under Working now. Each row reads "7:00 AM · Morgan Rivera · no clock-in", with coral for missed clock-ins and grey for later shifts. Show 5 rows, then "Show all 9". Reuse the phone Schedule day list styling.
- **Why it matters:** owners check the floor from their phones. Earlier brief theme 10: managers want phone parity.
- **Effort:** S.
- **Needs:** UI only.
- **Score:** U2 F2 T2 A2 B1 D2 C2 Co2 = **15**.

### MK10. Decide NEVORA's answer to team chat

- **Page, role, width:** Updates, Inbox, team member page. All roles, all widths.
- **Today:** NEVORA has announcements with acknowledgement receipts and a "Message today's team" path for some roles (`src/components/employee-updates.tsx:50`). It has no one-to-one or group chat. Homebase, When I Work, Connecteam, 7shifts and Deputy all ship chat (matrix above).
- **The upscale:** Jose chooses between two options:
  - (a) Build chat. This is a large, ongoing moderation and privacy load.
  - (b) Position against chat: updates with receipts (MK8), "Message this person" on shifts and profiles that opens the phone's own SMS or WhatsApp with the shift details pre-filled, and a line on the pricing page.

  We recommend (b) for 2026. WhatsApp's reach among Puerto Rico small businesses is our assumption, not verified.
- **Why it matters:** buyers will ask "can I message my team?". A clear answer beats a missing one.
- **Effort:** S for (b) links, L for (a).
- **Needs:** Jose's decision. (b) is UI-only. (a) needs Codex.
- **Score (b):** U1 F2 T2 A2 B1 D2 C2 Co2 = **14**.

### MK11. Time-off balances, with Puerto Rico accrual later

- **Page, role, width:** Inbox time-off decision, team member page, Owner and Manager.
- **Today:** time-off requests show dates only. There is no balance anywhere (no accrual code in `src/lib`).
- **The upscale:** first show the balance beside each time-off decision ("Has 4.5 days left after this"). Later add Ley 180-1998 accrual presets. The DTRH compilation sets a 130-hours-a-month threshold ([trabajo.pr.gov](https://trabajo.pr.gov/docs/Libreria_Laboral/Leyes/Ley%20180-1998,%20Ley%20de%20Vacaciones%20y%20Licencia%20por%20Enfermedad%20de%20Puerto%20Rico.pdf)). Rates after Ley 4-2017, and the part-time rules once Ley 41-2022 was voided, need counsel.
- **Why it matters:** approving leave without a balance is guesswork. Homebase and Deputy show balances.
- **Effort:** L.
- **Needs:** Codex (balance ledger). Jose and counsel for accrual rules.
- **Score:** U2 F2 T2 A2 B1 D2 C1 Co2 = **14**.

### MK12. Make the Banco Popular handoff real

- **Page, role, width:** Payroll settings, Owner, 1440.
- **Today:** "Desired bank channel" lists Popular Web Cash Manager (text and NACHA), marked "compatibility unverified". NEVORA "does not submit payments" ([crop](MS/crops/payroll-settings-1440-popular-channel.png)).
- **The upscale:** once a file format is verified with Popular, label the channel "Verified format" and offer a one-step "Download Popular NACHA file" after approval. Until then, keep the honest copy.
- **Why it matters:** this is a Puerto Rico-specific integration that US tools don't list. It shows up during setup, when the Owner is deciding whether to buy.
- **Effort:** L.
- **Needs:** Codex, Jose, and a bank verification. Payroll and legal wording.
- **Score:** U1 F1 T2 A2 B2 D2 C1 Co2 = **13**.

## Quick wins (S, UI only)

1. **MK9:** phone Home "Shifts today" list.
2. **MK8 list row:** "0 of 5 acknowledged" on each update, if the list payload already has the counts.
3. **MK3 labels only:** replace "over limit" with the number and the limit ("8h over 48h max"), using data the grid already has.
4. **MK5 empty period:** when the period has no time, open Insights on "This week so far" and say why.
5. **MK1 phone row:** "Next payday · Tue, Oct 27" on Home, from the date My pay already shows. The payroll-due rows need Jose's wording.

## Leave as is

- **Inbox:** the master-detail view with All, Act now, Requests and Plan ahead, plus "Planning items don't count toward the 10" (`MS/shots/QAOWNER-1440-_app_inbox.png`). It is clearer than Gusto's Tasks list.
- **Payroll stepper:** Hours, Amounts, Review, Approve, Publish, with revision-bound approval and provider amounts (`MS/shots/QAOWNER-1440-_app_payroll.png`). No small-business rival shows this much audit care.
- **Phone Schedule:** day strip, location segments, "West Office isn't planned · Plan" and inline Find Cover (`MS/shots/QAOWNER-390-_app_schedule.png`). It feels native.
- **Clocker recovery and Account recovery:** the receipt-based, step-by-step trust pages. No competitor markets anything like them.
- **Features & words:** industry vocabulary presets with Spanish slots, and modules that switch off without losing data (`MS/crops/features-1440-spanish-slots.png`).
- **⌘K search, the sidebar groups and the calm teal palette.** Don't churn them.

## Gaps in this review

- Competitor screens came from Mobbin and vendor pages, not live trials (no sign-ups). When I Work, Connecteam and Gusto labour-cost and overtime cells are unverified (?).
- Homebase plan tiers for PTO and messaging conflict across its own pages.
- Bono de Navidad and Ley 180 rules come from DTRH's unofficial compilations and law-firm summaries. Counsel must confirm them before any copy ships.
- The Manager walk covered Home, Inbox, Schedule, Timecards, Insights, Team and Profile at 1440, and Home and Schedule at 390. The Manager doesn't see Payroll. Text dumps for each are in `MS/text/`.
- The preview's fictional data has odd clock times (for example "in at 9:12 PM" against a 9–5 shift). That didn't affect these findings.
