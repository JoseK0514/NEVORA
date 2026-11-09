# What NEVORA is missing: market gap analysis

- **Author:** market-strategist-pm, acting as senior business and market analyst
- **Date:** 2026-10-20. Web sources were read on this date unless a row says 2026-10-17. Those come from [competitive-2026-10.md](../../competitive-2026-10.md) and are not repeated in full here.
- **Question (Jose):** "Tell me what we are missing." This compares NEVORA with what a small multi-location business gets today from Homebase, 7shifts, When I Work, Deputy, Connecteam, Sling and Gusto.
- **NEVORA evidence:** branch `claude/auth-premium` at `65d31dff`, read-only checkout at `scratchpad/auth`. Paths below are relative to its `src/`.
- **Evidence key:** *primary* means the vendor's own pricing, feature or help page. *Secondary* means a pricing tracker, review site or law-firm summary. *Unverified* means we found no source, or only an inference.
- **Already tracked, so left out:** dark mode, Spanish activation, the real-device check, production release, and CI failures.

---

## 1. Executive summary

NEVORA is stronger than the competitors on **record integrity**: punch receipts, acknowledgement receipts, revision-checked commands, explainable schedule drafts, and payroll export with a verified time basis. It is also the only one of these products building **Puerto Rico rules** (PR withholding in `lib/payroll/native/rules/pr-2026.ts`, the PR week split, kiosk Spanish).

It is weaker on the **everyday features small-business buyers expect in a demo or a free trial**. Four are close to universal, and lacking them will cost deals:

1. **Clock-in from the employee's own phone, with a location check.** Every competitor has it. NEVORA clocks in only at the shared Clocker tablet. The employee time panel shows punches but can't create one (`components/employee-time-panel.tsx`), and direction item A20 says "needs a phone clock-in decision first" (`docs/product/direction.md:94`).
2. **Store apps with push.** All seven competitors are in both stores. NEVORA is a PWA, and the Capacitor spike is approved but not built (`docs/product/prd-capacitor-spike.md`).
3. **Labor cost in dollars on the schedule.** Sling has it at $1.70 per user; Deputy, When I Work and Homebase have it too. NEVORA shows hours, not money. Its Insights strip has no cost line (`lib/reports/insights.ts:20-29`).
4. **Real-time overtime and break alerts.** NEVORA warns about projected overtime while a schedule is being built (`lib/scheduling/operational-rules.ts:17`). It doesn't warn a manager when someone on the clock is about to go into overtime or miss a meal. Puerto Rico's daily overtime (more than 8 hours) makes this more urgent than in most US states.

Next come four **churn risks**: no time-off balances or accruals, no two-way team chat, no offline punches, and no new-hire paperwork.

**Where NEVORA can win:** *"The workforce app built for Puerto Rico: Spanish first, Puerto Rico law built in, and every hour on the record."* No competitor we checked offers that, and Gusto's payroll terms exclude US territories.

**Bets for next quarter (section 6):**

1. Phone clock-in that records location only at the punch.
2. Labor cost and budget on the schedule, with live overtime alerts.
3. A Puerto Rico compliance pack covering Ley 379 meals and overtime and Ley 180 leave balances.
4. A Clocker that keeps working through outages (B6).
5. Ship the Capacitor store apps. This is already in flight, so keep it on track.

---

## 2. What NEVORA has today (code evidence)

| Area | State | Evidence |
|---|---|---|
| Scheduling, templates, copy week, coverage | Have | `app/app/schedule/*`, `lib/scheduling/copy-week.ts`, `coverage-repair.ts` |
| Auto-scheduling | Have, deterministic | Drafts with explanations and fairness, built from configured staffing needs (`lib/scheduling/generation/demand.ts`, `needs.ts`, `fairness.ts`). No sales forecast, no LLM |
| Schedule rules | Have | Minimum rest, maximum shift, maximum daily hours, breaks, projected overtime (`lib/scheduling/operational-rules.ts:17`) |
| Shared time clock | Have | Clocker with PIN, breaks, Spanish toggle, punch receipts (`app/clocker/[location]`, `lib/clocker/punch-types.ts`) |
| Phone clock-in | **Missing** | No punch route under `app/api/employee/`; no geolocation code anywhere in `src/` |
| Swaps, callouts, open shifts, availability, time off | Have | `app/app/exchange/*`, `app/app/availability`, `lib/time-off-withdrawal.ts` |
| Time-off balances or accruals | **Missing** | No balance or accrual logic outside payroll tax |
| Team communication | One-way | Announcements, shift notes, today's-team updates with required acknowledgement and recipient receipts (`lib/communications/types.ts`). No replies, 1:1 or group chat |
| Notifications | Have | Web push and email (`package.json`: `web-push`, `nodemailer`). No SMS. Calendar feed by token (`app/api/calendar/[token]`) |
| Timecards, corrections, period close | Have | `app/app/timecards`, `lib/time-corrections`, `lib/period-close` |
| Payroll | Partial | Imports provider results from ADP RUN, QuickBooks Payroll, Paychex and Gusto (`lib/payroll/contracts.ts:22`). Export as custom CSV or ADP RUN generic (`lib/payroll-export/model.ts:7`). Native calculation is in development: PR income withholding, federal tax, minimum wage, pay stubs (`lib/payroll/native/*`). No money movement or tax filing |
| Labor cost | **Missing** | Hours only. `lib/employee-compensation.ts` holds placeholder role rates (OWNER 26, EMPLOYEE 16) and is used nowhere. Delete it, or keep it away from any cost feature |
| Reporting | Partial | Insights: recorded vs scheduled hours, clock-in notes, requests, coverage, open timecards, CSV (`lib/reports/*`). No cost, sales or overtime-cost reports |
| Multi-location | Have | Location settings, location-scoped schedules, Clocker per location |
| Sign-in | Partial | Passkeys and Face ID client built behind `NEXT_PUBLIC_NEVORA_PASSKEYS` (`lib/passkeys/client.ts`). The server is Codex's |
| Branding, modules, vocabulary | Have | B1 and B2 (roadmap) |
| Offline | Partial | Offline page only (`public/fuel-portal-sw.js:99`). No punch queue |
| Tasks or checklists, tips, POS, hiring, onboarding paperwork, photo at punch | **Missing** | No matches in `src/` |

---

## 3. Feature gap matrix

H = have, P = partial, M = missing, ? = not verified. A tier in brackets is the cheapest plan that includes the feature. Sources are numbered and listed in section 9.

| Capability | Homebase | 7shifts | When I Work | Deputy | Connecteam | Sling | Gusto | **NEVORA** |
|---|---|---|---|---|---|---|---|---|
| Auto-scheduling | H (Plus, AI assistant) [1] | H [6] | H (Essentials) [8] | H (Core) [10] | P (auto-assign, Expert) [12] | H (Business) [14] | M (17 Oct brief) | **H** deterministic, explained |
| Sales-based forecasting | H (All-in-One) [1] | H (POS sales) [6][7] | H (forecast tools) [8] | H (Core) [10] | M [12] | ? | M | **M** (staffing needs only) |
| Labor cost on schedule or budget | H (All-in-One) [1] | H [6] | H [9] | H (Core, wage and labor budgets) [10] | M [12] | H (Premium) [14] | ? | **M** |
| Overtime alerts (live) | H (All-in-One) [1][2] | H [5] | H [9] | ? (not listed) [10] | P (work-limit alerts) [12] | H (Premium) [14] | ? | **P** projected at scheduling only |
| Phone clock-in with GPS or geofence | H [2] | H (17 Oct brief) | H [9] | H (17 Oct brief) | H (paid; 10 sites on Advanced) [12] | H (Premium) [14] | H (Plus, GPS) [16] | **M** |
| Photo or face check at clock-in | H (photo) [2] | ? | H (photo) [9] | H (Core, biometrics) [10] | M [12] | ? | M [16] | **M** |
| Shared kiosk | H [2] | H (7punches) | H (terminals) [9] | H [10][11] | H [12] | H (Business) [14] | H (extra cost) [16] | **H** Clocker |
| Offline clock-in | H (claimed) [2] | ? | ? | P (legacy iPad kiosk only) [11] | M [13] | ? | ? | **M** (B6 planned) |
| Tip management | Add-on $25/location [1] | H (add-on, secondary $49.99) [5][6] | ? | ? | M | ? | ? | **M** |
| POS integrations | H (PAR, Square, Clover, Toast, Shopify, GoDaddy, Lightspeed) [3] | H (Toast, Square, Clover, Lightspeed, TouchBistro) [7] | H (Essentials) [8] | ? | M [12] | Toast bundle (17 Oct brief) | ? | **M** |
| Payroll integrations | H (ADP, Paychex, Gusto, Heartland, Square, QuickBooks and others) [3]; own payroll add-on | H (ADP and others) [5]; own payroll | H (Rippling, ADP, Gusto) [9] | H (Lite); Paycor add-on [10] | P ("Payroll Integration", Basic+) [12] | H (Business) [14] | Native payroll; **excludes territories** [17] | **P** CSV and ADP RUN export, imports from 4 providers |
| Native PR payroll | ? (50 states + DC, 17 Oct brief) | ? | M | ? | M | M | **M** [17] | **P** in development |
| Hiring or ATS | H (Plus; assistant $99) [1] | ? | M | M | ? | M | H (Plus, secondary) [18] | **M** |
| Onboarding paperwork, e-sign | H (All-in-One: W-4, I-9, direct deposit) [1] | H ($2.99 per package or included; US only) [19] | M | P (HR add-on $2) [10] | H (2 to 30 e-sign documents by tier) [12] | P (Business: documents) [14] | H [18] | **P** invitation activation, company-policy acknowledgement |
| Team chat (2-way) | H (free) [4] | H (17 Oct brief) | H (Essentials) [8] | H (Lite) [10] | H (Communications hub) [12] | H (Free) [14] | M (17 Oct brief) | **P** one-way updates with receipts |
| Task lists or checklists | Add-on $13/location [1] | ? (Log Book) | M [8] | ? (link only) [10] | H (Basic, unlimited) [12] | H (Business) [14] | ? | **M** |
| Reporting | H (All-in-One: labor, sales) [1] | H | H (custom, Pro) [8] | H (Analytics+ $1.50) [10] | P (Expert) [12] | H (Business: labor, payroll, sales) [14] | ? | **P** hours and attendance only |
| Multi-location | H (paid tiers) [1] | H | H [8] | H (hierarchies, Pro) [10] | P (limited by clocks and schedules) [12] | H [14] | ? | **H** |
| Native store apps | H | H | H | H | H | H | H | **M** (Capacitor spike approved) |
| Spanish UI | H [4b] | H (App Store) | H (App Store) | H (App Store) | H (App Store) | **M** (EN only) | **M** (EN only) | **P** Clocker only (B5 planned) |
| Break and meal rules | H (tracked, waivers, missed-break alerts) [2][20] | H (Pro+, secondary) [6] | H (break tracking) [9] | H (break policy beta) | M [12] | H (Premium: breaks, attestation, clopening) [14] | ? | **P** schedule rules only; no live alert, no waiver record |
| Predictive scheduling (US cities) | P (advance notice; no premium-pay calculation found) [20] | P (Pro+, secondary) [6] | ? | ? | M | H (Business: premium pay) [14] | ? | **M** (no PR law requires it; see §4) |
| Minor (teen) labor rules | H (teen scheduling compliance) [20] | ? | ? | ? | ? | ? | ? | **M** |
| PR-specific rules (Ley 379, Ley 180) | M | M | M | M | M | M | M | **P** PR week split; Ley 379 pack proposed |
| Record integrity (employee-visible punch receipts, acknowledgement receipts) | ? | ? | ? | ? | ? | ? | ? | **H** (differentiator) |

---

## 4. Which gaps matter for NEVORA's target

The target is small multi-location shops (2 to 10 locations, 10 to 150 hourly staff) in Puerto Rico and bilingual US markets. The fictional sample, "Northside Services", is a services business, not a restaurant.

### Table stakes: deals are lost without them

| Gap | Why it is table stakes | Evidence |
|---|---|---|
| Phone clock-in with location check | Seven of seven competitors have it. Owners who aren't on site, mobile crews and second locations without a tablet all need it. It is often the first thing tried in a free trial | [2][9][12][14][16] |
| Store apps and native push | Seven of seven competitors. Employers tell staff to "download the app" | 17 Oct brief §3 |
| Labor cost on the schedule | Owners decide by dollars, not hours. It costs $1.70 to $2 per user at Sling, which sets the price floor | [14][10][9][1] |
| Live overtime alerts | Sold at every level from Sling Premium up. Daily overtime in PR (Ley 379 Art. 4(a)) makes it sharper | [14][9][1]; 17 Oct brief §7.1 |
| Two-way team chat | Free at Sling and Homebase. A demo without it reads as unfinished, even though PR teams already use WhatsApp | [14][4] |
| Payroll hand-off to the buyer's provider | Covered: NEVORA's custom CSV and ADP RUN export meet the bar | `lib/payroll-export/model.ts:7` |
| Multi-location | Covered | |

### Differentiators: reasons to switch or stay

| Gap or asset | Why it differentiates |
|---|---|
| PR compliance pack (Ley 379 meals and overtime, Ley 180 accruals) | No competitor ships PR presets. Gusto excludes territories [17] |
| Full PR Spanish | Gusto and Sling are English-only. Others list Spanish, but none are tested on PR wording |
| Offline Clocker | Connecteam has no offline mode [13]. Deputy has it only on a discontinued iPad app [11]. The 31 Dec 2024 blackout left nearly 90% of 1.47 million LUMA clients without power [21]. Outages continued in 2026 [22] |
| Time-off balances with PR accrual rules | Ley 180: one day of sick leave per month at 115 hours worked; part-time rules since Act 41-2022 [23]. Employees ask for their balance |
| Record integrity | Employee-visible punch receipts and change history answer the wage-theft distrust in reviews (17 Oct brief, theme 6) |
| Labor cost that includes PR daily overtime | Generic tools project weekly overtime. A Ley 379 daily-overtime cost line is specific to NEVORA |

### Ignorable for now

| Gap | Reason |
|---|---|
| Tip management, POS integration, sales forecasting | They matter for restaurants. Revisit only if restaurants become a target segment. If they do, these become table stakes, as 7shifts and Homebase show [1][3][7] |
| Predictive scheduling (US city ordinances) | Covers about 11 US jurisdictions (Oregon plus cities such as NYC, Chicago, Seattle, SF, LA, Philadelphia) [24]. We found no PR equivalent. Relevant only for US sales in those cities |
| Hiring and ATS | Gusto and Homebase sell it as an upsell [1][18]. It is far from NEVORA's core |
| Photo or face verification | Biometric privacy risk. An optional photo can come later, after legal review (17 Oct brief §5) |
| Teen labor rules | Real, but small for the segment. Fold into the compliance pack later |

---

## 5. Top missing capabilities ranked by deal and churn impact

| # | Missing capability | Impact | Who has it, and at what price | What NEVORA already has to build on |
|---|---|---|---|---|
| 1 | **Phone clock-in, with location recorded only at the punch** | Deal loss | All 7; Sling Premium $1.70 to $2 per user [14] | Punch commands with `commandId` and receipts (`lib/clocker/punch-types.ts`) |
| 2 | **Store apps and native push** | Deal loss | All 7 | Capacitor spike PRD approved 17 Oct |
| 3 | **Labor cost and budget on the schedule** | Deal loss (owner buyer) | Sling Premium, Deputy Core $6.50, WIW, Homebase All-in-One $120/location [14][10][9][1] | Wage profiles in native payroll (`lib/payroll/native/contracts.ts`) |
| 4 | **Live overtime and meal-break alerts** | Deal loss, plus legal exposure | Sling, Homebase, WIW, 7shifts [14][2][9][5] | Projected-overtime and break rules (`operational-rules.ts`), B4 Today punch comparison |
| 5 | **Time-off balances and accruals** | Churn: employees ask, managers track it by hand | Connecteam (time-off policies by tier) [12]; Deputy leave balances (17 Oct brief) | Time-off requests and withdrawal |
| 6 | **Two-way team chat (replies, 1:1, group)** | Deal loss in demos; low churn in PR | Free at Sling and Homebase [14][4] | Updates with receipts (`lib/communications`) |
| 7 | **Offline punches at the Clocker** | Churn after the first outage | Homebase (claimed) [2]; Deputy legacy kiosk [11] | Idempotent punch commands; B6 planned |
| 8 | **New-hire paperwork and e-sign** (including PR forms) | Churn at onboarding; payroll errors | Homebase All-in-One, Gusto, 7shifts ($2.99 per package), Connecteam HR [1][18][19][12] | Invitation activation, company-policy acknowledgement |
| 9 | Shift task checklists | Upsell | Connecteam Basic, Sling Business, Homebase $13/location [12][14][1] | Required acknowledgement could carry a checklist |
| 10 | Cost and overtime reports | Upsell | Sling Business, Homebase All-in-One, Deputy Analytics+ [14][1][10] | Insights and CSV |

---

## 6. Positioning and recommended bets

### Positioning

**"Puerto Rico's workforce app: Spanish first, Puerto Rico law built in, every hour on the record."**

- **Against Gusto:** Gusto can't run payroll in PR [17] and its app is English-only. NEVORA hands off to the employer's PR payroll provider today, and native PR calculation is coming.
- **Against Homebase, Sling and When I Work:** they are cheap and broad but generic US tools. NEVORA brings PR rules, PR Spanish, receipts employees can check, and safe company branding at the entry tier.
- **Against Deputy and 7shifts:** they are strong on forecasting and POS, built for restaurants and enterprises. NEVORA is simpler, and its records are more trustworthy.

Don't try to match feature counts. Close the four table-stakes gaps so NEVORA survives the demo, then win on PR.

### Bets for next quarter

Scorecard lines (0 to 2): Usability, Familiarity, Trust, Accessibility, Brand distinctiveness, Durability, Cost, Continuity. These are draft scores for the Product Designer.

| Bet | What ships | Business case | U | F | T | A | B | D | C | Co | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **1. Phone clock-in, location at the punch** | Clock in, break and clock out from the employee's phone. Foreground location checked against a radius per location, never tracked in the background. Same receipt as the Clocker. Manager override needs a reason. Owners can turn it off per location (B2 modules) | Closes gap 1. Turns the location-privacy complaints about Connecteam and Rippling into a NEVORA strength. Works in the PWA now and in Capacitor later | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | **14** |
| **2. Labor cost and live overtime alerts** | Cost per shift, day, location and week on the schedule, from each person's wage. Budget target per location. Projected weekly and PR daily overtime cost. A live alert before someone reaches overtime or misses a meal. A cost line in Insights. Payroll roles only | Closes gaps 3, 4 and 10. Clears the price floor Sling sets at $2. Reuses native wage profiles. Shows money, so it needs P4 seriousness: no celebration, server-confirmed numbers | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | **14** |
| **3. PR compliance pack v1** | Ley 379 meal timing and penalty, daily and weekly overtime (17 Oct brief §7.1). Ley 180 vacation and sick accrual with balances employees can see, in Spanish. Counsel must sign off before release | Gap 5 plus NEVORA's main differentiator. No competitor has it | 2 | 2 | 2 | 2 | 2 | 1 | 1 | 2 | **14** |
| **4. Clocker keeps working through outages (B6)** | An offline queue on the Clocker and phone with two honest states: "Saved on this device" and "Confirmed, receipt". Replays are idempotent | Gap 7. PR grid outages [21][22] make this a sales story competitors can't tell. Connecteam has no offline mode [13] | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **15** |
| **5. Ship the store apps (enabler)** | Finish the Capacitor spike, then the build: native push, passkey or Face ID sign-in, a shift Live Activity | Gap 2. Puts bets 1 and 4 in the store listing. Already approved as a spike | 2 | 2 | 2 | 1 | 1 | 2 | 1 | 2 | **13** |

**Not next quarter:**

- **Two-way chat.** Ship replies on updates first; 1:1 and group chat can follow.
- **Onboarding packet** with PR forms.
- **Checklists.** These ride on required acknowledgement.
- **Not at all unless restaurants become a target:** tips, POS and sales forecasting.

---

## 7. Pricing and packaging observations

| Company | Unit | Tiers seen 2026-10-20 | Where the gaps above sit | Source |
|---|---|---|---|---|
| Homebase | Per location | Basic $0 (1 location, 10 staff); Essentials $30; Plus $70 (promo $0 with payroll); All-in-One $120. Payroll $49 + $6 per employee ($29 for 5 or fewer) | Labor cost, overtime alerts, forecasting and onboarding are on All-in-One. Tips $25 and Tasks $13 per location are add-ons. Hiring Assistant from $99 | [1] primary; checkmarks inferred |
| 7shifts | Per location | Comp free; Essentials ~$39.99 to $44.99; Pro ~$69.99 to $89.99; Premium ~$134.99 to $149.99. Sources conflict | Tips add-on (~$49.99, secondary). Onboarding $2.99 per package unless included. Payroll $6 per employee | [6] secondary, [19] primary |
| When I Work | Per user | Essentials $2.50, Pro $5, Premium $8. Time tracking is an add-on toggle | Auto-scheduling, POS and payroll integrations on Essentials. Custom reporting on Pro. The FAQ conflicts on multi-location price ($2.50 vs $5) | [8] primary |
| Deputy | Per user | Lite $5, Core $6.50, Pro $9. $30 monthly minimum | Forecasting, labor budgets and biometrics on Core. HR $2, Messaging+ $1.95, Analytics+ $1.50, Payroll $8 + $49. AI in every plan | [10] primary |
| Connecteam | Per hub, first 30 users | Free to 10 users. Basic $29, Advanced $49, Expert $99 per hub (annual) plus a per-user charge above 30 | Geofence site caps (10 on Advanced). E-sign document caps (2, 10, 30). Chat is a separate hub | [12] primary |
| Sling | Per user | Free (to 30 users, no time clock); Premium $1.70 to $2; Business $3.40 to $4 | Labor cost, overtime and break compliance on Premium. Kiosk, tasks, auto-assign, reports and premium pay on Business | [14] primary |
| Gusto | Base + per person | Plus $80 + $12, Premium $180 + $22 (secondary). No time tracking on Simple. Kiosk costs extra | Time tools start at Plus. Hiring ATS on Plus (secondary) | [15][18] |

**What this means for NEVORA's packaging.** We found no NEVORA price list in `docs/`.

1. **Charge per location, not per user.** Homebase, 7shifts and Connecteam price by location or hub, which fits multi-location shops with high turnover. Per-user prices like Deputy's (with a $30 minimum) punish seasonal hiring.
2. **The free or entry tier sets the comparison.** Homebase's is 1 location with 10 staff; Connecteam's is 10 users; Sling's is 30 users without a clock. An entry tier with Clocker, phone clock-in and Spanish beats all three on a demo.
3. **Labor cost is the mid-tier upsell everywhere** (Sling Premium, Deputy Core, Homebase All-in-One). Put bet 2 in NEVORA's middle tier.
4. **Compliance moves up-tier at competitors** (Sling Business premium pay, Homebase All-in-One labor-law alerts). In PR, put the PR pack in the base tier. Making legal correctness an upsell erodes trust, and it is the reason to switch.
5. **Add-ons get resented.** Reviews complain about surprise charges (17 Oct brief, theme 7: Connecteam, Sling, Homebase). Keep tiers few and caps visible. Avoid per-document fees like 7shifts' $2.99 onboarding package.
6. **Payroll add-ons cluster at $39 to $49 base plus $6 to $8 per person**, and none serve PR. If native PR payroll ships, it can price at or above this band, because there is no direct substitute in these products.
7. **AI is bundled, not sold.** Deputy includes it in every plan, and Gusto charges nothing for its AI. Don't price NEVORA's explained drafts separately.

---

## 8. Unverified or open

- **Plan checkmarks:** Homebase's checkmarks didn't extract, so tier placements are inferred from feature groupings [1]. 7shifts' pricing page returned no content, so its prices come from conflicting secondary sources [6]. gusto.com/product/time-tools returned 403.
- **Unconfirmed vendor details:** Homebase's offline claim is marketing copy [2]. We found no help article confirming its behaviour.
- **Unconfirmed for specific vendors:**
  - Deputy and When I Work live overtime alerts.
  - Gusto labor cost and checklists.
  - 7shifts checklists.
  - PR payroll support at Homebase, 7shifts and Deputy.
- **PR law:**
  - Ley 180 thresholds come from Littler summaries [23]. The enacted status of the 115-hour figure after the 2017 reform and Act 41-2022 needs counsel.
  - Act 41-2022 was voided in 2023, per the 17 Oct brief citing Morgan Lewis. Its part-time accrual rule may therefore not apply. **Counsel must confirm before bet 3.**
- **Not checked:**
  - PR Christmas bonus (Ley 148).
  - The rest-day law.
  - PR biometric privacy rules.
- **Data gaps:**
  - A PR-specific review sample (es-PR Play reviews, local groups).
  - Reddit, which our tools can't reach.
- **Native payroll status:** we read the code, not a release plan. Treat "in development" as unverified for launch.

---

## 9. Sources

Read 2026-10-20 unless marked otherwise.

1. Homebase pricing (primary): https://joinhomebase.com/pricing
2. Homebase time clock (primary): https://joinhomebase.com/time-clock
3. Homebase integrations (primary): https://joinhomebase.com/integrations
4. Homebase team chat (primary): https://www.joinhomebase.com/free-team-chat-app and https://joinhomebase.com/features/team-communication
   - 4b. Homebase Spanish (primary, undated): https://joinhomebase.com/blog/bienvenido-a-homebase
5. 7shifts on ADP Marketplace, overtime and spacing alerts (primary listing): https://apps.adp.com/en-US/apps/218226/7shifts-restaurant-scheduling-for-run-powered-by-adp/features
   - 7shifts tip pooling (primary): https://www.7shifts.com/tip-pooling/
6. 7shifts pricing (secondary, conflicting): https://pricingsaas.com/companies/7shifts, https://www.costbench.com/changelog/7shifts-price-increase-2026-02/, https://capterra.com/p/123038/7shifts-Restaurant-Scheduling/, https://www.hivedesk.com/7shifts-review
7. 7shifts POS (primary, vendor blog): https://www.7shifts.com/blog/best-scheduling-software-for-toast-pos/ and https://kb.7shifts.com/hc/en-us/articles/53059862558099-What-is-7shifts
8. When I Work pricing (primary): https://wheniwork.com/pricing
9. When I Work time clock (primary): https://wheniwork.com/features/time-clock
10. Deputy pricing (primary): https://www.deputy.com/pricing
11. Deputy offline kiosk (primary, help): https://help.deputy.com/hc/en-au/articles/17262087902351-Using-Deputy-Kiosk-for-iPad-legacy-for-offline-clock-in
12. Connecteam pricing (primary): https://connecteam.com/pricing/
13. Connecteam offline (primary, help): https://help.connecteam.com/en/articles/16287971-does-the-time-clock-support-offline-mode
14. Sling pricing (primary): https://www.getsling.com/pricing
15. Gusto plan prices (vendor guide, via search): https://gusto.com/resources/guides/best-time-tracking-apps; Capterra: https://capterra.com/p/131882/Gusto/pricing/
16. Gusto time tools (primary, 403 on fetch; content via search snippet): https://gusto.com/product/time-tools
17. Gusto payroll terms exclude US territories (primary): https://gusto.com/legal/terms/payroll; help center (17 Oct): https://support.gusto.com/article/210728164125837
18. Gusto hiring and onboarding (primary pages, plan tier from secondary): https://gusto.com/product/hr/hiring-onboarding, https://gusto.com/product/hr/applicant-tracking-system, https://www.noon.ai/blog/articles/317-gusto-pricing-2026
19. 7shifts onboarding packages (primary, KB): https://kb.7shifts.com/hc/en-us/articles/15916165201555-Send-an-Onboarding-Package
20. Homebase compliance (primary): https://joinhomebase.com/labor-law-compliance and https://www.joinhomebase.com/time-clock/break-management
21. PR blackout, 31 Dec 2024 (secondary, public radio): https://www.kaxe.org/news/2024-12-31/power-outage-hits-nearly-all-of-puerto-rico-on-new-years-eve
22. PR outages, 26 May 2026 (secondary, Spanish press): https://www.metro.pr/noticias/2026/05/26/reportan-miles-de-clientes-sin-luz-en-puerto-rico/
23. Ley 180 accrual (secondary, law firm): https://www.littler.com/news-analysis/asap/puerto-rico-secretary-labor-issues-opinion-criteria-vacation-and-sick-leave
24. Predictive scheduling jurisdictions (secondary, vendor research): https://www.clockspot.com/research/predictive-scheduling-laws-by-state
25. Earlier brief with app ratings, launches, review themes, Ley 379 and the app-store route (internal, 2026-10-17): `docs/product/competitive-2026-10.md`
