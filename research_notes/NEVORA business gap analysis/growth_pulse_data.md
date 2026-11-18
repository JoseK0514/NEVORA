# NEVORA growth pulse: connected-tool signals, 90 days to 2026-11-18

Method: the small-business `growth-pulse` skill (SKILL.md plus reference/data_sources.md, thresholds.md, output_template.md, gotchas.md), run read-only on 2026-11-18. Window: 2026-08-20 to 2026-11-18, compared with the prior period where a source allowed it. Every connector call was a read. Nothing was labelled, drafted, sent, deployed or changed. No Neon or production database was queried. No web search used the company, product or customer names. Third-party personal details are not recorded here. The live customer is called "the Puerto Rico coffee drive-through" throughout.

Source links: repository files are relative links from this folder. Vercel figures cite the read-only REST endpoint behind the Vercel MCP tool that returned them.

## Is there revenue yet, from whom, and what is its trend?

### Takeaway
No revenue figure could be read: QuickBooks needs the owner to sign in again, and Stripe and the other payment tools are not authorized. The code shows self-service revenue cannot exist yet. Public signup and live Stripe billing are both off by default, and every new business gets a 30-day trial before its first charge. Revenue trend, revenue by customer and revenue by product are all **n/a**.

### Cited Findings
- QuickBooks `company_info` failed twice with "needs you to sign in again (run /mcp to re-authenticate)". The connected company could not be identified, so no profit-and-loss, sales-by-customer or sales-by-product report was pulled. (Observed connector error this session; no URL.)
- Public signup is off unless explicitly enabled: "`NEVORA_COMMERCE_SIGNUP_ENABLED` | Exact `true` to accept new public signup. Default off." — [services/commerce/README.md](../../services/commerce/README.md)
- Live Stripe keys need the production environment plus an explicit flag: "`NEVORA_COMMERCE_STRIPE_LIVE_ENABLED` | Explicit `true` plus production environment required before a live key is accepted. This is not production authorization." — [services/commerce/README.md](../../services/commerce/README.md)
- The commerce service "Nothing here provisions paid cloud resources or enables a subscription in production." — [services/commerce/README.md](../../services/commerce/README.md)
- The price list has two monthly USD plans: "`STRIPE_PRICE_SMALL`, `STRIPE_PRICE_TEAM` | Two Stripe monthly USD Prices: 1900/2900 minor units, quantity one." — [services/commerce/README.md](../../services/commerce/README.md)
- Plan rules: Small is USD 19/month for up to 15 employees and Team is USD 29/month for 16 to 30 employees. A business with more than 30 employees, or a count below 1, is refused self-service with `assisted_quote_required`. — [services/commerce/model.ts](../../services/commerce/model.ts) (`planFor`, lines 14-20)
- Each new business gets a 30-day trial (`trialDays: 30`; trial end is set to start plus `interval '30 days'`). — [services/commerce/service.ts](../../services/commerce/service.ts) line 86; [services/commerce/store.ts](../../services/commerce/store.ts) line 92
- An owner who subscribes during the trial keeps the original trial deadline: "the worker creates the subscription with the **original** trial deadline". — [services/commerce/README.md](../../services/commerce/README.md)
- Stripe Tax stays off until the owner confirms tax registrations: "Jose has not confirmed tax registrations. **Keep Tax disabled.**" — [services/commerce/README.md](../../services/commerce/README.md)
- Steps still open before any real launch: "verify Stripe account/test-mode checkout, approved SMTP with an explicitly approved test inbox, worker scheduling, exact deployment SHA, database separation/backup restore, ingress/client-IP rate limiting, current retention/commercial notices and cost per company… None of these external states is established by local tests." — [services/commerce/README.md](../../services/commerce/README.md)
- No spending budget is open. The roadmap says "no completion date or recurring spend has been fabricated. The prior approved $5 fictional comparison envelope is not an open operating budget." — [docs/product/2026-11-15-rondo-manager-roadmap.md](../../docs/product/2026-11-15-rondo-manager-roadmap.md)
- Vercel lists a production commerce project, `nevora-commerce-production`, created 2026-11-10 with one READY production deployment that day. This shows a deployment exists. It says nothing about live billing or revenue. — [Vercel API: projects and deployments, team_Lzbw410WwXGWHTuUXuamRI1N](https://api.vercel.com/v6/deployments?teamId=team_Lzbw410WwXGWHTuUXuamRI1N)

### Inferences
- Self-service revenue is structurally USD 0 today. Any revenue from the Puerto Rico coffee drive-through would be billed outside the app, by invoice or arrangement, and would appear only in QuickBooks, which is unreadable this run.
- Size of the revenue per customer: Small is USD 228 a year and Team is USD 348 a year per business. USD 1,000 in monthly recurring revenue needs about 35 Team or 53 Small businesses. USD 10,000 a month needs about 345 Team or 527 Small businesses. These are arithmetic on the repo price list, not forecasts.
- Time to first dollar: no self-service business can be charged until 30 days after it signs up, even if it subscribes early. So the first self-service revenue lands at least 30 days after signup is switched on.
- Customer concentration: with one live configuration, any customer-derived revenue is 100% one customer. That is the red level for the skill's concentration thresholds (more than 80% from one channel, more than 50% from the top product), applied by analogy to customers. It cannot be confirmed without QuickBooks.

### Gaps
- Actual revenue, invoices and payments from the Puerto Rico coffee drive-through are unknown. QuickBooks needs re-authentication, and Stripe, PayPal and Square are not authorized.
- Whether the connected QuickBooks company is VELANI LLC or an unrelated business is unknown.
- There is no prior-period or year-ago revenue comparison.
- Revenue targets: no revenue, customer-count or MRR target exists in docs/product/README.md, TEAM-RULES.md, the 2026-11-15 roadmap or the 2026-11-11 operations closeout. The only adopted target found is a product-quality one (see the satisfaction question below).

## Is anyone finding NEVORA (site traffic, inquiries, demos), and where do they drop off?

### Takeaway
Demand cannot be measured. The one NEVORA Vercel project with Web Analytics turned on (`nevora`) recorded **0 pageviews** from 2026-10-19 to 2026-11-18 in production, preview and development alike. The app's `package.json` lists no web-analytics package, so this most likely means visits are not being measured, not that nobody visited. The signup and VELANI sites have Web Analytics off. Gmail and Calendar could not connect, so inquiry, demo and response-time counts are **n/a**. The only drop-offs visible are ones built into the code: signup is closed by default, admission is limited to approved recipients with a provisioning cap, and businesses over 30 employees are routed to a quote.

### Cited Findings
- The Vercel team holds 13 projects. Nine are NEVORA or VELANI projects, with creation dates: `nevora` (2026-10-15), `nevora-clocker-staging` (2026-10-27), `velani-ai` (2026-11-03), `nevora-onboarding-staging` (2026-11-08), `nevora-signup` (2026-11-10), `nevora-commerce-production` (2026-11-10), `velani-admin` (2026-11-10), `velani-admin-staging` (2026-11-12) and `velani-rondo-development` (2026-11-12). The other four are `yavi-barber`, `fuel-scheduler`, `fuel-scheduler-pp` and `tool-box-booqable-pricing-engine`. — [Vercel API: list projects](https://api.vercel.com/v10/projects?teamId=team_Lzbw410WwXGWHTuUXuamRI1N)
- `nevora` Web Analytics, 2026-10-19 to 2026-11-18, returned empty data (`"data": []`) when broken down by week, request path, referrer hostname, country, and environment (production, preview and development). — [Vercel API: web-analytics aggregate, project prj_gGWZI2AJQoCXuvxCZhU67JHeToCK](https://api.vercel.com/v1/query/web-analytics/visits/aggregate?projectId=prj_gGWZI2AJQoCXuvxCZhU67JHeToCK)
- The 90-day request for `nevora` was refused: "the hobby plan only grants access to the latest 31 days of data". A 90-day view and a prior-30-day comparison cannot be had from Vercel. — [Vercel API: web-analytics aggregate](https://api.vercel.com/v1/query/web-analytics/visits/aggregate?projectId=prj_gGWZI2AJQoCXuvxCZhU67JHeToCK)
- `velani-ai` and `nevora-signup` returned "Web Analytics is not enabled for this project". — [Vercel API: web-analytics aggregate](https://api.vercel.com/v1/query/web-analytics/visits/aggregate?projectId=prj_jPVvFBEx2mMZM125KVJzRiBZfgDE)
- The app's `package.json` is named `fuel-scheduler` and lists no web-analytics dependency such as `@vercel/analytics`. — [package.json](../../package.json)
- The repository names these public hosts: `signup.nevora.team` (42 references), `signup-staging.nevora.team` (28), `portal-staging.nevora.team` (13), `nevora.team` (10), `portal.nevora.team` (3), and `thevelani.com` / `www.thevelani.com` (125 / 57). The commerce UI origin defaults to `https://www.thevelani.com`. — [services/commerce/README.md](../../services/commerce/README.md); repository grep of `*.md, *.json, *.ts, *.tsx, *.mjs`
- Signup admission is gated: "Approved-recipient admission and total provisioning cap are deployed in separate signup source". The default is to keep this closed. — [docs/product/operations-closeout-2026-11-11.md](../../docs/product/operations-closeout-2026-11-11.md) (R26)
- Businesses with more than 30 employees cannot self-serve and get `assisted_quote_required`. — [services/commerce/model.ts](../../services/commerce/model.ts)
- Gmail `search_threads` failed twice with "Incompatible auth server: does not support dynamic client registration". Calendar `list_events` and Drive `search_files` failed once each with the same error. (Observed connector errors this session; no URL.)

### Inferences
- "0 pageviews" should not be read as "0 visitors". Analytics is switched on for `nevora`, but the code does not appear to ship the tracking script, and none of `nevora`'s production-target deployments in the window reached READY (see the next question). The honest reading is that the site is unmeasured.
- The funnel has three built-in stops before any marketing: (1) public signup is off, (2) admission is by approved recipient with a provisioning cap, (3) the trial lasts 30 days before a charge. The first two block self-service demand entirely, so the funnel today is owner-led and invitation-only.
- With the hobby plan keeping only 31 days of analytics, every day without tracking on the public signup site is lost permanently.

### Gaps
- Inbound inquiries, demo requests, pricing questions and partnership emails in the last 90 days: n/a (Gmail unreachable).
- Demo, sales, customer and partner meetings in the last 90 days and the next 30: n/a (Calendar unreachable).
- Which Vercel project serves `signup.nevora.team`, `portal.nevora.team` or `nevora.team`. The `nevora-signup` mapping is inferred from its name; domain settings were not read.
- `fuel-scheduler` (created 2026-09-27, last updated 2026-10-10) and `fuel-scheduler-pp` (created 2026-10-14, last updated 2026-11-09) carry the app's package name and may host earlier or live deployments of this codebase, possibly the Puerto Rico coffee drive-through's production. Their analytics were deliberately not pulled, because that would be the live customer's production usage data, which the project rules exclude from this kind of work. The owner can authorize that read if wanted.
- Lead counts, stage conversion, win rate and median first response: n/a (no CRM connected; HubSpot failed to connect with "Incompatible auth server").

## Is any marketing or sales activity happening, and what does it return?

### Takeaway
No marketing or sales activity is measurable. No ad, email-marketing or CRM tool is authorized. The repository roadmap explicitly starts no paid campaigns and holds no open operating budget. The activity that is visible is engineering: **274 Vercel deployments across the 9 NEVORA/VELANI projects between 2026-10-19 and 2026-11-14**, 92% of them (251) in the two weeks 2026-11-02 to 2026-11-15. Campaign return and cost per lead are **n/a**.

### Cited Findings
- The roadmap "sends no messages or starts new chats, implementation agents, services, deployments or paid campaigns." — [docs/product/2026-11-15-rondo-manager-roadmap.md](../../docs/product/2026-11-15-rondo-manager-roadmap.md)
- The team rules say "**No paid generation** without Jose's approval." — [docs/product/TEAM-RULES.md](../../docs/product/TEAM-RULES.md)
- Deployments from 2026-08-20 to 2026-11-18 across the 9 NEVORA/VELANI projects: 274 in total. Page 3 ended with no further cursor, the earliest returned deployment is 2026-10-19, and none came after 2026-11-14. — [Vercel API: deployments, 3 pages](https://api.vercel.com/v6/deployments?teamId=team_Lzbw410WwXGWHTuUXuamRI1N)
  - By project: `velani-ai` 201 (186 preview, 15 production), `nevora` 28 (25 preview, 2 production, 1 staging), `nevora-onboarding-staging` 19, `velani-admin-staging` 9, `velani-admin` 5, `velani-rondo-development` 5, `nevora-signup` 3 (all production, all on 2026-11-10), `nevora-clocker-staging` 3, `nevora-commerce-production` 1.
  - By outcome: 128 READY, 93 BLOCKED, 48 ERROR, 5 CANCELED. `velani-ai` alone had 90 BLOCKED and 43 ERROR out of 201.
  - READY production deployments: 28 (`velani-ai` 12, `velani-admin-staging` 8, `nevora-signup` 3, `velani-admin` 2, and one each for `nevora-commerce-production`, `nevora-onboarding-staging` and `nevora-clocker-staging`). None of `nevora`'s production-target deployments in the window reached READY.
  - By week: 2026-10-19 to 10-25: 5; 10-26 to 11-01: 18; 11-02 to 11-08: 145; 11-09 to 11-15: 106; 11-16 to 11-18: 0.
- QuickBooks CRM objects (leads, opportunities) were not read because QuickBooks needs re-authentication. (Observed connector error; no URL.)

### Inferences
- Effort over the period went into building and staging the signup, commerce, admin and AI surfaces, with roughly 251 of 274 deployments (92%) after 2026-11-01. None of it can be tied to customer acquisition, because no acquisition channel is instrumented or authorized.
- 141 of 274 deployments (51%) ended BLOCKED or ERROR, mostly on `velani-ai`. That is engineering churn, not a growth signal. It is noted only because it shows where time went.
- With no spend, the skill's main traps, rising spend with rising cost per lead and invented attribution, do not apply this period.

### Gaps
- Ad spend, impressions, clicks and cost per result: n/a (TikTok not authorized; Google and Meta ads not wired).
- Email campaigns and audience growth: n/a (Mailchimp not authorized).
- Pipeline value, deal stages and win rate: n/a (HubSpot failed to connect; Zoho CRM not authorized; QuickBooks CRM unreachable). If a pipeline existed, its deal values would be hopes, not revenue.
- Business documents in Drive (business plan, pitch deck, pricing, financial model, customer list or contracts, revenue targets, marketing plan): n/a (Drive unreachable). Whether a marketing plan exists outside the repository is unknown.

## What do the available signals say about customer satisfaction and retention of the one live customer?

### Takeaway
There is no direct satisfaction or retention signal. No review source, inbox, support desk or usage data could be read, and public-review searches were deliberately not run under the privacy rule. Sentiment is **n/a**. The repository records operational-readiness gaps that bear on retention risk: public uptime alerting is not established, the formal pilot stays separately gated, and monitoring staffing and delivery evidence are open. Its only adopted target is a product-quality bar for the Rondo AI manager, not a customer metric.

### Cited Findings
- "R34 public uptime | Private worker health is implemented; actual public uptime alerts/response are not established." — [docs/product/operations-closeout-2026-11-11.md](../../docs/product/operations-closeout-2026-11-11.md)
- "R21 workforce pilot | Enrollment, host packaging and private worker/health code exist. Packet/source and hosted custody remain open… Actual pilot stays separately gated." — [docs/product/operations-closeout-2026-11-11.md](../../docs/product/operations-closeout-2026-11-11.md)
- "R22 monitoring/response | … Staff, provider/renewal and actual delivery evidence remain open." — [docs/product/operations-closeout-2026-11-11.md](../../docs/product/operations-closeout-2026-11-11.md)
- The adopted target is product quality: "Jose's adopted target is all 50 Owner questions at 10/10 each" (Rondo manager program, status "PROPOSED PROGRAM SEQUENCE"). — [docs/product/2026-11-15-rondo-manager-roadmap.md](../../docs/product/2026-11-15-rondo-manager-roadmap.md)
- Existing customers are not moved onto billing automatically: "Existing customers are not automatically enrolled." — [services/commerce/README.md](../../services/commerce/README.md)
- The product's stated aim is to be "a scheduling, time, pay and workforce app for small and medium businesses… sold to many companies, and Puerto Rico is its first market (local labour rules and full Spanish set it apart)." — [docs/product/TEAM-RULES.md](../../docs/product/TEAM-RULES.md)

### Inferences
- With one live customer, a single churn event takes NEVORA's live customer base to zero, so retention of the Puerto Rico coffee drive-through is the most consequential retention fact in the business. It is currently unmeasured.
- "Existing customers are not automatically enrolled" means the live customer will not move onto a paid plan unless someone takes a deliberate commercial step.
- Missing public uptime alerting is the main retention risk the repository itself names. A workforce app that clocks shifts and feeds payroll loses trust quickly when outages go unnoticed.

### Gaps
- Review scores, review themes, disputes and chargebacks: n/a (no review source; Stripe and PayPal not authorized; public searches not run under the privacy rule).
- Support or complaint emails from the live customer: n/a (Gmail unreachable).
- How much the live customer uses the app (active employees, clock-ins, schedule publishes): n/a. That would be production data, excluded by the project rules; the `fuel-scheduler*` Vercel analytics were not pulled for the same reason.
- Whether the live customer pays anything, and on what terms: n/a (QuickBooks unreachable).

## What are the three highest-impact growth actions given this evidence?

### Takeaway
The growth engine is not switched on yet, and it cannot be measured. Of the five growth views, 0 have readable data. The three actions, ranked by impact: (1) turn the one live customer into a paying, referenceable account and use it to sign the next few Puerto Rico businesses directly; (2) finish the documented launch checklist and switch on billing and signup for a small, controlled group, with owner authorization; (3) install measurement now (analytics script, Web Analytics on the signup site, reconnected business tools), because 31-day analytics retention loses evidence every day it is off.

### Cited Findings
- Status cutoffs come from the skill's thresholds. Examples: revenue down more than 10% is red; one stage losing more than 70% is red; median first response over 24 hours is red; top product above 50% is red. A view with no data is marked "n/a" and named, never dropped. — [growth-pulse reference/thresholds.md](file:///root/.claude/plugins/synced/ed4b46c9-b1a6-412e-b2fa-f20348b302bc_aa448625-e300-4874-8e0d-75b71df80b09/dab4db2f-d14c-4d0a-80d8-66f3f8b59717/skills/growth-pulse/reference/thresholds.md); [growth-pulse SKILL.md](file:///root/.claude/plugins/synced/ed4b46c9-b1a6-412e-b2fa-f20348b302bc_aa448625-e300-4874-8e0d-75b71df80b09/dab4db2f-d14c-4d0a-80d8-66f3f8b59717/skills/growth-pulse/SKILL.md)
- Pricing: USD 19 a month (up to 15 employees) or USD 29 a month (16 to 30), 30-day trial. — [services/commerce/model.ts](../../services/commerce/model.ts); [services/commerce/service.ts](../../services/commerce/service.ts)
- Launch prerequisites, and the guidance to "Start with isolated owned fixtures, then an authorized non-production pilot." — [services/commerce/README.md](../../services/commerce/README.md)
- `nevora` recorded 0 pageviews in 31 days, analytics keeps only 31 days, and the signup project has analytics off. — [Vercel API: web-analytics aggregate](https://api.vercel.com/v1/query/web-analytics/visits/aggregate?projectId=prj_gGWZI2AJQoCXuvxCZhU67JHeToCK)

### Inferences

#### The single sentence for the period
NEVORA's growth engine has not been switched on: self-service signup and live billing are off by default, the one analytics-enabled site recorded 0 pageviews in 31 days because visits are not being measured, and none of the revenue, inbox, document or calendar tools could be read, so the period's only measurable activity is building (274 deployments in 27 days) rather than demand.

#### Five-view status (growth-pulse thresholds)
| View | Status | Basis |
|---|---|---|
| Channel and revenue trend | **n/a** | QuickBooks needs re-sign-in; Stripe, PayPal and Square are not authorized. Code shows self-service revenue is structurally USD 0 (signup and live billing off, 30-day trial). Any customer revenue would be 100% one customer, a red-level concentration if confirmed. |
| Funnel conversion | **n/a** | No CRM, Gmail or Calendar data. Traffic: 0 recorded pageviews in 31 days on `nevora` (likely unmeasured); Web Analytics off on `nevora-signup` and `velani-ai`. Built-in stops: signup off, approved-recipient admission with a cap, quote required above 30 employees. |
| Campaign return | **n/a** | No ad, email or CRM tool authorized. Roadmap starts no paid campaigns; no open operating budget. No spend, so no return to compute. |
| Product performance | **n/a** | No sales by product. The catalog is two plans (Small USD 19, Team USD 29) with no recorded sales. |
| Customer sentiment | **n/a** | No reviews, disputes, inbox or support data; public-review search not run under the privacy rule. Named risks: public uptime alerting not established, pilot gated. |

#### Three ranked growth actions
1. **Put the Puerto Rico coffee drive-through on a paid plan, with the owner's say-so, and use it to sign the next 5 to 10 similar Puerto Rico businesses by direct, owner-led outreach.**
   - *Why:* it is the only live configuration, revenue from it is unconfirmed (QuickBooks unreadable), and existing customers are not moved onto billing automatically. The admission rules already favour invite-only, owner-led selling.
   - *Worth:* each business is USD 228 to 348 a year. Ten Team-size businesses are about USD 290 a month (USD 3,480 a year). This is the only action that produces revenue and a reference without first fixing the public funnel. Keeping the one customer is the whole retention base.
2. **Finish the documented launch checklist, then switch on signup and Stripe billing for a small, invite-only group, with owner authorization.**
   - *Why:* signup and live billing are built but off by default. The checklist lists open items (Stripe account and test-mode checkout, approved SMTP, worker scheduling, exact deployment SHA, database separation and backup restore, rate limiting, retention and commercial notices, cost per company), and Tax stays off until tax registrations are confirmed.
   - *Worth:* until then self-service revenue is structurally USD 0. Because of the 30-day trial, each week of delay pushes the first self-service charge back a week. Reaching USD 1,000 a month needs about 35 Team or 53 Small businesses, so the self-service channel is what makes volume possible. Production deployment and live billing need the owner's explicit authorization.
3. **Measure demand now: add the Vercel Analytics script to the app, turn on Web Analytics for `nevora-signup` (and `velani-ai` if it is public-facing), and have the owner reconnect QuickBooks, Gmail, Google Drive and Google Calendar so the next pulse can read them.**
   - *Why:* 0 of 5 growth views are measurable. `nevora` shows 0 pageviews in 31 days with no analytics package in `package.json`, and the hobby plan keeps only 31 days of history.
   - *Worth:* no direct revenue. It is ranked third because it creates no money itself, but without it actions 1 and 2 cannot be judged, and every untracked day on the signup site is lost permanently.

### Gaps

#### Source coverage
| Source | Reachable | Result or reason |
|---|---|---|
| QuickBooks | No | "needs you to sign in again (run /mcp to re-authenticate)" on 2 attempts. Company not identified; nothing pulled. Fix: the owner re-authenticates the QuickBooks connector. |
| Vercel | Yes | 13 projects listed (9 NEVORA/VELANI). Web Analytics on for `nevora` only, with 0 pageviews in the last 31 days; hobby plan caps history at 31 days; off for `velani-ai` and `nevora-signup`. 274 deployments read. |
| Gmail | No | "Incompatible auth server: does not support dynamic client registration" on 2 attempts. The connector fails to connect. |
| Google Drive | No | Same error on 1 attempt. |
| Google Calendar | No | Same error on 1 attempt. |
| HubSpot | No | Configured but fails to connect ("Incompatible auth server"). |
| Stripe, PayPal, Square, Mailchimp, TikTok, Zoho (Books, CRM, Desk) | No | Need the owner to authorize them in connector settings. Not attempted, per instructions. |
| Shopify | Not attempted | No sign of a NEVORA store; skipped per instructions. |
| Neon and NEVORA production data | Not attempted | Excluded by the project rules. |
| `fuel-scheduler` / `fuel-scheduler-pp` Vercel analytics | Not attempted | May be the live customer's production; needs owner authorization. |
| Public reviews (web) | Not attempted | Privacy rule: no web searches with the company, product or customer names. |
| Repository (docs/product, services/commerce) | Yes | Pricing, trial length, launch checklist, admission gate and operations gaps read. No revenue, customer-count or pipeline targets exist in the repo. |

- Business plans, revenue targets, pitch decks and customer contracts that may live in Drive could change the ranking, for example if a signed pipeline already exists. Unknown this run.
- No connector supplied a comparison period, so every "versus prior period" figure in the skill template is n/a.
