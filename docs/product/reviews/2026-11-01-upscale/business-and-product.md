# NEVORA business and product review (Nov 1, 2026)

Reviewer: market-strategist-pm, read-only, for Jose. Saved by Claude from the reviewer's report.

## Summary

Release 1 needs no code changes before production. It does need three owner and operations checks. Without them, the first real paycheck could underpay someone or produce no pay statements. The upscale is to finish the three things NEVORA has that competitors don't: Puerto Rico payroll, Puerto Rico labour rules and Spanish.

**Top A and B items:**
1. **A1: make sure the background jobs run in production.** Approving payroll only queues the pay-statement PDFs and the Share step, and push alerts and reminders are queued the same way. Nothing in the repo runs those jobs: there are no crons, and the payroll worker script registers no scheduler. Without a runner, approved payroll produces no statements and alerts never go out. This is ops work for Codex, not code.
2. **A2: a payroll scope check before the first real paycheck.** Jose and his accountant do this. Native payroll pays only regular hours, overtime and the federal true-up. It has no line for tips, paid vacation or sick days, the Christmas bonus (due Nov 15 to Dec 15), the meal penalty or salaried staff. Two more questions: it counts an overnight entry on the day it starts, while the law reads daily overtime by calendar day; and it uses the 2017 withholding tables, while a 2026 tax reform's status is unconfirmed. Anything that applies gets paid outside NEVORA or goes through the accountant's import path.
3. **A3: an uptime alert and a longer database restore window, with one restore test.** There is no monitoring today, and the database keeps only 6 hours of restore history.
4. **B1 and B2: extra pay lines, then year-end totals.**
   - Extra lines for bonus, vacation and sick pay, meal penalty and tips. If this ships before Dec 15, the 2026 bonus can go through NEVORA.
   - Per-employee totals for the W-2PR, due Jan 31, so the accountant doesn't rebuild them by hand.
5. **B3 and B4: Spanish for the five daily employee tasks, and alerts that reach people without the app installed.** The language switch covers only the sign-in pages today. Alerts are web push only, and iPhones need the app on the Home Screen for that.

**Top C items:**
1. **Managed pilots for 3 to 5 Puerto Rico cafés,** one database each, before building billing and shared multi-tenancy. Draft price: $49–79 per location per month, which undercuts 7shifts after its September increase and Homebase's $120 tier.
2. **Puerto Rico payroll as the wedge, run through a licensed payroll or CPA partner** that pays and files. Gusto and the Check payroll engine exclude Puerto Rico companies.
3. **Labour as a share of sales and tip pooling from the POS,** built only after an hours budget (B9) proves owners use it.

Below are the full report text and the evidence behind it.

---

# NEVORA: what the business needs next (business and product half)

- **For:** Jose. **By:** market-strategist-pm. **Date:** 2026-11-01.
- **Question:** "Is there any possibility of upscaling, or anything needed, for NEVORA overall?" This file answers the business and product half. The UI designer covers the screens.
- **Method:** I read the Release 1 handoff, Codex's Nov 1 inspection and product review, earlier gap and senior reviews, and the payroll, notification and setup code, read-only. I also checked the market on the web today. I changed nothing in the repo.
- **Respected decisions:** Lead on hold, light only, tablet + PIN clock-in by default, Updates held. None of them appears as an A item.

## The short answer

**Release 1 can ship without more code changes.** I found no product gap that needs a code change before production. What I did find is a set of **owner and operations checks**, mostly about payroll, that cost no code. One real paycheck run without them could underpay someone or produce no pay statements at all.

**The upscale is clear.** NEVORA has three things Homebase and 7shifts don't have:
- Puerto Rico payroll. Gusto doesn't run Puerto Rico payroll, and several payroll engines exclude Puerto Rico companies.
- Puerto Rico labour rules: daily overtime, the meal period, the seventh day, and the Christmas bonus.
- Spanish.

All three are only half built. Finishing them is how NEVORA becomes clearly better for a Puerto Rico café. More modules (hiring, chat, AI) are not.

**Timing matters this month.** The Christmas bonus must be paid between **Nov 15 and Dec 15**. W-2PR (499R-2) forms are due **Jan 31**. NEVORA's payroll can't add a bonus line or produce year-end totals yet, and both deadlines fall right after go-live.

## (A) Before production: checks only, no code

| # | What | Why (evidence) | Size | Type |
|---|---|---|---|---|
| A1 | **Make sure the background jobs actually run in production.** Approving payroll only *queues* the pay-statement PDFs and the "Share" step. Notifications and reminders are queued the same way. Something has to run the jobs. | Nothing in the repo schedules them: `vercel.json` has no crons, and `scripts/payroll-worker.ts` says it "does not register a daemon/scheduler". Approval queues a `PDF` job (`src/lib/payroll/service.ts:532`) and Share queues `PUBLISH` (`:574`). Push and reminders need someone to call `/api/internal/notifications/dispatch` and `/reminders`. Without a runner, Jose approves payroll and **no statements appear**, and schedule alerts never go out. The Oct 21 risk review flagged this (`docs/product/reviews/senior-analysis-2026-10-21/04-risk-operations.md` R5), and I found no fix in the Release 1 handoff. | S | Ops (Codex). An outside scheduler, or a manual run after each approval in week one, needs no code. |
| A2 | **Payroll scope check before the first real paycheck.** Jose and his accountant confirm that none of the cases below applies to the first pay period. Anything that does is paid outside NEVORA, or that period runs through the accountant/provider import path that already exists. | Native payroll pays only regular hours, overtime and the FLSA true-up (`src/lib/payroll/native/contracts.ts:159`). The cases are listed below the table. | S | Business (Jose + accountant) |
| A3 | **Minimum "someone knows when it breaks" setup.** Add a free uptime alert on the sign-in page and the Clocker page, sent to Jose's phone. Also lengthen the database restore window and run one restore test. | No health route and no error tracking exist (R4 in the senior review, still open). The privacy policy itself says the database "keeps a restore history of six hours" (`src/lib/legal/policies.ts`). If a bad payroll write is found the next morning, it can't be undone. A down site at 6 a.m. is found by an employee at the tablet. | S | Ops and pricing (Codex + Jose). Plan and monitor settings, no app code. |

**The A2 cases:**
- **Tips.**
  - Tips are still taxable in Puerto Rico ([News is my Business](https://newsismybusiness.com/puerto-rico-still-taxes-tips-despite-us-exemption-plan)), and employers report them for FICA on Form 941 ([IRS Topic 903](https://irs.gov/taxtopics/tc903)).
  - The minimum-wage check covers untipped staff only and blocks anyone below $10.50 (`src/lib/payroll/native/minimum-wage.ts:4`). A barista paid with a tip credit can't be run.
- **Paid vacation and sick days.** Puerto Rico requires vacation and sick leave accrual. The Ley 4-2017 rules apply again since Ley 41-2022 was voided ([Ogletree](https://ogletree.com/insights-resources/blog-posts/employee-benefits-and-rights-in-puerto-rico-what-to-know-now-that-law-41-2022-has-been-declared-null-and-void/)). Approved time off pays **$0** on a NEVORA statement today.
- **Christmas bonus.**
  - Due Nov 15 to Dec 15, with a 50% penalty if late ([Jackson Lewis, Nov 2025](https://www.jacksonlewis.com/insights/avoiding-naughty-list-christmas-bonus-compliance-puerto-rico-employers)).
  - NEVORA can't add it, and it doesn't hold the Oct 2025 to Sep 2026 hours the thresholds need (700 h, or 1,350 h for post-2017 hires). Pay it outside NEVORA this year.
- **Meal-period penalty.** Jose chose "warnings only" on Oct 25. Puerto Rico law still owes pay for a missed or late meal, and native payroll has no line where the owner could add it.
- **Cross-midnight shifts.**
  - NEVORA counts a whole entry on the day it starts. Summaries of the law say daily overtime is over 8 h in a calendar ("natural") day, unless the employer gave 5 days' written notice of a different 24-hour cycle ([Dayforce](https://www.dayforce.com/blog/puerto-rico-changes-employment-law-wage-hour), [Jackson Lewis](https://www.jacksonlewis.com/print/pdf/node/10698)).
  - An overnight entry followed by a day shift could under-count overtime. It's rare at a café, but check every cross-midnight timecard by hand until counsel answers (handoff §1.3 already asks for counsel).
- **Salaried staff.** Earnings are hourly only.
- **2026 withholding tables.**
  - NEVORA uses Hacienda's 2017 withholding tables (`rules/pr-2026.ts`).
  - A 2026 Puerto Rico tax reform (PS 912) was in the legislature this year, and I could not confirm whether new employer tables are in force ([Senado](https://www.senado.pr.gov/senado-evala-proyecto-de-reforma-contributiva-para-dar-alivio-a-la-clase-trabajadora)). The accountant should confirm before the first paycheck.

**Not A, on purpose:** Spanish, onboarding, time-off balances, labour cost and messaging. They matter for selling NEVORA, but Jose's own team can launch without them. Codex's Nov 1 review reaches the same split ("protect the working core and complete its journeys").

## (B) Release 1.1, ranked

| # | What | Why (evidence) | Size | Type |
|---|---|---|---|---|
| B1 | **Extra pay lines in payroll:** one-time pay (Christmas bonus), paid vacation and sick hours, meal-period penalty, and reported tips. Each line is entered by the owner and shown on the statement. | It closes the A2 gaps for good. Without these lines, a real café can't run every paycheck in NEVORA, and the paystub doesn't show what the employee was paid. Bonus detail: up to $600 is exempt from Puerto Rico income-tax withholding but still pays FICA ([Littler](https://www.littler.com/news-analysis/asap/puerto-rico-employers-cannot-withhold-income-taxes-christmas-bonuses-600-or-less)). If 1.1 ships before **Dec 15**, the 2026 bonus can go through NEVORA. | M–L | Backend + UI; accountant sign-off |
| B2 | **Year-end totals for the accountant:** per-employee wages, Social Security, Medicare, SINOT and Puerto Rico withholding for the 499R-2/W-2PR and the federal 941. Include any amounts from before NEVORA. | W-2PR is due to employees by **Jan 31, 2027**. Hacienda published the 2026 W-2PR e-file spec in Oct 2026 ([Pub. 26-01](https://hacienda.pr.gov/sites/default/files/publicaciones/2026/10/publication_26-01.pdf)). NEVORA already keeps YTD figures (`native/ytd.ts`). This must land by early January, or the accountant rebuilds totals by hand. | M | Backend + UI |
| B3 | **Spanish for the five daily employee tasks:** Home, Schedule, Time and fixes, Requests, Pay. | Today the language switch says "For the sign-in pages" (`src/components/employee-mobile/profile.tsx:24`), and the app sets `lang="en"`. Gusto Mobile, Rippling and Sling list English only (`docs/product/competitive-2026-10.md` §3). This is the cheapest visible reason to pick NEVORA in Puerto Rico. Codex ranks it in its top five. | M | UI (+ native-speaker review) |
| B4 | **Alerts that reach people without the app installed:** email first, then SMS or WhatsApp links, for "schedule published", "your shift changed" and "request decided". | Alerts go by web push only; `src/lib/notifications/` has no email or SMS channel. On iPhone, push needs the app added to the Home Screen. Staff who miss a change miss a shift, and late arrivals and no-shows are what owners judge a scheduling app on. | M | Backend + UI |
| B5 | **First-week setup checklist:** location and positions, people and access, **company policies** (rest, max shift, overtime routing), Clocker tablet and PINs, payroll settings, first published week. | Home's setup card tracks only 2 items (`src/lib/action-center/setup.ts:5`). Company policies start as "UNKNOWN" (`src/lib/shift-changes/policy.ts:18`), so swaps and open-shift pickups aren't checked for overtime until the owner finds that page. This is Codex's top NEXT item. | M | UI + read model |
| B6 | **Prepare-by deadline and payroll blockers list** (already on Jose's 1.1 list). | Separates payday from the owner's working deadline, and links each blocker to its fix. | S–M | UI + backend |
| B7 | **Pay amounts in the employee Pay list** (gross and net from the published statement). | Employees want to know what they were paid without opening a PDF. The data exists on the Owner side; the employee read lacks it (handoff §5). | S–M | Backend + UI |
| B8 | **Vacation and sick balances** (Ley 180 accrual: 130 h/month threshold, rates by tenure and company size), shown on time-off requests. | Owners can approve days an employee hasn't earned, and employees can't see what they have. Homebase puts accruals in Plus; Deputy shipped balance recalculation in Sep–Oct 2026 ([whatsnew.deputy.com](https://whatsnew.deputy.com/)). Needs counsel on the post-2017 tiers. | M–L | Backend + UI; counsel |
| B9 | **Weekly hours budget per location, shown before Publish** (hours only, no dollars yet). | The labour-budget model exists but always returns "not configured" (`src/lib/business-improvements/labor-budget/model.ts`). Homebase sells labour cost only in its $120 tier. A café's top cost lever is hours. | M | UI + backend |
| B10 | **Staff CSV import** with preview, no automatic invitations. | The parser exists with no screen (`src/lib/imports/csv.ts`). Needed the day a second company is onboarded. Less urgent for Jose's own team. | M | UI + backend |

Small business-logic fixes worth bundling into 1.1:
- **Callout during held edits.** A sick call on a shift with unpublished edits can't be approved until the owner publishes changes (handoff §1a). At 6 a.m., that forces a publish decision under pressure. Offer "publish this shift's changes and approve" in one step.
- **Payroll copy.** Say plainly "NEVORA calculates and prepares; you or your accountant pay and file taxes." The app already says "A file only. NEVORA doesn't send money." for payment instructions. Tax filing isn't stated the same way.

## (C) Later and strategic

| # | What | Why | Size | Type |
|---|---|---|---|---|
| C1 | **Sell to 3 to 5 Puerto Rico cafés as managed pilots,** one database and one deployment each (already the approved operator model, `docs/product/multi-company-database-per-company-20261021.md`). Invoice by hand, then build billing and shared multi-tenancy once pilots pay. | A shared database is "a new project, not a feature to switch on" (`saas-tenant-diagnosis-2026-10-20.md`). Pilots prove price and demand first. Draft price: **$49–$79 per location per month** with Spanish and Puerto Rico rules included, plus a per-employee payroll fee. That sits under 7shifts Pro ($79.99–$89.99 after its Sep 2026 increase, [pricingsaas](https://pricingsaas.com/companies/7shifts/diffs/2026W40)) and Homebase All-in-One ($120 + payroll $49 + $6/employee, [Homebase pricing](https://www.joinhomebase.com/pricing)). | L | Business/pricing + backend |
| C2 | **Make Puerto Rico payroll the wedge:** tax deposits, returns and direct deposit through a licensed Puerto Rico payroll or CPA partner. NEVORA prepares; the partner moves money and files. | Gusto excludes Puerto Rico (Oct brief). Embedded payroll engines like Check list Puerto Rico companies as unsupported ([Check](https://help.checkhq.com/1d74274a2e7580eb9da2d040fb490507)), and so does QuickBooks Payroll. The gap is real, but moving money is a regulated business. Partner, don't build. | L | Business + backend |
| C3 | **Labour as a percentage of sales and tip pooling from the POS** (Square, Clover or Toast; confirm which ones Puerto Rico cafés use). | 7shifts and Homebase sell both: Homebase Tip Manager is $25/location; 7shifts tips are Premium or a $49.99 add-on (secondary sources). Build after B9 proves the hours budget is used. | L | Backend + UI |
| C4 | **Store apps through the Capacitor spike** (already approved as a two-week spike). | All competitors are in both stores, and employees expect to "download the app". It also fixes iPhone push. | L | UI + native |
| C5 | **Release the Owner AI advisor read-only, at no extra price** (Codex's backend on `development`). | Deputy includes AI in every plan; Homebase charges $99/month for its hiring AI. A "what blocks payroll this week" explainer fits NEVORA's trust story. No AI that changes pay. | M | Backend + UI |
| C6 | **Outage-ready Clocker:** first a clear readiness and fallback guide, then offline punches only if outages are common. | Power and internet cuts in Puerto Rico are a sales story. Deputy's new clock app needs connectivity (Codex competitive review). | M → L | UI + backend |
| C7 | **Questioning one decision: Company Updates (held).** I suggest reopening it narrowly in 1.2 as "shift notes with read receipts", not a feed. | It's already built, with receipts. Team communication is in Homebase's $30 Essentials tier, and owners otherwise fall back to WhatsApp groups that NEVORA can't audit. B4 covers part of the need, so this can wait. | S–M | UI + review |

**Not recommended:** hiring suites, general chat, earned wage access, biometrics or facial recognition, and gamification. Codex reaches the same view.

## Business-logic risks in what exists

| Risk | Where | Bucket |
|---|---|---|
| Pay statements and alerts never generate if no job runner is set up | `scripts/payroll-worker.ts`, `vercel.json` | A1 |
| Approved vacation and sick days pay $0; tips, bonus and meal penalty can't be paid | `native/contracts.ts:159` | A2 → B1 |
| Overnight entries counted on their start day may under-count calendar-day overtime | `provisional-policy.ts` (`daily`), handoff §1.3 | A2 (counsel) |
| Meal warnings with no way to pay the penalty | Jose's Oct 25 decision; no earning line | A2 → B1 |
| Withholding tables from 2017; 2026 reform status unknown | `rules/pr-2026.ts` | A2 (accountant) |
| Swaps and pickups not checked for overtime until company policies are set | `shift-changes/policy.ts:18` | B5 |
| Time off approved with no balance check | no accrual code in `src/lib` | B8 |
| Callout approval tied to publishing held edits | handoff §1a | B (small fix) |
| 6-hour restore window for payroll and time records | `legal/policies.ts` | A3 |

Things I checked that are **fine**: the $10.50 minimum wage is enforced; the seventh-day premium and the "keep pre-2017 better terms" option exist; the workweek uses the statutory Monday 00:01 boundary; drafts made before V11 read as stale; the payment file is clearly labelled "doesn't send money".

## Market changes since the October brief

| Date | Company | What | Why it matters | Source |
|---|---|---|---|---|
| Sep 21–28, 2026 | 7shifts | Pro $79.99 → $89.99, Premium $134.99 → $179.99, Essentials removed (listings conflict; one shows Premium back at $134.99 on Oct 5) | Price-sensitive owners are open to switching | [pricingsaas](https://pricingsaas.com/companies/7shifts/diffs/2026W40) (secondary) |
| 2026 (Q1) | 7shifts | Pro capped at 60 employees per location | Tier squeeze | pricingsaas (secondary) |
| Current | Homebase | Plus shown at $0 with 6 months of free payroll; Tip Manager $25/location; labour cost only in All-in-One ($120) | Bundling war on payroll; labour cost stays premium | [joinhomebase.com/pricing](https://www.joinhomebase.com/pricing) (primary) |
| ~Oct 18–25, 2026 | Deputy | Managed Areas (limit what a manager can schedule and approve); junior rates assigned automatically | Permission depth keeps growing | [whatsnew.deputy.com](https://whatsnew.deputy.com/) (primary, relative dates) |
| ~Sep–Oct 2026 | Deputy | Break policy, leave caps, leave balances that follow working hours, time off in lieu | Rules and leave are the 2026 front. Generic, no Puerto Rico presets | [whatsnew.deputy.com](https://whatsnew.deputy.com/) |
| Oct 2026 | Hacienda | Publication 26-01: 2026 W-2PR e-file format | Year-end is coming (B2) | [hacienda.pr.gov](https://hacienda.pr.gov/sites/default/files/publicaciones/2026/10/publication_26-01.pdf) |

## Limits

- I found no Homebase, 7shifts, Deputy or Square page saying whether they run Puerto Rico payroll. Only Gusto's exclusion (Oct brief) and the Check and QuickBooks exclusions are confirmed.
- 7shifts prices come from secondary trackers that disagree.
- Puerto Rico law points come from law-firm summaries. The official DTRH PDF couldn't be read as text here. Every rule needs counsel or a CPA before it changes pay.
- I did not run the app or any test. Code facts come from reading the source in the release worktree at 9553e728.
- I didn't use Mobbin, because this half of the review is about business rather than screens.
- Codex's job runner may live outside this repo. If Codex already has one, A1 is just a confirmation.

## Key files

- src/lib/payroll/service.ts (lines 532, 574: payroll approval and Share only queue jobs)
- scripts/payroll-worker.ts (no scheduler)
- vercel.json (no crons)
- src/lib/payroll/native/contracts.ts (line 159: earnings are regular, overtime and FLSA true-up only)
- src/lib/payroll/native/minimum-wage.ts (untipped staff only)
- src/lib/payroll/native/provisional-policy.ts (overnight start-day rule)
- src/lib/payroll/native/rules/pr-2026.ts (2017 withholding tables)
- src/lib/legal/policies.ts (6-hour restore history)
- src/lib/action-center/setup.ts (setup card tracks 2 items)
- src/lib/shift-changes/policy.ts (line 18: company policies start as UNKNOWN)
- src/components/employee-mobile/profile.tsx (line 24: Spanish covers sign-in pages only)
- (Codex workspace) and competitive-analysis.md (Codex's Nov 1 recommendations)