# NEVORA: senior UI and business review — what's missing

October 21, 2026 · Written for Jose at his request · **Revision 2**, re-verified against the latest UI code
(`claude/auth-premium`, dd2c7204, which contains the P4 desktop work, the sign-in redesign, the compliance
pages and the signature work). Revision 1 was read against the stale P4 worktree; Jose challenged two
claims, and he was right. Corrections are marked **[corrected]**.

## The short version

The product — and now its compliance layer — is in unusually good shape. What's still missing is the
commercial engine: NEVORA cannot yet be found, priced, paid for, or observed in production. Those gaps,
not the UI, stand between this codebase and a business.

## What revision 1 got wrong [corrected]

| Claim in rev. 1 | What the latest code actually has |
|---|---|
| "No Terms, Privacy, anywhere" | `/terms`, `/privacy`, `/support`, `/account-deletion` exist (`src/lib/legal/policies.ts`), with a fact-confirmation system: unconfirmed facts show `[CONFIRM_…]` in development, and production hides the pages until every fact is confirmed (`policiesVisible`). Deletion requests record the policy version they accepted. |
| "No support path" | `/support` exists, `support@thevelani.com` is the single source (`SUPPORT_EMAIL`), auth footers link it (`brand-legal.tsx`), and Profile carries the privacy/account links (`account-privacy-links.tsx`). |
| "Spanish reaches only the Clocker" | The four sign-in pages are fully bilingual behind the `nv-lang` cookie switch (`auth-copy.ts`, Spanish drafted for Jose's review). Full-app Spanish (A1/B5) remains roadmap, as approved. |
| "The tenancy decision is unmade" | `claude/multi-company-plan` carries a DB-per-company procedure and a tenancy PRD draft; defect fixes are on `claude/tenancy-defect-fixes`. The decision is in motion, not missing. |
| Dark mode "correctly parked" | `claude/sig-dark` is already merged into `auth-premium`; signature dark work is further along than the direction doc implied. |

## Still missing on the latest code (verified)

1. **A public front door.** `/` hard-redirects to `/app`; there is no landing or marketing page anywhere.
   → **Built on this branch** (`claude/business-foundations`): a bilingual landing at `/` for signed-out
   visitors, production-gated behind `NEVORA_LANDING=on` so nothing changes live without Jose. Signed-in
   people still land in `/app`.
2. **No pricing or revenue mechanism.** No plan concept, no billing, no collection method for PR
   (ATH Móvil / invoice / card). The pricing *decision* blocks the pitch more than the code does.
   → Options and a recommendation in `docs/product/business-foundations/PRICING.md`.
3. **No observability.** No error reporting, no product analytics, no uptime/status page in the codebase.
   → Plan and ownership split in `docs/product/business-foundations/OBSERVABILITY.md`.
4. **Owners never see dollars.** Insights has hours, attendance, overtime — no labor cost, no
   scheduled-vs-actual cost. The #1 owner-side reason to pay for scheduling. Needs a read route (Codex).
5. **No named PR payroll-provider presets.** The mapping-profile system in Time exports is strong
   (custom profiles, revisions, canonical JSON) — what's missing is 2–3 presets named after the providers
   PR SMBs actually use. Research + presets: `business-foundations/CODEX.md`.
6. **No workspace-level data export** for an Owner (people, schedules, timecards in one bundle) — trust
   ("you can leave") and accountant handoffs.

## UI notes that survive re-verification

- **Availability defaults to "0 of 7 days available"** (all toggles Unavailable): a new employee reads as
  un-schedulable until they act. Consider default-available or a forced first-run choice.
- **Cross-page count reconciliation** (Home "26 things" vs Inbox's breakdown) adds up today — worth one
  automated check, since those seams are where trust paper-cuts appear.
- `NUVORA_BRAND` vs the NEVORA wordmark: rename the constant while the codebase is young.

## What's strong (don't touch)

The role-fit IA; the trust language and no-optimism rules on pay; the policy fact-confirmation system (a
pattern most teams never build); the scorecard discipline and its rejections (EWA, open AI chat,
gamification); the PR wedge; the testing harness.

## The 30-day order, revised

1. **Pricing decision** (PRICING.md) — blocks the pitch.
2. **Confirm the remaining policy facts** so `policiesVisible` lets the legal pages ship; counsel review
   per direction §5.4 continues in parallel.
3. **Observability floor** (OBSERVABILITY.md) — error reporting first, analytics second, status page third.
4. **Turn the landing on** (`NEVORA_LANDING=on`) once Jose approves its copy — it's built and gated.
5. **Labor-cost v1 + named PR export presets** (CODEX.md) — the two features that most change the owner's
   buying decision.
6. **Tenancy**: finish the DB-per-company PRD already in motion before customer #2.
