# For Codex — backend pieces behind the business review

October 21, 2026 · From the desktop session's business review (revision 2). Each item is independent;
none blocks the others. UI lands separately once the reads exist.

## 1. Labor cost read route (owner value, highest)

Insights shows hours but never dollars. Add a read-only route that returns, per period and location:
scheduled hours × rate, recorded hours × rate, and the delta — where **rate** is a new optional
per-position (or per-employee) hourly rate the Owner enters in Settings. No payroll coupling: the rate is
the Owner's own planning number, labelled as such, consistent with "trustworthy pay" (no projections shown
as fact). Needs: the rate field + migration, the read route, authority checks like the other owner reads.
UI (this side): a Cost card in Insights and a rate column in Settings › Positions, only when rates exist.

## 2. Named PR payroll-provider export presets

Time exports already has mapping profiles with revisions. Missing: presets named after the payroll
systems PR SMBs actually use, selectable without building a profile by hand. Research first — candidates
to verify locally: ADP, Paychex, and the PR-local processors accountants use (ask the first customers'
accountants; Evertec-adjacent payroll is common). Deliverable: 2–3 shipped presets ("Export for X") whose
column mappings an accountant has confirmed once.

## 3. Workspace data export

One Owner-triggered bundle: people, schedules, timecards, pay periods (CSV per entity + the canonical
JSON already produced by Time exports). Authority: Owner only; async job with a download like the export
page's. Trust feature ("you can leave") and the accountant-handoff answer.

## 4. Observability wiring

See `OBSERVABILITY.md` — Sentry/analytics includes env-gated behind `NEVORA_TELEMETRY`, a `GET
/api/health` (DB read + version, no tenant data), release tagging.

## Joint test after any of these merge

The desktop session re-runs its sweep on the touched pages (Insights, Settings › Positions, Time exports)
at 1440/768/390, 100–200% text, with the usual states.
