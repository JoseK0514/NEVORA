# Switching On NEVORA's Idle Revenue Engine

NEVORA has plenty of software. What it lacks is a working business. On the `claude-codex-collab-nevora` branch, VELANI LLC has built roughly 150,000 lines of product code: scheduling with automatic drafts, kiosk punching, timecards, pay statements, self-service signup, Stripe billing and an AI owner advisor. Yet **all 17 feature flags default to off**, signup admission defaults to closed, the code refuses a production billing origin, and no production release of the current code is recorded. Self-service revenue is therefore structurally $0, and the growth pulse could read **none of its five views**.

The largest gap in business logic is the one the team calls its "#1 selling point." In the default configuration, NEVORA does not apply Puerto Rico's daily overtime, meal-period penalties, leave accrual or Christmas-bonus rules. Those are exactly the liabilities its first market buys software to manage.

Pricing is the second problem. The encoded price of **$19 or $29 per company per month** is a third to a seventh of what Homebase, 7shifts or Deputy charge a three-location, 30-person chain. It sits in the price band with the worst retention, and it is close to the cost of running one always-on database per tenant. Competitors scaled by pairing a cheap scheduling entry product with point-of-sale (POS) distribution, then adding payroll, tips and franchise deals. In the past month, several of them shipped AI that acts with owner approval, at no extra charge.

NEVORA's opening is real. No national vendor encodes Puerto Rico labor law or runs Puerto Rico payroll, so a Spanish-first, Puerto Rico-law-aware product that feeds local payroll bureaus has the lane to itself. Two things must change before NEVORA can take it. First, security: GitHub reported **11 open Dependabot alerts, 2 of them critical**, on the default branch today, and the business-to-business (B2B) trust file lacks MFA, a data processing agreement (DPA) and an accurate sub-processor list. Second, and more binding, approval bandwidth through one founder; engineering is not the constraint.

The roadmap follows from that:

- **Next 30 days:** secure, ship and charge the one live customer at a per-location price.
- **By 90 days:** sell a counsel-reviewed Puerto Rico compliance pack in Spanish.
- **By 180 days:** open bureau and POS channels and build fleet tooling that survives 100 tenants.

## Seventeen default-off switches keep a finished product out of market

NEVORA's core is real and unusually well engineered. With no feature flag, a single-company deployment offers:

- Employee-ID sign-in with Owner, Manager, Lead and Employee roles checked on the server;
- week scheduling with templates and copy-week;
- automatic "Build Week" and "Fill Gaps Only" drafts;
- availability, time off and a swap-and-callout marketplace;
- timecards with corrections and management close;
- an hours export in a custom or ADP RUN CSV layout;
- reports and calendar feeds.

Sources: ([README](../README.md); [payroll-export model](../src/lib/payroll-export/model.ts)). The October 50-reviewer inspection found the integrity core sound: server-derived proofs, parameterized SQL, BigInt money arithmetic, idempotency receipts and append-only ledgers ([code inspection](../docs/product/code-inspection-2026-10-21.md)). **About 149,000 lines of TypeScript product code sit in `src/`, matched almost line for line by about 150,000 lines of tests** ([src/](../src/)).

The product a buyer would recognize, however, is switched off. **Each of the 17 typed flags is true only on the exact string `"true"`, and `.env.example` sets every one to false.** It also closes onboarding admission, caps new projects at zero per day and disables push and kiosk punching ([feature-flags.ts](../src/lib/feature-flags.ts); [.env.example](../.env.example)). A default deployment can schedule staff. It cannot record their hours at the kiosk, issue pay statements, send push notifications, bill, accept signups or run the advisor. The Nov 15 environment matrix marks every flag "unobserved" in both hosted development and production ([feature environments](../docs/handoffs/2026-11-15-feature-environments.md)).

Three features are held harder still. Announcements ("Updates"), conversations and manager reminders run only when the database is on loopback **and** its name matches disposable-test patterns, because the communications retention decision (D04) "remains unapproved" ([communications/sql.ts](../src/lib/communications/sql.ts); [operations closeout](../docs/product/operations-closeout-2026-11-11.md)). Conversations and staff checklists have complete API trees that no screen imports ([Nov 14 findings](../docs/product/review-2026-11-14/findings-by-category.md)).

| State | What sits there | Commercial consequence |
|---|---|---|
| Live by default | Scheduling and auto-drafts, availability, time off, swaps, timecards, corrections, hours export, reports, kiosk setup, policies, branding | A sellable core, but no current production release is recorded |
| Built, flag-gated (default off) | Kiosk punching, pay statements, web push, passkeys, billing, self-service onboarding, mobile access, the Rondo advisor | A default deployment cannot capture time at the kiosk or charge money |
| Built, hard-held in code | Announcements, conversations, manager reminders | No team communication in any hosted environment |
| APIs without screens | Conversations, opening and closing checklists | Daily operating routines unusable |
| Planned only | Puerto Rico rules pack, offline punch queue, leave accrual, labor cost, SMS, phone clock-in | Core Puerto Rico and cost-control promises unmet |

None of the current work has reached customers. Release 1 passed its local gate on Nov 4 with 10,514 unit tests, but no later document records a production promotion ([gate summary](../docs/handoffs/2026-11-04-release-1-gate-summary.txt)). The Nov 16 backend record reads "HELD / NOT VERIFIED for hosted operation" and `hostedAcceptance: NOT_VERIFIED` ([phase 5 readiness](../docs/handoffs/2026-11-16-backend-phase5-operating-readiness.md); [remaining dependencies](../docs/handoffs/2026-11-16-backend-phase5-remaining-dependencies.json)). On Nov 9 there was "no verified usable production sign-in URL," the product domain `nevora.team` was parked, and the `nevora` Vercel project's latest production deployment was in error ([website-backend contract](../docs/handoffs/2026-11-09-claude-website-backend-contract.md)).

Between Oct 19 and Nov 14, **none of `nevora`'s production-target deployments reached READY, and 141 of 274 deployments across the nine NEVORA and VELANI projects ended BLOCKED or ERROR** ([Vercel deployments API](https://api.vercel.com/v6/deployments?teamId=team_Lzbw410WwXGWHTuUXuamRI1N)). In October the production database sat at roughly migration 0002, against the 79 migration files that now exist ([ops-release review](../docs/product/reviews/50-inspectors-2026-10-21/reports/46-ops-release.md)). The live Puerto Rico coffee drive-through therefore most likely runs an older build from a legacy project. The docs point that way but do not confirm it.

The acquisition path is closed at every step:

- The bare domain sends visitors to a login page ([page.tsx](../src/app/page.tsx)).
- The marketing site is a separate Shopify theme outside the repository.
- The signup screens are absent from the checkout ("no honest browser wizard acceptance yet") ([onboarding readiness](../docs/handoffs/self-service-onboarding-readiness.md)).
- The code returns no billing API origin except in local or staging test mode ([central-billing-config.ts](../src/lib/commerce/central-billing-config.ts)).
- Stripe Tax stays disabled until tax registrations are confirmed ([commerce README](../services/commerce/README.md)).
- The $19 and $29 prices are labeled "sandbox/proposed fixtures, not newly approved commercial prices" ([contract §5](../docs/handoffs/2026-11-09-claude-website-backend-contract.md)).

The team's own governance verdict is "NO-GO for public Production" ([contract](../docs/handoffs/2026-11-09-claude-website-backend-contract.md)).

Engineering capacity is not the cause. **About 78% of tracked files and 94% of repository bytes sit in `docs/`**: mostly 7,001 evidence screenshots, logs and JSON receipts, plus 638 handoff documents. Fifteen executive-governance skills require Jose's explicit authorization for every activation, spend or deployment ([docs/](../docs/); [AGENTS.md](../AGENTS.md); [README branch workflow](../README.md)).

The cost shows in the release record. Phase 5 went through at least five publication candidates because of single browser or accessibility flakes, and each failure needed a new amendment and a 14-cell replay ([phase 5 publication](../docs/handoffs/2026-11-16-backend-phase5-development-publication.md)). One fictional AI comparison was fenced at $5 of a $200 credit, with a ledger that "cannot be overwritten" ([credit migration](../docs/handoffs/2026-11-15-rondo-claude-credit-migration.md)). AI agents do the engineering, and Jose plus one office backup cover on-call ([on-call runbook](../docs/runbooks/renewal-and-on-call.md)). **The binding constraint on revenue is approval bandwidth through one person.** That rigor suits payroll-grade trust. With one customer, it mostly delays learning.

## Puerto Rico's own wage rules are the largest missing business logic

NEVORA aims to be sold "to many companies," with Puerto Rico first because "local labour rules and full Spanish set it apart" ([TEAM-RULES](../docs/product/TEAM-RULES.md)). Puerto Rico's hour rules are the most complex of any US jurisdiction relevant here:

- overtime after **8 hours in a calendar day** as well as after 40 hours in a week ([Littler](https://www.littler.com/news-analysis/asap/puerto-rico-approves-major-reform-its-employment-laws));
- a meal window and a penalty for working through it ([Ogletree](https://ogletree.com/insights-resources/blog-posts/employee-benefits-and-rights-in-puerto-rico-what-to-know-now-that-law-41-2022-has-been-declared-null-and-void/));
- a seventh-day premium ([Littler guidelines](https://www.littler.com/publication-press/publication/guidelines-interpretation-puerto-ricos-employment-legislation-0));
- a monthly hours gate for leave accrual;
- a statutory Christmas bonus;
- a hire-date split at **January 26, 2017** that changes five calculations.

The 2022 reform that would have altered these rules was voided in March 2023, so the 2017 rules govern ([Jackson Lewis](https://www.jacksonlewis.com/insights/federal-court-strikes-down-amendments-puerto-rico-2017-employment-law-reform)). The minimum wage has been **$10.50 since July 1, 2024** ([FRED](https://fred.stlouisfed.org/series/STTMINWGPR)).

| Rule | What the law requires | NEVORA in its default configuration |
|---|---|---|
| Daily and weekly overtime | Over 8 hours in a calendar day or 40 in a week, generally at 1.5× ([Jackson Lewis](https://jacksonlewis.com/insights/what-puerto-rico-labor-secretarys-new-overtime-interpretation-means-employers)) | Not classified; the native engine that knows it is off and limited to 2026 |
| Meal period | Must start between the end of hour 2 and the start of hour 6; worked meal paid at 1.5× for post-2017 hires ([Ogletree](https://ogletree.com/insights-resources/blog-posts/employee-benefits-and-rights-in-puerto-rico-what-to-know-now-that-law-41-2022-has-been-declared-null-and-void/)) | No detection or penalty anywhere |
| Seventh day | Rest-day work at 1.5× (hired on or after Jan 26, 2017) or 2× (earlier) ([Littler](https://www.littler.com/publication-press/publication/guidelines-interpretation-puerto-ricos-employment-legislation-0)) | Native engine only, off by default |
| Vacation and sick accrual | Accrues only in months with ≥130 hours worked; sick leave 1 day per month ([Ogletree](https://ogletree.com/insights-resources/blog-posts/employee-benefits-and-rights-in-puerto-rico-what-to-know-now-that-law-41-2022-has-been-declared-null-and-void/)) | No leave types, balances or accrual |
| Christmas bonus | Hours year Oct 1–Sep 30; eligibility at 1,350 hours (post-2017) or 700 (earlier); paid Nov 15–Dec 15; 50–100% late penalties ([Jackson Lewis](https://www.jacksonlewis.com/insights/avoiding-naughty-list-christmas-bonus-compliance-puerto-rico-employers)) | No code at all |
| Minors | Work permit under 18; ages 16–17 barred from 10 p.m. to 6 a.m. per secondary sources ([DTRH Ley 230](https://trabajo.pr.gov/docs/Normas_del_Trabajo/Leyes/Ley_Num_230_12_mayo_1942_Empleo%20de%20Menores.pdf); [minimum-wage.org](https://www.minimum-wage.org/puerto-rico/child-labor-laws)) | No date of birth stored |
| Lactation breaks | Paid, with private space (Acts 29-2025 and 87-2025) ([Jackson Lewis](https://www.jacksonlewis.com/insights/puerto-rico-new-act-29-2025-essential-employer-obligations-breastfeedingpumping-activities); [McConnell Valdés](https://www.mcvpr.com/newsroom/publications/PR-Lactation-Code)) | Break types carry no paid flag |

Against these rules, the default product does nothing:

- **Overtime is not classified.** Payroll defaults to "external" mode, and the paid-time export states that "no pay categories, overtime, rates or legal eligibility are inferred" ([calculation-mode.ts](../src/lib/payroll/calculation-mode.ts); [paid-time.ts](../src/lib/payroll-export/paid-time.ts)). Insights hard-codes overtime as unavailable ([reports/project.ts](../src/lib/reports/project.ts)).
- **Meal penalties exist nowhere.** The native engine even fails an entire run when it sees an unpaid meal shorter than 30 minutes ([native/time.ts](../src/lib/payroll/native/time.ts)).
- **The only daily-overtime code is about to expire.** It is a provisional native calculator that no accountant has validated, it is off by default, and it **hard-stops on any payday outside 2026, six weeks from now** ([calculate.ts](../src/lib/payroll/native/calculate.ts)).
- **Leave has no structure.** Requests carry no type, balance or accrual ([migration 0026](../db/migrations/0026_tenant_ownership_expand.sql)).
- **Key dates are missing.** No hire date, termination date or date of birth is stored ([0001_initial.sql](../db/migrations/0001_initial.sql)).
- **Breaks need manual attestation.** Break types lack a paid flag, so every break must be marked paid or unpaid one at a time at export, up to 1,000 per command ([paid-time.ts](../src/lib/payroll-export/paid-time.ts)).

The team's own remaining-work list calls the Puerto Rico rules pack "the #1 selling point" and holds it for counsel review ([FIXED-AND-REMAINING](../docs/product/FIXED-AND-REMAINING.md)). The calendar makes the gap urgent. **Puerto Rico employers are inside the Nov 15–Dec 15 Christmas-bonus payment window today.** The deadline to claim the insufficient-profits exemption is Dec 1 ([Jackson Lewis](https://www.jacksonlewis.com/insights/avoiding-naughty-list-christmas-bonus-compliance-puerto-rico-employers)), and the product cannot tell an owner which employees crossed the hours threshold.

Cost control is the second missing layer:

- **No working labor cost.** Labor rates and budgets can be saved, but `laborBudgetReadiness()` always returns `not_configured`, with no estimated cost or variance. The only wage table is dead code with hard-coded role rates of $16 to $26 ([labor-budget model](../src/lib/business-improvements/labor-budget/model.ts); [employee-compensation.ts](../src/lib/employee-compensation.ts)).
- **Demand is static.** It is a fixed grid of minimum staff per time window. Sales data enters only through the default-off advisor's manual CSV import ([business evidence handoff](../docs/handoffs/2026-11-16-rondo-business-evidence-backend.md)).
- **Protections are silent by default.** Overtime warnings are weekly, opt-in and based on scheduled rather than recorded hours. Every per-employee rule (rest, maximum shift, breaks, projected overtime) defaults to `UNKNOWN`, so an owner who never opens Settings gets none of the protection the code supports ([operational-rules.ts](../src/lib/scheduling/operational-rules.ts); [shift-changes/types.ts](../src/lib/shift-changes/types.ts)).

The stakes are higher in Puerto Rico than elsewhere. The island's minimum wage rose from $8.50 in January 2023 to $10.50 in July 2024, about 24% ([FRED](https://fred.stlouisfed.org/series/STTMINWGPR)). Nationally, only 42% of restaurant operators turned a profit in 2025 ([WTOP](https://wtop.com/business-finance/2026/02/chief-economist-says-42-of-restaurants-did-not-turn-a-profit-last-year)).

Several smaller pieces of business logic are also missing. A shift cannot exist without an assigned employee, so coverage gaps cannot be posted for pickup ([0001_initial.sql](../db/migrations/0001_initial.sql)). There is no tip handling, no blocking of hours for minors, no tracking of certifications or food-handler cards, and no hiring paperwork. The November review deliberately deferred POS integration, tip pooling, GPS clock-in and HR-suite features as "complexity without enough value now" ([Nov 14 findings](../docs/product/review-2026-11-14/findings-by-category.md)). That call holds for the HR suite. It is weaker for open shifts and tips, which drive-through coffee operators handle daily, and wrong for the statutory items, where the owner carries the legal liability.

Because NEVORA displays pay amounts calculated elsewhere, it can deliver these rules as **hours classification and alerts** ("meal penalty: 0.5 h at 1.5× owed") without ever computing tax. That output is exactly what a Puerto Rico payroll bureau needs from a time system. Hire date and date of birth are small schema additions and must come first.

## A real operating week still runs into a dozen dead ends

The first live week would expose time-capture gaps before anything else:

- **Early clock-ins are not matched.** An early punch becomes `UNMATCHED` because "no grace/tolerance window is applied" ([schedule-candidates.ts](../src/lib/clocker/schedule-candidates.ts)).
- **Stray punches go unflagged.** In November browser runs, the kiosk accepted an 11:24 PM clock-in with no shift, and a 9:02 AM punch still showed "Clocked in" at 10:52 PM with no flag ([Nov 14 findings](../docs/product/review-2026-11-14/findings-by-category.md)).
- **The fixing policy is undecided.** Toggles that would block early punches or close forgotten ones are an open backend item awaiting a product decision ([inspection-fixes handoff](../docs/handoffs/2026-11-14-claude-to-codex-inspection-fixes.md); [backend remaining](../docs/handoffs/2026-11-15-inspection-backend-remaining.md)).
- **The kiosk has no offline mode.** "A reload without Wi-Fi shows the browser's error page," rated High ([Nov 14 findings](../docs/product/review-2026-11-14/findings-by-category.md)).
- **Buddy-punch prevention is thin.** It rests on Employee ID plus PIN, because punch photos run only on isolated staging ([photo runtime](../src/lib/clocker/photo-server/runtime.server.ts)).
- **A lapsed trial locks the kiosk.** Once billing is on and a trial lapses, **the owner's first signal is a lockout that blocks new clock-ins** ([commerce-policy.server.ts](../src/lib/clocker/commerce-policy.server.ts)).

Small and multi-location shops then hit permission dead ends:

- **Single-manager shops get stuck.** Approving a correction, reviewing a timecard and closing an open entry all require a reviewer other than the subject, which assumes at least two managers ([migration 0058](../db/migrations/0058_delegated_time_corrections.sql)).
- **Owners and Managers cannot see their own time.** They cannot view their own hours or request their own corrections, because those routes admit only Employees and Leads ([my-time route](../src/app/api/employee/my-time/route.ts)).
- **Store managers cannot run their stores.** Location-scoped Managers, the natural role for one manager per store, see only Home, Profile, Schedule and Team. They cannot publish, approve hours or decide time off, so "the Owner still does every approval." Reviewers rated this High for multi-location customers, and the decision is pending ([navigation.ts](../src/lib/navigation.ts); [Nov 14 findings](../docs/product/review-2026-11-14/findings-by-category.md)).

The employee path holds the adoption blockers. Staff without email "can never sign in," invitation delivery is off by default, and "Send invitation" fails ([Nov 14 review](../docs/product/review-2026-11-14/README.md)). Spanish covers sign-in, the kiosk, emails, statements and billing, but **every signed-in page renders in English**. No language is stored per person, and full translation was estimated at 8–11 engineering weeks ([FIXED-AND-REMAINING](../docs/product/FIXED-AND-REMAINING.md); [direction](../docs/product/direction.md)). Meanwhile, 95% of Puerto Rico residents speak a language other than English at home ([Nov 14 findings](../docs/product/review-2026-11-14/findings-by-category.md)).

Communication and delivery remain unproven:

- **Push is the only channel.** Beyond the communications hold, schedule and coverage changes reach staff only through opt-in push and the in-app list. There is no SMS, email or WhatsApp channel ([payloads.ts](../src/lib/notifications/payloads.ts)).
- **Reminders and invitations are queued, not delivered.** They prove "queue/receipt persistence, not delivery" ([manager reminders README](../src/lib/manager-reminders/README.md)).
- **Background jobs do not run in hosting.** `vercel.json` disables Git deployments and defines no cron jobs. The notification, reminder and payroll workers exist only as examples, and the backend record says "No real send" ([vercel.json](../vercel.json); [remaining dependencies](../docs/handoffs/2026-11-16-backend-phase5-remaining-dependencies.json)).
- **No uptime alerting.** Public uptime alerting "is not established" ([operations closeout](../docs/product/operations-closeout-2026-11-11.md)).

Fragility concentrates at scale cliffs and in test coverage. Every guarded schedule write snapshots every row of about 26 tables with no date window: 3.7 MB for 30 staff, two locations and a year of history ([generation-guards.ts](../src/lib/data/generation-guards.ts); [R15 capacity](../docs/handoffs/2026-11-11-r15-capacity-and-ci.md)). Payroll preparation and period close **refuse more than 300 retained people, inactive staff included** ([R15 capacity](../docs/handoffs/2026-11-11-r15-capacity-and-ci.md)). A 30–60-person chain with typical quick-service turnover could reach that cliff within a few years.

The latest unit run skipped 944 tests ([UI delivery](../docs/handoffs/2026-11-17-claude-ui-delivery/README.md)). An earlier inspection called the silently skipped database suites "fake green" ([code inspection](../docs/product/code-inspection-2026-10-21.md)). Push, location-scoped Managers, passkeys, mobile access, the native shells and the trial-expiry gate have never been exercised in a browser ([Nov 14 findings](../docs/product/review-2026-11-14/findings-by-category.md)). In fairness, many of October's high-severity findings are now fixed, including the payroll reopen interlock, push coverage, server error reporting and the 300-row caps ([timecards service](../src/lib/timecards/service.ts); [instrumentation.ts](../src/instrumentation.ts); [R15 capacity](../docs/handoffs/2026-11-11-r15-capacity-and-ci.md)). The team closes what it prioritizes.

The AI advisor, Rondo, shows the gap between building and operating. It is a capable Owner-only agent. It reads staffing, coverage, timecards and imported finance records, and it prepares coverage plans for the Owner to approve ([Rondo operating contract](../docs/product/rondo-operating-contract.md)). But it sits behind six activation conditions, Managers cannot use it, and its 50-question quality target is unexecuted. **Its Anthropic path is hard-coded to a $200 promotional credit that expired at 00:00 UTC today, Nov 18, 2026.** Any deployment configured for that provider now gets an empty configuration, which leaves the advisor unavailable ([anthropic-policy.ts](../src/lib/owner-advisor/anthropic-policy.ts); [credit migration](../docs/handoffs/2026-11-15-rondo-claude-credit-migration.md)). No recurring AI budget exists ([Rondo roadmap](../docs/product/2026-11-15-rondo-manager-roadmap.md)).

The business also cannot see itself. `package.json` lists no analytics or error-tracking vendor ([package.json](../package.json)). There is no operator console or safe "view as" mode for support, so debugging a customer "needs direct database access" ([business-analyst review](../docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md)).

### Security and compliance: two critical alerts and a thin trust file

Code-level controls are solid. They include server-side authorization rechecked inside transactions, parameterized SQL, rate-limited sign-in, append-only audit histories for time and payroll, least-privilege database roles in isolated mode, and strict content security policies on sensitive routes. Privacy and Terms pages took effect Oct 20, 2026, with a concrete retention schedule ([next.config.ts](../next.config.ts); [policies.ts](../src/lib/legal/policies.ts)).

The B2B trust file is thin:

- **No second factor or single sign-on.** No TOTP or SSO exists, and passkeys are optional and flag-gated, so Owner and Manager accounts that see pay have no second factor ([passkeys client](../src/lib/passkeys/client.ts); [business-analyst review](../docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md)).
- **An account-takeover finding is still untraced.** October's finding that "assisted recovery lets any company-scope Manager take over any non-Owner account" has no confirmed fix ([code inspection](../docs/product/code-inspection-2026-10-21.md)).
- **The processor list is incomplete.** The privacy policy names only Vercel, Neon, an email provider and browser push services. It omits Stripe, Render and every AI provider, so it becomes inaccurate the moment billing or Rondo goes live ([policies.ts](../src/lib/legal/policies.ts)).
- **No standard assurances.** There is no DPA, SOC 2 report, penetration test or security page ([compliance README](../docs/compliance/README.md)).
- **Deletion and restore gaps.** Deletion is fulfilled manually. The policy promises a 7-day restore window while staging companies ran on Neon Free's 6-hour history ([deletion runbook](../docs/compliance/account-deletion-runbook.md); [Neon pricing](https://neon.com/pricing)).

The newest fact is the most urgent. **On Nov 18, 2026, GitHub reported 11 open Dependabot vulnerabilities on the repository's default branch: 2 critical, 2 high, 6 moderate and 1 low** ([GitHub Dependabot](https://github.com/JoseK0514/NEVORA/security/dependabot), as reported by the coordinator). The team's Nov 8 integrated candidate removed nine inherited moderate findings, and its audits then "report 0 findings" ([onboarding readiness, dependency review](../docs/handoffs/self-service-onboarding-readiness.md)). The two snapshots cover different code and dates, so they do not contradict each other. Together they suggest the dependency work never reached the default branch, and that the code most likely to be serving the live customer carries known critical vulnerabilities. The notes do not identify the affected packages or whether they can be exploited, so the alerts need triage within days, not weeks.

## Competitors win on price architecture, distribution and payroll, not features alone

### Feature parity: a strong core with visible holes

The table-stakes list for 2026 includes:

- a schedule builder with templates;
- open shifts, swaps and time off;
- mobile clock-in with geofencing, plus a kiosk;
- break rules with attestation;
- timesheet review before payroll;
- a payroll export or embedded payroll;
- messaging with read tracking;
- multi-location permissions;
- native apps in both app stores;
- an AI assistant included in the price.

Sources: ([Connecteam's Homebase–7shifts test](https://connecteam.com/homebase-vs-7shifts/); [competitive brief](../docs/product/competitive-2026-10.md)). NEVORA matches the scheduling and timecard core. It misses the rest unevenly.

| Capability | Market standard | NEVORA on this branch |
|---|---|---|
| AI schedule drafting | Homebase, 7shifts, Deputy, Connecteam, Square Managerbot, Workforce.com ([Square](https://squareup.com/us/es/press/managerbot-open-beta); [Workforce.com](https://www.workforce.com/software/schedule-agent)) | Rule-based Build Week / Fill Gaps drafts, live; no sales input |
| AI that acts with approval (call-out cover, outreach) | Homebase Assistant, Oct 20, 2026 ([SiliconANGLE](https://siliconangle.com/?p=850756)); Humanity Backfill by SMS ([TCP](https://tcpsoftware.com/blog/humanity-schedule-backfill/)); Gusto Claude/ChatGPT connectors ([CPA Practice Advisor](https://www.cpapracticeadvisor.com/2026/10/22/gusto-touts-new-products-and-features-for-small-businesses/192269/)) | Rondo prepares coverage plans for Owner approval; flag-off, Owner-only, unqualified |
| POS-sales forecasting and labor % | 7shifts on live Square sales ([7shifts](https://www.7shifts.com/blog/7shifts-best-scheduling-and-payroll-software-for-fsrs-using-square-pos/)); Square; Toast Scheduling Pro ([Toast](https://support.toasttab.com/en/article/Get-Started-With-Scheduling-in-Toast-Web)) | None; labor budget always "not configured" |
| Open shifts | When I Work, 7shifts Shift Pool, Toast Pro | None; shifts require an employee |
| Mobile clock-in with geofence | Nearly all leaders | None; kiosk only |
| Shared-tablet kiosk | Homebase, 7shifts (separate app), Deputy, Connecteam | Yes, Employee ID + PIN; punching flag-gated |
| Offline punches | Homebase's failed a June 2026 test; 7shifts has none ([Connecteam test](https://connecteam.com/homebase-vs-7shifts/)) | None |
| Break rules, PTO accrual | Connecteam shipped five break/PTO release batches May–Oct 2026 ([Connecteam releases](https://releases.connecteam.com/)) | Break targets only; no accrual |
| Messaging | Universal | Built, held to test databases |
| Payroll | Embedded (Homebase, 7shifts, Toast, Square, Gusto) or partnered (Deputy–Paycor, When I Work–Rippling) | CSV export plus imported statements |
| Tips | Homebase $25 and 7shifts $49.99 per location ([Homebase](https://www.joinhomebase.com/pricing); [noon.ai](https://www.noon.ai/blog/articles/452-7shifts-pricing-2026)) | None |
| Native apps | All leaders; Homebase has ~96k iOS ratings at 4.78 ([competitive brief](../docs/product/competitive-2026-10.md)) | Unsigned shells; Apple enrollment "Pending" since Nov 5 ([native status](../docs/native/phase-3-status.md)) |
| Spanish | Homebase, Deputy, 7shifts, Connecteam, When I Work, Square ([Homebase](https://www.joinhomebase.com/blog/bienvenido-a-homebase)) | Sign-in, kiosk, emails, statements only |
| Puerto Rico labor presets | None found | None yet (planned) |
| Open API / MCP | Gusto MCP server, Deputy open API, Rippling plugins | None |

Two patterns matter more than the gaps. First, **AI that acts is now included in the price**. Deputy includes AI in every plan, Square's Managerbot carries "no additional cost," and Gusto charges nothing ([competitive brief](../docs/product/competitive-2026-10.md); [Square](https://squareup.com/us/es/press/managerbot-open-beta)). Every vendor uses the same "propose, owner approves, system executes" design and keeps AI off final pay decisions. Rondo cannot be sold as a premium add-on. Its cost has to be absorbed and metered.

Second, review complaints center on reliability: glitches, lost or wrong time, notification overload, offline failures, and AI-first support that never hands off to a person ([Connecteam test](https://connecteam.com/homebase-vs-7shifts/); [competitive brief](../docs/product/competitive-2026-10.md)). NEVORA's punch receipts, immutable ledgers and potential for bilingual human support target the market's sorest point. That advantage counts only once the product is live.

### Pricing and business models: per location, then payroll

The arithmetic below uses each vendor's list prices for a three-location chain with 30 staff:

| Vendor | Pricing unit | List price per month | Entry offer |
|---|---|---|---|
| **NEVORA** (encoded, not approved) | Flat per company by headcount band | **$29** (Team); quote required above 30 staff | 30-day trial, no card; no free tier |
| Homebase | Per location | $90 Essentials; $210 Plus | Free for 1 location/10 staff; 14-day trial ([Homebase](https://www.joinhomebase.com/pricing)) |
| 7shifts | Per location | $120–135 Essentials; $240–270 Pro | Free Comp plan, 1 location/15 staff ([noon.ai](https://www.noon.ai/blog/articles/452-7shifts-pricing-2026); [7shifts](https://www.7shifts.com/comp-pricing-changes-2026/)) |
| Deputy | Per user, $30 minimum | $150 Lite; $195 Core | No free tier ([Deputy](https://www.deputy.com/pricing)) |
| Square Shifts Plus | Per active member (owner counts) | ~$124 | Free to 5 members; 30-day trial ([Square](https://squareup.com/help/article/7894)) |
| When I Work | Per user | $75 Essentials ($150 if the multi-location rate applies) | Free plan removed; 14-day trial ([When I Work](https://wheniwork.com/pricing)) |
| Connecteam Operations | Per hub, first 30 users | $29–35 Basic; $49–59 Advanced | Free to 10 users ([Connecteam](https://connecteam.com/pricing/)) |
| Sling | Per user | $51–60 Premium | Free scheduling to 30 users ([Sling](https://www.getsling.com/pricing)) |
| Payroll add-on | Base + per employee | Homebase ~$229; 7shifts ~$300 | Homebase: 6 months free |

NEVORA's price matches only Connecteam's entry hub. It sits at a third to a seventh of Homebase, 7shifts and Deputy, and it has no location dimension, no annual plan and no add-on. That contradicts the team's own October recommendation of "~$39/$79 per location/month" and the market analyst's advice to "charge per location, not per user" ([FIXED-AND-REMAINING](../docs/product/FIXED-AND-REMAINING.md); [market-analyst review](../docs/product/reviews/gap-analysis-2026-10-20/market-analyst.md)).

Benchmarks explain why this matters:

- **Low prices churn faster.** Products priced under $10 per account per month have a top-quartile net revenue retention of only 65.1% ([ChartMogul retention report](https://chartmogul.com/reports/saas-retention-report/)). Below $25 per account, gross monthly revenue churn runs about 8.2%, against 2.4% above $500 ([mowt, citing ChartMogul](https://mowt.pages.dev/blog/saas-churn-rate-calculation-benchmarks)).
- **Card-required trials convert far better.** They convert 30% of trial users, more than five times the rate of trials that need no card. Per 1,000 visitors, a card-required trial yields 11 paying customers against 4 for a no-card trial ([ChartMogul conversion report](https://chartmogul.com/reports/saas-conversion-report-2/)).

NEVORA pairs the market's longest no-card trial (30 days) with a price in the worst-retention band.

The money in this category comes after the scheduling sale. Payroll runs roughly $39–49 base plus $6 per employee, and Homebase gives away six months of payroll and its Plus tier to pull customers upmarket ([Homebase](https://www.joinhomebase.com/pricing)). Toast's subscription revenue works out to roughly $560 per location per month (my estimate from its reported revenue and location count) ([Toast Q3 2026](https://seekingalpha.com/pr/20711782)). Scheduling-only vendors earn $25–125 per workplace per month. Owning payroll and payments is therefore worth roughly ten times more per location than owning the schedule.

The cost side makes NEVORA's flat price fragile. A 0.25-compute-unit Neon database running all month costs about **$19.35 on Neon's Launch plan, the Small plan's entire price, and about $40.50 on its Scale plan** (182.5 compute-unit hours at $0.106 or $0.222) ([Neon pricing](https://neon.com/pricing)). Scale is required above 100 projects. Unless each tenant's database reliably scales to zero, low-usage customers could cost more to serve than they pay.

### Growth strategies: wedge, POS channel, payroll, then franchise

Every scaled competitor followed the same sequence: a cheap scheduling wedge, then POS integrations for distribution, then payroll for revenue and lock-in, then tips, hiring and fintech add-ons, then multi-unit and franchise deals:

- **Homebase** paired a free one-location plan with POS integrations (Clover embeds Homebase in its own dashboard). It then added payroll, the Cash Out pay-advance feature and paid AI, and now claims 150,000+ customers ([Homebase Clover](https://www.joinhomebase.com/integrations/clover); [Let's Data Science](https://letsdatascience.com/news/homebase-launches-homebase-assistant-ai-for-hourly-small-bus-45b6142f)).
- **7shifts** stayed restaurant-only. 57% of its POS-integrated restaurants use Toast, and it added payroll, tip payouts and franchise wins, including **Scooter's Coffee, a drive-through chain that names 7shifts a preferred vendor** ([7shifts Toast](https://www.7shifts.com/integrated-partners/toast); [7shifts press release](https://www.prnewswire.com/news-releases/7shifts-accelerates-growth-and-industry-leadership-with-major-customer-expansions-product-innovation-and-workplace-recognition-302704760.html)).
- **Deputy** grew through partner ecosystems. A channel-plus-capital deal with a staffing franchise lifted its valuation past $1.1B ([Startup Daily](https://www.startupdaily.net/topic/funding/casual-worker-management-platform-deputy-is-back-from-the-brink-to-become-a-shy-unicorn-status/)).
- **Gusto** shows the end state. Its revenue was roughly $975M in 2025, and 23,000+ accounting firms resell it, earning up to 20% revenue share ([Sacra](https://sacra.com/c/gusto/); [Gusto partner program](https://gusto.com/partner-resources/gusto-partner-program-for-accountants)).

The failures are equally instructive. 7shifts cut 19% of staff in January 2024 after an $80M SoftBank-led round ([BetaKit](https://betakit.com/7shifts-cuts-19-percent-of-staff-in-new-layoffs-to-start-2024/)). Free-tier cuts drew review backlash. POS owners now bundle their own scheduling tools against their marketplace partners ([Toast Q3 2026](https://seekingalpha.com/pr/20711782)). No new priced primary rounds were found for Homebase, 7shifts, Connecteam or Deputy since 2024. Consolidation runs through payroll and HR acquirers instead: Paychex bought Paycor for $4.1B, UKG bought Shiftboard, Gusto bought Guideline and Mosey, and Quickbase bought Solvice ([Sacra](https://sacra.com/c/gusto/); [UKG](https://www.ukg.com/company/newsroom/ukg-acquires-shiftboard-leading-energy-and-manufacturing-employee-scheduling-solutions-provider); [Pulse](https://www.pulse.bot/hrtech/news/quickbase-acquires-solvice-to-embed-aidriven-scheduling-and-route-optimization-ccab9c15-2ec0-4f7e-a6a3-f5656d72abc8)). For a small entrant, capital efficiency and a strategic acquirer are the realistic path.

### Puerto Rico is an uncontested lane, for now

National payroll leaders stop at Puerto Rico:

- **Gusto** does not run payroll for US-territory employees ([Gusto support](https://support.gusto.com/article/210728164125837)).
- **Homebase** states 50 states plus DC (secondary source).
- **Toast** limits payroll to the United States without addressing Puerto Rico ([Toast](https://support.toasttab.com/en/article/Toast-Product-Availability-in-Australia-Canada-Ireland-and-the-United-Kingdom)).
- **Square** staff historically said Payroll was not offered there ([Square community](https://community.squareup.com/t5/General-Discussion/Can-I-use-Square-in-Puerto-Rico/td-p/3727)).

Puerto Rico employers instead use local bureaus. Alchavo sells payroll with a time clock from $175 per month and claims 800+ small-business clients ([Alchavo](https://www.alchavo.com/en)), Easy Payroll files the island's tax forms ([Easy Payroll](https://www.easypayroll.net/EasyPayrollBrochure2023.pdf)), and HiveDesk markets a Puerto Rico compliance page at $5 per user ([HiveDesk](https://www.hivedesk.com/compliance/puerto-rico)). No US vendor documents Puerto Rico labor presets.

Spanish alone is not a moat, because most US apps list it and Homebase says over half its support team speaks Spanish ([Homebase](https://www.joinhomebase.com/blog/bienvenido-a-homebase)). The defensible combination is Puerto Rico law, a clean handoff to Puerto Rico payroll bureaus, Puerto Rico Spanish and local human support. The lane will not stay empty. Humand raised a $66M Series A in February 2026 to fund US expansion ([SiliconANGLE](https://siliconangle.com/2026/02/23/humand-secures-66m-scale-ai-powered-operating-system-frontline-workers/)). GeoVictoria already operates in the Dominican Republic and the US, with an AI monthly shift planner and WhatsApp no-show alerts ([GeoVictoria](https://www.geovictoria.com/llms.txt)).

## Growth pulse: none of the five views can be read, and the engine is off

The growth pulse ran read-only on Nov 18, 2026, over Aug 20 to Nov 18. Only Vercel and the repository were readable. QuickBooks required re-authentication, the Gmail, Drive, Calendar and HubSpot connectors failed to connect, and Stripe, PayPal, Square, Mailchimp and the ad tools were not authorized. Under the skill's rules, a view with no data is marked "n/a" and named, never dropped. That every view is n/a is itself the finding.

| View | Status | What the period shows |
|---|---|---|
| Revenue and channel trend | **n/a** (red if confirmed) | No revenue source readable. The code makes self-service revenue structurally $0: public signup and live Stripe keys default off, and a 30-day trial precedes any charge ([commerce README](../services/commerce/README.md)). Any revenue is 100% one customer, a red-level concentration. |
| Funnel conversion | **n/a** | The one project with Web Analytics on recorded **0 pageviews in 31 days**, and no analytics script ships in the app ([Vercel analytics API](https://api.vercel.com/v1/query/web-analytics/visits/aggregate?projectId=prj_gGWZI2AJQoCXuvxCZhU67JHeToCK); [package.json](../package.json)). Analytics is off on the signup and VELANI AI sites ([Vercel analytics API](https://api.vercel.com/v1/query/web-analytics/visits/aggregate?projectId=prj_jPVvFBEx2mMZM125KVJzRiBZfgDE)). Built-in stops: signup off, approved-recipient admission with a cap, quote required above 30 staff. |
| Campaign return | **n/a** | No ad, email or CRM tool is authorized. The roadmap starts no paid campaigns, and no operating budget is open ([Rondo roadmap](../docs/product/2026-11-15-rondo-manager-roadmap.md)). No spend, so nothing to return. |
| Product performance | **n/a** | The catalog is two plans (Small $19, Team $29) with no recorded sale. Measurable activity is engineering: 274 deployments, 92% of them Nov 2–15, 51% blocked or errored ([Vercel deployments API](https://api.vercel.com/v6/deployments?teamId=team_Lzbw410WwXGWHTuUXuamRI1N)). |
| Customer sentiment | **n/a** | No reviews, support inbox or usage data readable. The repository's named retention risks are missing uptime alerting and a gated pilot ([operations closeout](../docs/product/operations-closeout-2026-11-11.md)). |

**The one sentence for the period:** NEVORA's growth engine has not been switched on: signup and live billing are off by default, the one analytics-enabled site recorded 0 pageviews in 31 days because visits are not measured, and no revenue, inbox, document or calendar tool could be read, so the only measurable activity was building (274 deployments in 27 days), not demand.

"0 pageviews" should not be read as "0 visitors." The site is simply unmeasured, and on Vercel's Hobby plan every untracked day is lost after 31 days ([Vercel analytics API](https://api.vercel.com/v1/query/web-analytics/visits/aggregate?projectId=prj_gGWZI2AJQoCXuvxCZhU67JHeToCK)). Two facts make the single live customer the whole business. Existing customers are "not automatically enrolled" in billing ([commerce README](../services/commerce/README.md)), so that customer pays nothing through the product unless someone acts. And the repository holds no revenue, customer-count or pipeline target. Its only adopted target is a quality bar for the AI advisor ([Rondo roadmap](../docs/product/2026-11-15-rondo-manager-roadmap.md)).

| Rank | What | Why | What it's worth |
|---|---|---|---|
| 1 | Put the live Puerto Rico coffee drive-through on a paid plan, with Jose's authorization, and use it as the reference to sign the next 5–10 Puerto Rico multi-location operators through direct, founder-led outreach. | It is the only live configuration. It is not moved onto billing automatically, and one churn event takes the customer base to zero. Invite-only admission already favors owner-led selling. | At today's prices, $228–348 a year per business; ten Team-size customers bring about $290/month. At a tested per-location price of $60–150, one three-location chain is worth $2,160–5,400 a year, and ten such chains $21,600–54,000 a year. This is the only action that produces revenue and a reference without first fixing the public funnel. |
| 2 | Finish the documented launch checklist, then open signup and live Stripe billing to a small invite-only group, with owner authorization. | Both are built but off. Open items include the Stripe account, approved email (SMTP) delivery, worker scheduling, an exact deployment commit, backup restore, rate limiting, notices and cost per company; Tax waits on registrations ([commerce README](../services/commerce/README.md)). | It unlocks volume. Because of the 30-day trial, every week of delay pushes the first self-service charge back a week. At current prices, $1,000/month needs about 35 Team or 53 Small customers. |
| 3 | Measure demand now: ship the Vercel Analytics script, turn on analytics for the signup and VELANI AI sites, and reconnect QuickBooks, Gmail, Drive and Calendar. | Zero of five views are measurable, and analytics history expires after 31 days. | No direct revenue. It is the cheapest action, and it decides whether actions 1 and 2 are working. |

## Scaling substantially needs price, channel and platform moves the code does not yet make

Puerto Rico is a beachhead, not a destination. The island has **41,362 small employers with 407,296 employees** ([SBA 2025 profile](https://advocacy.sba.gov/wp-content/uploads/2025/06/Puerto_Rico_2025-State-Profile.pdf)), and its food-service employment hit a record **78,800 in 2025, up 27% from 2015** ([FRED](https://fred.stlouisfed.org/data/SMU72000007072200001A)). Yet capturing all ~5,700 accommodation and food-service establishments at $100 per location would yield only about $6.9M a year ([SBA 2024 profile](https://advocacy.sba.gov/wp-content/uploads/2024/11/Puerto_Rico.pdf)). The prize lies beyond the island:

- 81.5 million US hourly workers ([BLS](https://www.bls.gov/cps/cpsaat44.htm));
- 15.8 million restaurant jobs ([NRA](https://restaurant.org/research-and-media/media/press-releases/persistent-cost-increases-and-enduring-demand-will-shape-the-restaurant-industry-in-2026/));
- about 845,000 franchise units ([FRANdata](https://frandata.com/u-s-franchisings-economic-outlook-in-2026-jobs-output-and-growth/));
- fast-growing drive-through coffee, where 7 Brew grew units 87.5% in 2025 ([NACS](https://www.convenience.org/Media/Daily/2026/June/5/4-The-Rise-of-Drive-Thru-Coffee-Shops_RSCH));
- about 496,000 Hispanic-owned employer firms with $730B in receipts ([Census](https://www.census.gov/newsroom/press-releases/2025/business-owner-characteristics.html)).

Analysts put workforce-management software at $7–12B worldwide, growing 4–13% a year ([360iResearch](https://www.giiresearch.com/report/ires2016971-workforce-management-software-market-by-component.html); [Fortune Business Insights](https://www.fortunebusinessinsights.com/workforce-management-markt-102633)).

**Move 1: reprice and change how customers enter.** Price per location, with a Puerto Rico compliance tier at the top and tips and payroll-export add-ons. Offer 15–20% off for annual prepayment and set a small monthly minimum. Replace the 30-day no-card trial with a paid pilot or card-required trial plus done-for-you onboarding. Onboarding is the real lever: 59% of software buyers regret a recent purchase, and only 34% both buy and implement smoothly ([Capterra regret](https://www.capterra.com/resources/tech-trends-smb-enterprise-software-purchase-tips/); [Capterra journey](https://www.capterra.com/resources/tech-trends-successful-buyer-purchase-journey/)).

The arithmetic is stark. At $29, a thousand customers cap NEVORA at $29,000 a month. Three hundred three-location chains at $100 per location would bring $90,000 a month. Treat the per-location figure as a hypothesis to test with the first customers.

**Move 2: turn Puerto Rico law into a channel.** Package the rules as hours classification and alerts that export cleanly into local payroll bureaus' formats. Then offer those bureaus and Puerto Rico CPA firms a 10–20% revenue share, the range Gusto pays accountants ([Gusto partner program](https://gusto.com/partner-resources/gusto-partner-program-for-accountants)). Accountants influence the purchase, but owners still make the final call in 89% of cases ([Accountants Daily](https://www.accountantsdaily.com.au/technology/21547-accountants-choose-tech-by-credibility-and-community)). Founder-led selling therefore stays primary, and bureaus supply warm introductions.

Franchise deals follow the precedent of 7shifts with Scooter's Coffee. A POS listing comes later, once someone verifies which POS Puerto Rico coffee and quick-service operators actually run; the notes leave that open.

WhatsApp or SMS invitations would fix the no-email sign-in dead end and match the pattern of Spanish-first rivals. This is an inference from GeoVictoria's alerting, not tested demand.

**Move 3: make AI pay for itself in labor dollars.** About 39% of restaurants use AI, 34% of those users apply it to demand forecasting, and cost is a barrier for 43% ([Nation's Restaurant News](https://www.nrn.com/restaurant-technology/restaurants-are-still-taking-a-cautious-approach-to-ai)). Rondo should be included in the price, metered and pointed at outcomes owners can count. One is forecasting Puerto Rico premiums before they happen: meal penalties, seventh-day work, daily overtime and Christmas-bonus accrual. Another is approve-then-contact call-out coverage, extended to Managers. Usage needs a ceiling and a recurring budget: one attempt costs about $0.015 at the measured token mix, so the 100-per-day ceiling implies about $45 per company per month ([credit migration](../docs/handoffs/2026-11-15-rondo-claude-credit-migration.md)).

**Move 4: build a platform that survives 100 tenants.** Neon's Free and Launch plans cap an account at 100 projects, and Scale allows 1,000 ([Neon pricing](https://neon.com/pricing)). Meanwhile, migrations run one database at a time from a hand-maintained registry ([migrations README](../db/migrations/README.md)), and operator tools are command-line only. The team itself writes that past "a handful" of companies the shared-database project "becomes the better investment" ([multi-company plan](../docs/product/multi-company-database-per-company-20261021.md)). Its draft has four open decisions and no schedule ([multitenancy PRD](../docs/product/prd-shared-multitenancy-draft-20261021.md)).

Before customer 50, NEVORA needs four things:

- a measured per-tenant cost model;
- proof that idle databases scale to zero;
- a fleet migration runner and an operator console with a safe "view as" mode;
- a firm decision on shared tenancy.

**Move 5: go to the mainland early.** Florida comes first, because it preempts local scheduling laws ([Homebase guide](https://joinhomebase.com/blog/predictive-scheduling-laws/)) and has a large Hispanic-owned business base. Texas follows for franchise growth. Puerto Rico's Act 60 taxes eligible export-services income at 4%, and revenue from Puerto Rico clients does not qualify ([InCorp](https://www.incorp.com/resources/knowledge-base/puerto-rico-act-60-2026-changes)). Mainland revenue therefore carries a structural tax advantage, though the IRS is scrutinizing Act 60 income sourcing ([Holland & Knight](https://www.hklaw.com/en/insights/publications/2026/06/act-60-tax-compliance-irs-scrutiny)).

The mainland also needs its own rules. Daily-overtime packs are required for California, Alaska, Nevada and Colorado. From 2026, W-2 forms must report "qualified overtime" (Box 12, Code TT) separately from state daily overtime ([IRS FS-2026-13](https://www.irs.gov/pub/taxpros/fs-2026-13.pdf); [TimeTrex](https://www.timetrex.com/blog/no-tax-on-overtime-2026)). Embedded-payroll APIs become available on the mainland; the notes found no evidence they cover Puerto Rico ([banq](https://www.banq.ai/embedded-finance/category/payroll)).

Earned wage access (pay advances) should wait. The federal regulator's December 2025 safe harbor requires payroll-data advances repaid by payroll deduction, which NEVORA cannot offer without a payroll partner ([Morrison Foerster](https://www.mofo.com/resources/insights/260107-cfpb-reestablishes-position-that-certain-earned-wage)).

## Ranked recommendations and the 30-, 90- and 180-day roadmap

Recommendations are ranked by business impact: revenue gained, retention protected and existential risk removed.

| Rank | Recommendation | Why it ranks here | Window |
|---|---|---|---|
| 1 | **Secure, ship and charge the live customer.** Triage and patch the 2 critical and 2 high Dependabot alerts. Release the current build with punching, invitations and uptime alerting on. Move the customer onto a paid plan and agree a reference. | It protects 100% of the customer base and starts revenue. The customer likely runs an older, exposed build. | 30 days |
| 2 | **Reprice per location and replace the no-card trial with a paid pilot.** Remove the 30-employee cliff. | Lifts revenue per account well above the $19–29 worst-churn band and above cost to serve. Every later customer inherits this price. | Decide in 30, live by 90 |
| 3 | **Clear the decision backlog and pre-authorize release envelopes.** The pending decisions are payroll scope, offline punches, the early and forgotten punch policy, the location-Manager role, communications retention (D04) and the Spanish register. | Approval bandwidth gates every other item. Most open items are decisions, not engineering unknowns. | 30 days |
| 4 | **Ship a counsel-reviewed Puerto Rico compliance pack v1** as hours classification and alerts, plus hire-date and date-of-birth fields. | It is the documented "#1 selling point," and no competitor offers it. | 90 days |
| 5 | **Run founder-led Puerto Rico sales and recruit two or three payroll bureaus or CPA firms as revenue-share partners.** | It builds distribution where national payroll cannot follow. | Start in 30, partners by 180 |
| 6 | **Extend Spanish to the signed-in employee and manager flows, and add a sign-in path for staff without email.** | It is the adoption gate in a market where 95% speak a language other than English at home. | 90 days |
| 7 | **Close the operating-week dead ends:** lift the communications hold, add early and forgotten punch rules, a kiosk offline screen, a small-business approval mode, location-Manager approvals and open shifts. | These surface in the first week of real use and drive early churn. | 90 days |
| 8 | **Open invite-only self-service signup and live billing**, with a tax decision and a corrected processor list. | It is the volume channel, and it depends on ranks 1–2 first. | 90 days |
| 9 | **Instrument demand, activation and usage**, and reconnect the business tools. | Direct impact is low, but every other bet is unjudgeable without it. | 30 days |
| 10 | **Add labor cost and one POS sales feed, and re-platform Rondo as an included, metered labor-cost advisor.** | It reaches parity on the market's top differentiator. The AI credit expired today. | 180 days |
| 11 | **Build fleet tooling and decide on tenancy before roughly 100 tenants.** | The Neon project cap and release windows that grow with every customer will otherwise stall growth. | 180 days |
| 12 | **Assemble a B2B trust pack:** MFA for pay-viewing roles, a DPA, an accurate sub-processor list, a restore drill and a security page. | Multi-unit and franchise buyers will ask for it, and it is required before Stripe or Rondo go live. | 90–180 days |
| 13 | **Publish native apps in both stores.** | Table stakes for employee adoption. Apple enrollment has been pending since Nov 5. | 180 days |
| 14 | **Run a Florida pilot and set up Act 60 structuring.** | It breaks Puerto Rico's ~$7M ceiling and earns the 4% export-services rate. | 180 days and beyond |

| Window | Commercial | Product | Platform, security, operations |
|---|---|---|---|
| **Next 30 days** (to Dec 18, 2026) | Convert the live customer to paid and agree a reference. Set the per-location price hypothesis. List 25 Puerto Rico multi-location operators and begin outreach. Interview two payroll bureaus. | Christmas-bonus hours report for the Oct 1 hours year. Hire-date and date-of-birth fields. Early-clock-in grace and forgotten-clock-out decision. Decide D04, the Spanish register and the location-Manager role. | Patch critical and high Dependabot alerts. Make a production release from one exact commit. Add uptime alerting and the analytics script. Reconnect business tools. Replace the expired AI credit path. Update the processor list. |
| **31–90 days** (to Feb 16, 2027) | Run 5–10 paid pilots with done-for-you setup. Open invite-only signup and live Stripe. Make the tax registration decision. Add annual plans and a referral credit. | Puerto Rico compliance pack v1 (daily overtime, meal window, seventh day, 130-hour gate, bonus ledger, paid lactation break). Spanish for core signed-in flows. No-email access. Communications and checklist screens. Open shifts. Kiosk offline screen. Small-business approval mode. | MFA for Owners and Managers. DPA. Restore drill. Error tracking. Per-tenant cost model. Move ~650 MB of evidence out of git. |
| **91–180 days** (to May 17, 2027) | Bureau partnerships live with revenue share. First franchise or 10+-location deal. Tips and compliance add-ons. Florida discovery and Act 60 counsel. | Labor cost and labor-% reporting from one POS feed. Rondo for Owners and Managers with approve-then-contact coverage. Leave balances. | Fleet migration runner and operator console, or a shared-tenancy commitment. Neon plan decision before 100 tenants. Native apps in both stores. SOC 2 readiness scoping. |

The sequencing follows dependencies:

- **Pricing comes before any self-service opening,** so the first public customers do not lock in $19 plans.
- **Counsel review gates the compliance pack,** so it should start in the first 30 days even though the pack ships by 90.
- **Retention policy D04 gates communications,** so that decision belongs in the first month.
- **Each window has an exit test.** By day 30: one paying, referenceable customer and measured traffic. By day 90: roughly ten paying multi-location customers on the new price, with the Puerto Rico pack live. By day 180: a working bureau channel and a tenancy plan that does not break at 100 customers.

These are milestones to aim for, not forecasts.

## Conclusion

Measured against competitors, NEVORA is less behind than it looks. Its rule-based auto-scheduler, punch ledger and payroll handoff are credible, and its "external payroll" design looks like a gap next to Homebase and 7shifts. In Puerto Rico it is the correct design, because no national payroll engine will follow it there. NEVORA's position shifts from "missing payroll" to "missing the Puerto Rico hours classification that local payroll bureaus need." That gap is narrower, cheaper to close and easier to defend.

The larger risk is not that competitors out-build NEVORA. It is that NEVORA never charges. The lane is open but will not stay open: AI agents are being bundled free, and Spanish-first rivals are funded and moving north. Most of what separates NEVORA from revenue is a handful of owner decisions on price, retention policy and release authority, not code. NEVORA has shown it can build almost anything quickly. What it has not shown is that the founder can authorize decisions as fast as the agents build.
