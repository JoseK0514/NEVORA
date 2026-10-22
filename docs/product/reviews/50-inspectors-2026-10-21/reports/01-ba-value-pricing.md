# 01 Business Analyst — value proposition, packaging and pricing readiness

## Verdict

NEVORA is a well-made scheduling, Clocker and time-approval product, but it cannot be sold yet. It is built as one company per deployment, with no sign-up, plan, trial, billing or upgrade path (`docs/execution/single-company-20261012.md:7`). The two things a Puerto Rico owner would pay extra for are full Spanish and the Ley 379 overtime and meal rules, and neither is in the product: `src/app/layout.tsx:25` hard-codes `lang="en"`, and exports do not calculate overtime (`docs/execution/phase-d-export-mappings.md:3`). The Owner screens show what needs attention today. They never show what NEVORA saved the business in hours, overtime or money, and that is what convinces an owner to keep paying.

## Recommendations

1. **Decide and write down the packaging before any more feature work.**
   - *What:* Jose approves a one-page price sheet. Draft to test with 5 to 10 Puerto Rico owners:
     - **Esencial:** ~$39 per location per month with 15 people included, then ~$3 per extra person. Covers schedule, Clocker kiosk, time off, swaps, updates, full Spanish and branding.
     - **Pro:** ~$79 per location per month with 15 people included, then ~$5 per person. Adds timecard approval, payroll prep and exports, the Puerto Rico rules pack, Insights, attendance policies, multiple locations and payroll access grants.
     - **Trial:** 30 days of Pro with no card.
   - *Why:*
     - No pricing or packaging document exists anywhere under `docs/`. `grep` finds no plan, tier or billing concept in `docs/product/direction.md` or the PRDs.
     - The market range is $2.50 to $9 per user or $24 to $135 per location (`docs/product/competitive-2026-10.md:93`).
     - Reviews punish hidden pricing and shrinking free tiers (`competitive-2026-10.md:187`, theme 7).
     - Per-location pricing with an included headcount is the easiest to predict for a small Puerto Rico business.
   - *Impact:* High. *Effort:* S. *Owner:* Product.

2. **Build plan entitlements on top of the existing module system.**
   - *What:*
     - Add a `plan` and limits record to the workspace: locations, active people, and which modules and features are included.
     - Show a third module state, "Included in Pro", next to the current on and off states.
     - Enforce limits on the server, the same way a module that is off is already refused.
   - *Why:*
     - `src/lib/workspace-presentation/modules.ts:5-32` already hides a module everywhere and refuses it on the server (roadmap B2). It is an Owner preference, not a plan gate.
     - No entitlement concept exists anywhere in `src/lib`; `grep` for entitlement, plan tier and seat finds nothing.
   - *Impact:* High. *Effort:* M. *Owner:* Backend (model and enforcement), UI (locked states).

3. **Unpause the self-serve SaaS path: sign-up, company creation, trial clock and billing.**
   - *What:*
     - A public pricing page and sign-up that create a company, the first Owner and the first location.
     - A trial countdown, plus Stripe or similar checkout and a customer portal.
     - Dunning (payment-failure retries and notices) and a read-only grace period when payment fails.
   - *Why:*
     - Companies are created today by a CLI script with environment variables (`scripts/setup-company.mts`; `single-company-20261012.md:43-60`).
     - `src/app/page.tsx:4` sends every visitor straight to `/app`. Nothing in the app is public-facing or for sales.
     - Multi-company, billing and tenant onboarding are explicitly deferred (`single-company-20261012.md:7`).
     - The plan needs a tax line: confirm Puerto Rico IVU on SaaS with an accountant before setting list prices.
   - *Impact:* High (it blocks any paid launch). *Effort:* L. *Owner:* Backend plus Product.

4. **Add "Plan & billing" to Owner Settings.**
   - *What:* A new Settings group with the current plan, people and locations used against the limits, the trial's days left, the next invoice, past invoices, the payment method, and Upgrade and Cancel.
   - *Why:*
     - Settings has seven groups and none covers the account itself (`QAOWNER-settings-1440.png`).
     - Owners expect to find the plan there (Gusto, Homebase).
     - Usage against limits answers the "surprise charge" complaints in `competitive-2026-10.md:187`.
   - *Impact:* High. *Effort:* M. *Owner:* UI against a Backend contract.

5. **Ship the Puerto Rico rules pack and full Spanish as the Pro reasons to buy.**
   - *What:*
     - Do B5 (full Spanish, with a per-user language setting and a correct `lang` on each page).
     - Do the Ley 379 preset: daily overtime past 8 hours, weekly past 40, meal-period timing, and meal-penalty hours.
     - Make the export carry those calculated lines.
   - *Why:*
     - The competitive brief ranks these first and second (`competitive-2026-10.md:263-264`). Gusto does not run payroll for employees in Puerto Rico (`:34`).
     - Today the canonical export "does not classify earnings, calculate overtime, deduct breaks" (`phase-d-export-mappings.md:3`). An owner still has to work out overtime by hand.
     - The UI is English apart from Clocker second lines and vocabulary slots (`layout.tsx:25`; roadmap U9 and B2).
     - Counsel must sign off on the rules (`competitive-2026-10.md:221`).
   - *Impact:* High. *Effort:* L. *Owner:* Backend, Product (counsel), UI.

6. **Make Owner Home and Insights show the value NEVORA delivered.**
   - *What:*
     - A weekly "NEVORA this week" row: missed punches caught before payroll, overtime hours flagged before they happened, hours approved, and shifts covered through swaps.
     - Once pay rates exist, a labour-cost-against-schedule line for payroll roles.
   - *Why:*
     - Owner Home shows only operational queues: Needs you, Working now, Later today (`QAOWNER-home-1440.png`, `QAOWNER-home-390.png`).
     - Insights shows hours and counts with no money (`QAOWNER-insights-1440.png`).
     - `grep` finds no pay rate or labour cost in `src/lib` or `src/components`. The roadmap promised "payroll cost by period" (Phase 7).
     - Value shown to the owner is what keeps a trial converting and stops churn.
   - *Impact:* High. *Effort:* M. *Owner:* UI plus Backend (read-only aggregates).

7. **Turn "Finish setting up" into a trial activation path.**
   - *What:* Extend the setup card from 2 items to the steps that predict conversion: add the team, send invites, register a Clocker tablet, publish the first week, approve the first timecards. Track the share of trials that finish them.
   - *Why:*
     - The card shows "1 of 2" with only hour targets and coverage (`QAOWNER-home-1440.png`; `src/lib/assistance/manager-actions.ts:258-269`).
     - In a self-serve trial, an owner who never publishes a schedule or registers a Clocker tablet never sees why NEVORA is worth paying for.
   - *Impact:* Medium-High. *Effort:* M. *Owner:* UI plus Product (`prd-owner-setup-card.md` scope).

8. **Read the payroll pages as a buyer and tighten the "not supported" wording through the copy-approval process.**
   - *What:*
     - Product reviews the payroll copy as a prospect would.
     - Keep each legal or safety disclaimer once, in a single "What NEVORA does and doesn't do" note.
     - Lead with what the page delivers (finalized time and a provider-ready file).
   - *Why:*
     - Payroll settings repeats limits many times: "does not connect an account or verify", "compatibility unverified", "Bank compatibility has not been verified", "does not submit payments", "Notice delivery is disabled" (`QAOWNER-payroll-1440.png`).
     - Each line is honest, but together they read as unfinished on a page that should justify the higher tier.
     - TEAM-RULES says payroll copy changes only with approval, so this is a decision for Jose, not a UI fix.
   - *Impact:* Medium. *Effort:* S. *Owner:* Product.

9. **Give the pay statements module a value, or keep it off the price sheet.**
   - *What:* Before charging for statements, they need amounts imported from the provider and a Spanish PDF. Until then, sell "payroll prep and export" and leave statements out of the paid list.
   - *Why:*
     - The employee My pay page is an empty list (`AUDIT-E-emp-pay-390.png`).
     - The roadmap notes statements carry no amounts (U6).
     - A paid feature that shows nothing invites refund requests.
   - *Impact:* Medium. *Effort:* M. *Owner:* Product, Backend.

10. **Use branding as a tier lever.**
    - *What:* Logo and colour in every tier, as the competitive brief recommends (`competitive-2026-10.md:229`). Removing "Powered by VELANI LLC" and adding a custom Clocker welcome screen go in Pro.
    - *Why:* The footer shows on every Owner page (`QAOWNER-*-1440.png`, sidebar). Removing it is a cheap upgrade reason that costs nothing to maintain.
    - *Impact:* Low-Medium. *Effort:* S. *Owner:* Product, then UI.

## What's good

- **B2 modules are most of the entitlement plumbing:** hidden everywhere, refused on the server, and blocked from turning off while requests are still waiting (`modules.ts`, `blockerText`). Plan gating can reuse all of it.
- **Trust features no competitor sells:** punch receipts, append-only export receipts, effective-dated payroll settings with history, and the Owner-only payroll access grant (`QAOWNER-payroll-1440.png`). These support a "records you can defend" message to Puerto Rico owners worried about Department of Labor (DTRH) claims.
- **The Owner experience already feels premium and calm:** Today, Needs you and Working now on both phone and desktop. It demos well in a sales call once real data is in.

## Not checked / limits

- No browser, as the brief requires. Judgements come from the screenshots, which use fictional and mostly empty data. Insights at 0h may look different with real punches.
- Prices are hypotheses based on the October competitive brief's secondary sources (gusto.com and 7shifts.com were blocked). They are not validated with Puerto Rico owners.
- I did not check how Puerto Rico IVU applies to SaaS. An accountant needs to confirm it.
- I did not check the Lead and Manager views for upgrade-prompt placement, the hosting cost per tenant (needed for margin), or the Capacitor store route's effect on in-app purchase rules. Apple's guideline 3.1.3(f) for multi-user business services needs confirming before any sign-up flow inside the app.
