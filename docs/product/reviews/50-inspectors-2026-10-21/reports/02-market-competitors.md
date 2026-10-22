# 02 Market Strategist — feature-by-feature gap vs Homebase, 7shifts, When I Work, Deputy, Connecteam, Gusto

**Verdict.** NEVORA's scheduling, kiosk clock, timecards, swaps and approvals hold up against the field. The calm Owner/Manager UI is better than most of them. But a buyer comparing feature lists will find five basics missing that every competitor has: employees can't clock in from their own phone, there's no store app, schedules show no labour cost, time off has no balances, and there's no two-way chat. Homebase's **free** plan already covers most of what NEVORA does today (tablet clock-in, scheduling, messaging). NEVORA wins only where it is truly different: Puerto Rico rules and Spanish, verifiable records, and serving as the time layer for PR payroll, which Gusto and Homebase don't serve. Those advantages are only half built.

Builds on `docs/product/competitive-2026-10.md` (17 Oct). That brief covers the trends; this report looks only at the features that win or lose a sale.

## Feature gap matrix (what a buyer sees in a 30-minute demo)

H have · P partial · M missing. Competitor cells come from vendor pricing pages read 2026-10-21 (Homebase, Connecteam, When I Work, Deputy) or from the 17 Oct brief. The 7shifts page lists features without tiers.

| Area | Homebase | 7shifts | When I Work | Deputy | Connecteam | Gusto | **NEVORA (repo evidence)** |
|---|---|---|---|---|---|---|---|
| Scheduling grid, templates, open shifts | H (free) | H | H ($2.50) | H | H (free ≤10) | P (Plus) | **H**: grid, copy week, templates, explainable auto-draft (`src/lib/scheduling/generation/`) |
| Clock-in on employee's own phone | H (Essentials) | H | H (add-on) | H | H (free) | H | **M**: "Use your location's Clocker to record punches" (`src/components/employee-time-panel.tsx:72`). The only punch API is `/api/clocker/[location]/punch` |
| Geofence / location at punch | H (Essentials) | H | H | H | H (Advanced) | H | **M**: no geolocation code in `src/` |
| Shared kiosk | H (free) | H | H | H (face on Core) | H | ? | **H**: Clocker with PIN and a Spanish toggle |
| Timecards, approvals, missed punches | H | H | H | H | H | H | **H**: one row per person, missing clock-out flags (`QAOWNER-timecards-1440.png`), B4 missed punches |
| Labour cost on the schedule | H (All-in-One) | H (forecast) | P (forecast tools) | H (Core budgets) | ? | M | **M**: pay rates are hard-coded by role (`src/lib/employee-compensation.ts:14`, "Temporary role-based reference rates") |
| Overtime in reports | H | H | H | H | H | H | **M**: hard-coded "unavailable" (`src/lib/reports/project.ts:128`) |
| Time off with types and balances | H (Plus accruals) | H | H | H | H (HR Basic, 6 policies) | H | **P**: request, approve, withdraw only. `TimeOffRequest` has no type and no balance (`src/lib/domain.ts:67`) |
| Swaps, cover, pick-up | H | H | H | H | P | M | **H**: swap, callout, open coverage, eligibility reasons (B3) |
| Two-way team chat | H (free) | H | H ($2.50) | H (Lite) | H (free) | M | **P**: one-way posts with required read receipts (`src/lib/communications/types.ts:7`). No replies, DMs or groups |
| Payroll | add-on $49+$6 (50 states + DC) | add-on | partner | add-on via Paycor (US) | integrations | H (**excludes PR**) | **P**: stepper and statements fed by provider imports. No tax engine |
| Hiring / onboarding | H ($99 assistant) | H | M | P (HR add-on $2) | H (HR hub) | H | **M**. Employees are added by hand or by CSV import |
| Reporting | H | H (AI insights) | H (custom on Pro) | H (Analytics+) | H | H | **P**: four tiles and two charts, no cost or overtime (`QAOWNER-insights-1440.png`) |
| Native store app | H | H | H | H | H | H | **M**: PWA only, no Capacitor or Expo in `package.json` |
| Spanish | H | H | H | H | H | M (EN only) | **P**: kiosk and vocabulary slots only. No i18n layer (B5 not started) |

## The 5 gaps that most hurt a sale

1. **No clock-in from the employee's own phone.** This is the first thing an hourly team asks about, and Connecteam's free plan and Homebase Essentials ($30 a location) both include it. NEVORA's employee Home shows a "Clock status" card with no button (`AUDIT-E-emp-home-390.png`). A multi-site or field business (cleaning, security, home care, all common in PR) can't use a fixed tablet.
2. **No App Store or Play listing.** "Download NEVORA" sends people to a website. On iOS, web push works only after the user adds NEVORA to the Home Screen. All six competitors are in both stores with ratings of 4.2 or higher (brief §3).
3. **No labour cost.** Owners buy scheduling software to control wages. NEVORA has no per-employee pay rate (role constants of $16 to $26), no cost on the schedule (`QAOWNER-schedule-1440.png` shows hours only), and overtime is "unavailable". Six people at "56h · over limit" with no dollar figure in a demo is the moment the buyer turns to 7shifts or Deputy.
4. **Time off without types or balances.** Owners expect "Vacation 4.5 days left" on the employee's request screen. Puerto Rico employers must track vacation and sick-leave accrual (Ley 180-1998 as amended; counsel to confirm the accrual table). Every competitor has accrual policies, so this undercuts NEVORA's PR pitch.
5. **No two-way messaging.** Updates are announcements with acknowledgements. Homebase and Connecteam give chat away free. Without it, teams stay on WhatsApp, and coverage gets arranged outside NEVORA where the swap rules can't check it.

Honourable mentions: no hiring (Homebase, Connecteam and Gusto bundle it; partnering beats building), and thin Insights.

## The 3 places NEVORA can win

1. **Puerto Rico compliance in Spanish.** No competitor ships Ley 379 presets: daily overtime after 8 hours, meal-period timing and waivers, second meal (brief §7.1). Gusto Mobile is English-only. The rule engine exists (`src/lib/scheduling/operational-rules.ts`), and the PR week split is tested. What's missing is the visible payoff: PR overtime and meal-penalty hours in timecards and reports, and full Spanish (B5).
2. **Records employees and auditors can trust.** Punch receipts (`src/lib/clocker/punch-types.ts:17`), required-acknowledgement receipts, Today accuracy, missed-punch flags before approval, and schedule drafts that explain their choices. Reviews of Connecteam, Gusto and Rippling complain about silent edits (brief §6, theme 6). Sell this as "every hour has a receipt".
3. **The time layer for PR payroll providers.** Gusto excludes PR payroll, and Homebase payroll covers the 50 states and DC only. NEVORA's stepper, statements and export profiles let a PR employer keep a local payroll provider and still get a modern schedule and time app. Small-business competitors can't make that offer.

## Recommendations

1. **Add self-service clock-in on the employee's phone, behind an Owner setting**: location checked only at the punch and shown to the employee, a manager override with a reason, and the same `PunchReceipt` and idempotent command as the Clocker. *Why:* gap 1, `employee-time-panel.tsx:72`, every competitor in the matrix. Also remove or isolate `src/components/time-clock-widget.tsx`, a local-state "Time Clock" toggle that records nothing and is unused, before anyone wires it into a page. *Impact:* High. *Effort:* M. *Owner:* Backend (punch route, location policy) + UI.
2. **Store pay rates per employee and show labour cost on the schedule and timecards**: weekly cost and cost per day in the grid header, and estimated wages in the timecard row (payroll roles only). Replace `BASE_ROLE_HOURLY_RATES`. *Why:* gap 3, `employee-compensation.ts:14`, `reports/project.ts:128`. *Impact:* High. *Effort:* M. *Owner:* Backend + UI. Product decides who may see rates.
3. **Turn on PR overtime (daily over 8 hours, weekly over 40) and meal-period flags in timecards and Insights**, after counsel signs off. This turns "overtime unavailable" into NEVORA's best demo moment. *Why:* win 1, and it closes part of gap 3. *Impact:* High. *Effort:* M. *Owner:* Product (counsel) → Backend → UI.
4. **Add time-off types and balances**: vacation, sick and unpaid, with accrual rules and the balance shown on the request sheet and the manager decision. Start with the PR statutory defaults. *Why:* gap 4, `domain.ts:67`. *Impact:* High. *Effort:* M–L. *Owner:* Product (rules) → Backend → UI.
5. **Run the Capacitor spike already approved in principle** (brief §8, `docs/product/prd-capacitor-spike.md`), and put store submission on the release plan, not "later". *Why:* gap 2. *Impact:* High. *Effort:* L. *Owner:* Product → UI/Backend.
6. **Ship B5 Spanish before marketing in PR.** Today Spanish covers the kiosk and vocabulary slots only. Pitching "built for Puerto Rico" while manager screens are English-only loses the deal on its strongest point. *Why:* win 1, no i18n layer in `src/`. *Impact:* High. *Effort:* L. *Owner:* Backend + UI.
7. **Add replies and small group threads to Updates**, scoped to a shift or location, keeping the acknowledgement receipts. Full chat can wait. *Why:* gap 5, `communications/types.ts:7`. *Impact:* Medium. *Effort:* M. *Owner:* Backend + UI.
8. **Package wins 2 and 3 as one "Payroll-ready" step**: before export, one screen lists missed punches, PR overtime, meal penalties and unapproved edits, each with a link to the record. *Why:* Gusto, Rippling and Paylocity shipped this check in 2026 (brief §4), and NEVORA already has the data (B4). *Impact:* Medium–High. *Effort:* M. *Owner:* UI + Backend.
9. **Make Payroll settings demo-safe.** The page reads as unfinished to a buyer: "Neutral instructions · compatibility unverified", "Missing configuration is not a zero tax" (`src/components/payroll/payroll-settings.tsx:124,127`; `QAOWNER-payroll-1440.png` is 3,355px tall). Hide unverified bank output until it works, and lead with the PR provider export. Payroll copy is locked, so Jose must approve any rewording. *Impact:* Medium. *Effort:* S. *Owner:* Product → UI.
10. **Don't build hiring. Price against Homebase's free tier.** Put branding, Spanish and receipts in the entry tier, and leave applicant tracking to an integration. *Why:* Homebase Basic $0 covers tablet clock-in, scheduling and messaging; Connecteam is free up to 10 users. *Impact:* Medium. *Effort:* S. *Owner:* Product.

## What's good

- Swaps, callouts, open coverage with plain "why you can't pick this up" reasons (B3), and the single manager Inbox meet or beat When I Work and Homebase.
- Timecards and the schedule grid at 1440 are calmer and denser than most competitors' web apps (`QAOWNER-timecards-1440.png`, `QAOWNER-schedule-1440.png`).
- Receipts throughout (punches, acknowledgements, CSV imports, settings revisions with reasons) are a trust story no competitor markets.

## Not checked / limits

- The browser wasn't allowed. Findings come from the code and the provided screenshots. I didn't open competitor apps or Mobbin.
- 7shifts' pricing page lists features but not which tier has them. Tier placement for 7shifts and Gusto comes from the 17 Oct brief and secondary sources.
- The PR leave-accrual rules (Ley 180) and Ley 379 details need PR labour counsel. I didn't verify the accrual figures.
- I didn't check whether a backend branch outside this worktree already has mobile punches, pay rates or i18n.
- Effort sizes are estimates.
