# Business foundations (branch `claude/business-foundations`)

October 21, 2026 · Base: `claude/auth-premium` (dd2c7204), the latest UI line · For Jose.

This branch holds the buildable part of the business review
(`docs/product/reviews/business-ui-review-2026-10-21.md`, revision 2) and the decision docs for the rest.

## Built here

| What | Where | Notes |
|---|---|---|
| Public landing page, EN/ES | `src/app/page.tsx`, `src/app/landing.css`, `src/lib/landing-copy.ts` | Signed-out visitors at `/` see it; signed-in people still land in `/app`. Language follows the sign-in pages' `nv-lang` cookie and switch. Copy claims only what the app does; the Spanish is a draft for Jose's review, like `auth-copy.ts`. |
| Production gate | `landingVisible()` in `src/lib/landing-copy.ts` | Production keeps the old redirect to `/app` until `NEVORA_LANDING=on` (same shape as `policiesVisible`). `NEVORA_LANDING=off` hides it anywhere. |
| Tests | `src/app/landing.test.tsx` | Renders EN and ES, signed-in redirect, the production gate, and the legal links. 18/18 pass with `legal-pages.test.tsx`; tsc and eslint clean. |

## Decisions for Jose

- `PRICING.md` — the commercial model: who pays, how much, how it's collected in Puerto Rico.
- `OBSERVABILITY.md` — error reporting, analytics, status page: what needs Jose's accounts, what Codex wires.

## For Codex

- `CODEX.md` — the labor-cost read route, named PR payroll-provider export presets, workspace data export.

## Still open (not buildable UI-side)

Billing/plan model in the workspace (after the pricing decision); full-app Spanish (approved A1/B5);
the tenancy PRD already in motion on `claude/multi-company-plan`.
