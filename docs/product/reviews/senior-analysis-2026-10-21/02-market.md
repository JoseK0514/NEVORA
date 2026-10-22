# NEVORA against the workforce-management market

- **Author:** market-strategist-pm, acting as senior business analyst for market strategy
- **Lens:** where NEVORA stands against the market, which table stakes it lacks, what to double down on, and what must exist before it can charge money
- **Date:** 2026-10-21. Launch is roughly this week.
- **Code evidence:** branch `NEVORA-UI-READINESS` (this checkout) and the read-only `claude/auth-premium` checkout (marked *auth-premium* below). Market facts come from [competitive-2026-10.md](../../competitive-2026-10.md) (2026-10-17, primary sources) and [gap-analysis-2026-10-20/market-analyst.md](../gap-analysis-2026-10-20/market-analyst.md) (2026-10-20). A fresh search on 2026-10-21 found no competitor launch since those dates, so their facts stand.

---

## 1. Positioning summary

NEVORA is a scheduling-and-time product with unusual record integrity, aimed at a market that competes on breadth. Against Homebase, When I Work, Deputy, 7shifts, Sling, Connecteam and Gusto's time tools, it already matches or beats the field on scheduling (`src/app/app/schedule`, deterministic drafts with explanations in `src/lib/scheduling/`), swaps and time off (`src/app/app/exchange`, `src/app/app/requests`), a shared bilingual kiosk (`src/app/clocker/[location]`), timecards and corrections (`src/lib/time-corrections/`), payroll document hand-off (`src/lib/payroll/`, `src/lib/payroll-export/`), and acknowledged one-way updates (`src/lib/communications/`). Its punch pipeline verifies every server reply against the exact command sent and keeps a per-employee recovery slot on the device (`src/lib/clocker/punch-client.ts:43-129`); no competitor we checked markets anything like it, while their reviews fill with wage-record distrust (17 Oct brief, theme 6).

It is behind on the features a buyer tries in the first ten minutes of a trial: clock-in from the employee's own phone with a location check, a store app, labor cost in dollars on the schedule, live overtime warnings, time-off balances, and two-way chat. All seven competitors sell all of these at $2 to $9 per user or $29 to $135 per location.

The deeper finding of this review: the product gaps are not what blocks selling first. NEVORA today can serve exactly one company per deployment (`src/lib/data/workspaces.ts` reads `FROM workspaces WHERE singleton=true`), has no billing or entitlement code anywhere in `src/`, and ships without Terms or a Privacy Policy (gap-analysis P0 #4). A second customer cannot exist, and the first cannot legally pay. The winning position is unchanged from the October briefs and gets stronger with the Signature redesign: **Puerto Rico's workforce app — Spanish first, Puerto Rico law built in, every hour on the record** — sold per location, with compliance in the base tier.

---

## 2. Top 10 gaps, ranked by how much they block selling

H/P/M columns summarise the seven-competitor matrix in the 20 Oct analysis; sources are listed there.

| # | Gap | Why it blocks selling | Competitors | What exists to build on | Evidence |
|---|---|---|---|---|---|
| 1 | **No way to onboard a second company.** One workspace per database, created by an operator script; no sign-up. | A sale cannot be fulfilled. Everything else on this list assumes this is solved. | All 7 are self-serve SaaS | Locator-aware session API and tenant proofs (section 5) | `src/lib/data/workspaces.ts` (singleton), `package.json` `setup:company`, `src/lib/tenancy/inventory/README.md` ("F10 remains IN_PROGRESS") |
| 2 | **No billing, metering or entitlements.** No plan record, no usage counter, no payment integration, no price list in `docs/`. | Nothing to charge with, and no way to express tiers. | All 7 publish tiers | B2 modules: five owner-toggleable modules, hidden and server-refused when off — a ready entitlement seam | grep of `src/` finds no billing code; modules in roadmap B2, migration 0032 |
| 3 | **No Terms, Privacy Policy or recorded consent; PR payroll maths runs on an Owner waiver with no CPA sign-off; hours export has no overtime split.** | An employer cannot sign, pay or pass an audit. Charging money without these creates liability, not revenue. | Standard everywhere | PR withholding engine with pinned official sources exists (*auth-premium* `src/lib/payroll/native/rules/pr-2026.ts`) | gap-analysis P0 #2, #3, #4; `src/lib/payroll/native/provisional-policy.ts` (*auth-premium*) |
| 4 | **No phone clock-in with a location check.** Clock-in exists only at the shared tablet. | The first thing tried in a trial. 7 of 7 have it; owners with mobile crews or a second site stop the demo here. | All 7 (Sling Premium from ~$2/user) | Idempotent punch commands, receipts and recovery slots transfer directly | no punch route under `app/api/employee/` (*auth-premium*); no geolocation call in either checkout |
| 5 | **No store apps, and no SMS fallback.** PWA only; alerts are web push and email. | Employers say "download the app"; iPhone staff without the installed PWA miss schedule changes. | All 7, rated 4.4+ | Capacitor spike PRD approved 17 Oct; dynamic branded manifest (`src/app/fuel-portal.webmanifest/route.ts`), SW + offline page (`public/fuel-portal-sw.js`) | 17 Oct brief §3, §8; section 6 below |
| 6 | **No labor cost on the schedule.** Hours only; no wage-based dollars, no budget line. | Owners decide in dollars. Priced from ~$2/user (Sling) to $120/location (Homebase), so buyers assume it. | 6 of 7 | Wage profiles in native payroll (*auth-premium* `src/lib/payroll/native/profiles.server.ts`) | `src/lib/reports/` has no cost line; `src/lib/employee-compensation.ts` is placeholder data used nowhere |
| 7 | **No live overtime or meal-break alerts.** Rules run at scheduling time only. | Sold at every tier level across the field, and PR's *daily* overtime (Ley 379 Art. 4(a)) makes silence a legal exposure for the buyer. | 5+ of 7 | Projected-overtime rules (`src/lib/scheduling/operational-rules.ts`) plus B4's shift-vs-punch comparison (`src/lib/clock-monitor.ts`) | 20 Oct analysis gap 4 |
| 8 | **No time-off balances or accruals.** Requests only. | Employees ask "how many days do I have?" in week one; Ley 180 gives PR a concrete accrual rule to encode. | Deputy, Connecteam, Gusto | Time-off requests and withdrawal flow (`src/lib/time-off-withdrawal.ts`) | 20 Oct analysis gap 5 |
| 9 | **One-way communication.** Updates with receipts, but no replies, 1:1 or group chat. | Free at Sling and Homebase; its absence reads as unfinished in a demo, though PR teams default to WhatsApp, so churn risk is low. | All 7 | Acknowledgement receipts (`src/lib/capabilities/types.ts`) extend naturally to replies | `src/lib/communications/` |
| 10 | **No hiring, onboarding paperwork or POS/payroll API integrations.** Export is CSV and an ADP RUN layout; imports cover four providers' result files. | Upsell revenue and switching-cost gaps rather than demo-stoppers for the services segment. POS matters only if restaurants become a target. | Mixed | Invitation activation and policy acknowledgement; `src/lib/payroll-export/model.ts`, `src/lib/payroll/contracts.ts` | 20 Oct analysis §4 |

Not on this list: AI. NEVORA's deterministic, explained schedule drafts are a defensible answer to "do you have AI scheduling", and every competitor now bundles AI free, so there is no revenue in matching their chat agents (17 Oct brief §5: copilot scored 7/16, blocked on Trust). Dark mode, full Spanish activation and device testing are tracked elsewhere.

---

## 3. Three differentiators and how to sharpen each

### 3.1 Receipt-and-recovery integrity ("every hour on the record")

`src/lib/clocker/punch-client.ts` does something none of the seven competitors describe: the client refuses to trust its own server. Every clock reply is schema-verified; a receipt must echo the exact `commandId`, action, and revision `+1` of the command sent, with matching entry versions, or the UI treats the punch as unconfirmed (`parseReceiptReply`, lines 43-64). An unconfirmed punch is preserved per employee in a device recovery slot that cannot be silently overwritten (`saveSubjectPendingPunch`, lines 104-109) and is retired only against fresh verified state (`canRetirePendingPunch`, lines 123-130). Server-side, the same discipline shows up in payroll: PR withholding rules pin the official Hacienda PDF by SHA-256 (*auth-premium* `src/lib/payroll/native/rules/pr-2026.ts`, `PR_2026_RULE_SOURCES`).

Competitor reviews show the demand: forced edits with no trail (Connecteam), phantom 24-hour clock-ins (Gusto), summaries employees cannot check (Rippling) — 17 Oct brief, theme 6.

**Sharpen it:**
1. Make the receipt visible to the employee: a "My time receipts" view with who/when/why on every punch and correction. The data exists; this is UI (scored 15/16 in the 17 Oct brief, rank 7).
2. Ship B6 offline punches as the same story. The recovery-slot machinery is most of an offline queue already; two honest states ("Saved on this device" / "Confirmed, receipt") turn PR's grid outages into a sales advantage no competitor claims (scored 15/16).
3. Name it in marketing and in the store listing. "Verified punch receipts" is a claim the code can back and reviews prove people want.

### 3.2 Puerto Rico depth: language plus law

The field's position: Gusto's terms exclude US territories from payroll, and Gusto, Rippling and Sling list English as their only App Store language (17 Oct brief §1, §7.2). NEVORA already has PR Spanish second lines and a per-tablet Spanish toggle on the Clocker (roadmap U9), EN/ES vocabulary slots (B2, `src/lib/workspace-presentation/words.ts`), the PR Monday-midnight week split, and a PR withholding engine with SINOT and FICA sources pinned (*auth-premium*). No competitor has any PR preset.

**Sharpen it:**
1. B5 full Spanish is the single highest-leverage pending item: today the portal renders `lang="en"` and the invitation email is English-only (gap-analysis P0 #6). Ship employee surfaces first; es-PR store metadata when the app ships.
2. Ley 379 rules pack (meal timing and penalties, daily/weekly overtime, stipulation records) plus Ley 180 balances, **in the base tier** — compliance as an upsell erodes exactly the trust that makes it a reason to switch. Counsel sign-off is a hard gate (17 Oct brief §7.1).
3. Fix the export first: the hours export sends totals with no regular/overtime/meal-penalty split (gap-analysis P0 #3), which undercuts the compliance story at the point where it touches pay.

### 3.3 The premium brand, systematised

The Signature redesign gives NEVORA a look incumbents cannot match quickly — and the market just demonstrated the cost of getting this wrong: Gusto, When I Work and Rippling all took review-score damage from September 2026 redesigns that broke muscle memory (17 Oct brief §1). NEVORA also ships safe company branding at the entry level: one logo and colour, derived in OKLCH under contrast floors (B1, `src/lib/workspace-presentation/derive.ts`), where Connecteam only recently added a welcome screen to its Basic tier.

**Sharpen it:**
1. Write Signature down. `DESIGN.MD` still documents the older teal system, and the UI carries 344 unique colours and ~291 `!important` (gap-analysis UI #14-15). An undocumented brand erodes with every fix and blocks dark mode and tenant branding.
2. Keep branding and Spanish in the entry tier and say so on the pricing page — honest packaging is a stated complaint theme (theme 7) and a cheap trust win.
3. Use the look where buying decisions happen: store screenshots, the demo workspace, the first-run owner experience.

---

## 4. Pricing and packaging readiness

**What the code has today: nothing metered, nothing tiered.** No payment dependency in `package.json`, no plan, subscription or entitlement record in `src/`, no price list in `docs/`. Two pieces of real packaging machinery exist: **B2 modules** (five modules an Owner can disable; a disabled module is hidden and refused server-side — the natural seam for plan entitlements) and **B1 branding**. Counting seats is possible (`employees` with `active`), but nothing aggregates usage for invoicing.

**What a price needs, in build order:**

1. A plan record per workspace and entitlement checks at the module seam (extend B2's on/off to "included in plan").
2. Metering: active employees and active locations per billing month, derived from existing tables.
3. External billing (e.g. Stripe) for invoices, cards, dunning; NEVORA should not build money movement. PR sales-tax treatment of SaaS (IVU) needs a CPA — unverified.
4. A public price list and in-product tier limits that match it.

**Recommended shape** (consistent with the 20 Oct pricing read-out): price **per location**, not per user — Homebase ($0/$30/$70/$120) and Connecteam set the pattern, and per-user pricing punishes the segment's seasonal hiring. A plausible anchor: entry at **$29–39/location** (scheduling, Clocker, phone clock-in when it exists, Spanish, branding, PR pack), a middle tier at **$69–89/location** adding labor cost, live alerts and Insights, with payroll-document workflows above that. The entry tier must beat Homebase Basic (1 location, 10 staff) in a demo. Keep tiers few, caps visible, and no per-document fees; add-on resentment is a documented churn driver (theme 7). Bundle the explained schedule drafts — the market has set AI's price at zero.

---

## 5. Multi-tenant readiness

**Today is single-company by construction.** The canonical workspace read is `SELECT ... FROM workspaces WHERE singleton=true` (`src/lib/data/workspaces.ts`), every business write re-guards against that singleton row (`workspaceReadGuard`), and a new company means an operator running `scripts/setup-company.mts` against an empty database.

**But the tenancy layer is already tenant-shaped.** Every proof the resolver issues carries `workspaceId`, `workspaceVersion` and `workspaceIncarnation` for portal, Clocker, calendar and worker callers (`src/lib/tenancy/types.ts`); the session API already takes a workspace locator in its path (`src/app/api/workspaces/[locator]/session/route.ts`); provisioner purposes for `TENANT_BOOTSTRAP` and `TENANT_RESTORE` are defined; and locator storage DDL exists with row-level security scaffolding. The same files say how far this is from done: the locator storage header reads "Unused empty private workspace locator storage; actual installation is separately authorized … assignment/distribution … remain unimplemented", with real RLS policies, resolver installation and recovery reconciliation "OPEN" (`src/lib/tenancy/runtime/workspace-locator-storage.sql`), and the inventory tool states "F10 remains IN_PROGRESS" (`src/lib/tenancy/inventory/README.md`). The 12 Oct plan notes SaaS is paused (gap-analysis P0 #1).

**What stands between this and a second company:**

1. An architecture decision Jose and Codex must make: database-per-company (works now, scales to a handful, operator-run) versus finishing F10 for shared infrastructure (locator assignment, installed resolvers, real RLS, catalog-writer adoption, tenant restore rules).
2. A company-creation path that is not a hand-run script: operator-run provisioning with the existing `TENANT_BOOTSTRAP` purpose is the honest near-term version.
3. Per-tenant operations: backup and tested restore per company, incident isolation, data export on churn. The manifest and branding already resolve per workspace, so the presentation layer is ready.

**Recommendation:** sell the first two to five companies as managed pilots on database-per-company. It matches the code as it stands, defers none of the trust work, and buys time to finish F10 properly rather than under a sales deadline.

---

## 6. App-store route

The 17 Oct comparison (Capacitor vs Expo/React Native vs TWA, criteria fixed in advance) was approved at Checkpoint 1 and nothing has changed in the code to alter it: still 50+ server-rendered pages, so a static export is off the table; still one CSS design system worth protecting. **The recommendation stands: Capacitor over the live Next.js app, for iOS and Android**, because it is the only route that passes all three thresholds (a credible Apple 4.2 path with native capabilities; one UI codebase across desktop web, mobile web, PWA and stores; the existing WCAG 2.2 AA verification carries over). Expo/React Native stays the fallback if Apple rejects twice; a TWA remains a cheap optional early Play listing under the same package name.

Two updates from this review: the Signature redesign materially helps the 4.2 case only when paired with native capabilities, so the spike's four proof points are the priority order — (a) passkeys in WKWebView, (b) App-Bound Domains with the existing service worker, (c) one Live Activity, (d) a TestFlight submission on fictional data; and the punch recovery slots in `punch-client.ts` mean the offline-punch mitigation is cheaper than the 17 Oct estimate assumed. Sequence the store build **after** phone clock-in exists; a store listing whose first review says "can't clock in from my phone" wastes the launch.

---

## 7. Sequencing: what must exist before charging money

Scorecard (0-2 per line: Usability, Familiarity, Trust, Accessibility, Brand, Durability, Cost, Continuity; 12/16 to proceed, 0 on Trust/Accessibility/Usability blocks). Product bets 4-6 keep their prior scores; the two new platform items are scored here.

| Order | Item | Gates | Draft score |
|---|---|---|---|
| 1 | Terms, Privacy, consent, correct support identity; CPA sign-off or documents-only positioning for payroll; OT split in the export | Counsel, CPA | Not a scorecard item: a legal precondition |
| 2 | Monitoring, health checks, tested restore (final-release-checklist items are unchecked) | Codex | Precondition |
| 3 | Managed-pilot tenancy: DB-per-company provisioning via `TENANT_BOOTSTRAP` | Jose + Codex decision | U1 F2 T2 A2 B1 D1 C2 Co2 = **13** |
| 4 | Phone clock-in, location only at the punch | Decision A20 | **14** (20 Oct) |
| 5 | Billing and entitlements on the B2 module seam, per-location pricing | Pricing decision | U2 F2 T2 A2 B1 D2 C1 Co2 = **14** |
| 6 | Labor cost + live overtime alerts; PR pack v1; B6 offline; then the Capacitor build | Counsel for PR pack | **14 / 14 / 15 / 13** (20 Oct) |

The order is deliberate: items 1-3 are what "selling" means; items 4-6 are what makes the sale repeatable. Charging a single pilot customer is possible after step 3 with manual invoicing; charging the tenth requires step 5.

---

## 8. Open and unverified

- PR IVU tax treatment of SaaS subscriptions: not checked; CPA question.
- PR biometric and geolocation privacy rules for a location-at-punch feature: counsel question flagged on 17 Oct, still open.
- Competitor facts newer than 2026-10-20: a 2026-10-21 search found nothing new, but Homebase, Deputy and 7shifts newsrooms were not individually re-crawled.
- Native payroll launch readiness is read from code, not a release plan; treat as in development.
- Price anchors in section 4 are this author's judgment against the documented competitor bands, not tested willingness-to-pay.
