# NEVORA 50-inspector review (October 21, 2026)

On October 21, Jose had 50 specialist reviewers inspect the whole product, each through one narrow lens. Every reviewer worked read-only on fictional data. The Wave A session ran the inspection and fixed the UI findings it owned.

This folder preserves the raw record, which was previously only in a temporary scratchpad.

| Item | What it is |
|---|---|
| [`BRIEF.md`](BRIEF.md) | The brief every reviewer received |
| [`QUEUE.md`](QUEUE.md) | The 50 lenses and their completion |
| [`reports/`](reports/) | The 50 reports, numbered 01–50 |
| `shots/` | 310 screenshots of every page the reviewers read: Owner `QAOWNER`, Manager `AUDIT-M`, Employee `AUDIT-E`, at 390 px and 1440 px |
| `q33/`, `q48/`, `q50/`, `qa49/` | The QA reviewers' probe scripts and outputs. The scripts point at local paths and session files that are **not** included here, so they are a record, not something to run. |

## The 50 lenses

The reports are grouped by lens:

- **01–10, business and product.** Value and pricing, market, the Owner, Manager and Employee journeys, reporting, payroll compliance, UX trends, real users, and the product scorecard.
- **11–22, design.** Each Manager area, plus navigation, states, forms, copy, the design system, brand, and tokens and dark mode.
- **23–27, accessibility and language.** Keyboard, screen readers, contrast and text, touch and motion, and Spanish (i18n).
- **28–39, front end.** Architecture, CSS, bundle size, runtime performance, React, unit tests, E2E strategy, PWA, responsive layout, cross-browser, data loading, and routing.
- **40–46, security, privacy, backend and operations.** Auth, data exposure, privacy, API contracts, database performance, reliability, and release.
- **47–50, QA testers.** Owner, Manager, Employee, and edge cases.

The reports tag findings as High (about 230), Medium (about 260) and Low (about 80). These are rough counts: several reviewers often reported the same problem.

## What happened to the findings

- **Fixed:** Wave A's commits `e5766609` and `bc2a28b2`, now in `development`. Separately, sign-in attempt limits and the end of Employee ID disclosure came through #18.
- **Fixed and remaining, in plain language:** [`docs/product/FIXED-AND-REMAINING.md`](../../FIXED-AND-REMAINING.md).
- **Backend items routed to Codex:** [`docs/product/specs/clean-manager/CODEX.md`](../../specs/clean-manager/CODEX.md). As of October 22, no commit fixes item 1, "Profile read always fails for Owner and Manager".
- **The release picture across every inspection:** [`docs/handoffs/2026-10-21-claude-to-codex-full-report.md`](../../../handoffs/2026-10-21-claude-to-codex-full-report.md).
