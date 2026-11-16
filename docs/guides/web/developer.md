# NEVORA web developer guide

This distribution describes the accompanying development source. Its manifest
binds source and guide bytes; it does not establish provider activation, hosted
acceptance or production authorization. The broader
[developer reference](../../development/developer-guide.md) supplies additional
contract detail. Native apps and native push remain a separate track.

## Establish your working source

Read [AGENTS.md](../../../AGENTS.md), the relevant repository skills,
[package.json](../../../package.json), tests and the code you intend to change.
Fetch and reconcile `origin/development` before new integration work. Inspect
status and ownership; preserve other agents' changes and use a detached worktree
for isolation. Only `development`, `main` and `claude-codex-collab-nevora` are
active branches under the current policy. Main and production require Jose's
explicit authorization.

Run `npm run check:development-sources` after fetching before assembly. Its
[inventory](../../handoffs/2026-10-21-development-assembly-sources.json) detects
drift; it does not merge or approve sources. Record exact candidate identity,
changed scope, checks actually run and remaining gates in the handoff.

## Architecture and source ownership

The app uses Next.js App Router, React, TypeScript and PostgreSQL/Neon. The current
company model has one company per database, a singleton workspace, locations and
explicit employee eligibility. Isolated-company onboarding uses a separate
control registry and guarded runtime bindings; its existence does not authorize
changing an existing single-company deployment.

| Layer | Responsibility and entry points |
| --- | --- |
| Protected shell and pages | `src/app/app/layout.tsx`, `src/app/app/**/page.tsx`, components and nearby server actions |
| Transport | `src/app/api/**/route.ts` and domain HTTP modules validate envelope, origin, size and inputs |
| Identity and authority | `src/lib/auth/`, `src/lib/company-access/`; obtain current server session/proof and current scope |
| Business rules and commands | Scheduling, shift changes, time corrections, payroll, notifications, onboarding and Owner-advisor modules under `src/lib/` |
| Persistence | `src/lib/data/`, guarded domain stores and `src/lib/db.ts` |
| Installation/runtime | `db/migrations/order.ts`, company setup and `src/lib/tenancy/`; use recorded migration/source contracts |
| Private operations | `src/lib/operations/`, `ops/workforce/`, canonical worker entry points |

Trace a real command end to end before editing. A typical path is a form/server
action or API route, parser/service, guarded transaction and bounded response or
receipt. Presentation and pure validation do not establish database authority.
Keep business decisions, transport, UI and data access separate. Claude owns
product UI; coordinate a contract before changing that surface.

## Preserve these contracts

- **Current authority:** `OWNER`, `MANAGER`, `LEAD` and `EMPLOYEE` are access
  roles, not positions. Manager operational scope is an Owner-assigned current
  company/location grant. Payroll grants and financial-object coverage are
  separate. Recheck authority at protected read/write boundaries and across
  awaited work; navigation filtering alone is insufficient.
- **Receipts and uncertainty:** retain the original operation ID and immutable
  command when recovering an uncertain result. A timeout can follow a committed
  write. Use the workflow's own recovery protocol; not every mutation implements
  the same receipt contract.
- **Reviewed versions:** preserve expected revisions, source fingerprints and
  review tokens. Do not refresh tokens behind the user to force a stale command
  through. Drafts, published schedule snapshots and acknowledgements are separate.
- **SQL versions:** preserve microsecond timestamp text under the owning
  transaction’s UTC, ISO/YMD and READ COMMITTED contract. Follow the
  [upgrade compatibility procedure](../../handoffs/2026-11-11-r14-timestamp-contract.md)
  for Owner invitation reissue and fresh review. A merge performs no hosted migration.
- **Time and money:** calendar labels differ from instants and elapsed time.
  Use the workspace timezone and existing helpers. End-of-day `24:00` differs
  from the start-of-day `00:00`. Preserve exact payroll minor units, rounding and
  recorded-source rules.
- **Private reads:** ready-empty, unavailable, denied and expired are distinct.
  Private browser snapshots expire and clear on access/lifetime changes. Ignore
  late results from an older navigation, session or request.
- **Feature gates:** gate pages, actions and APIs as well as navigation. The
  communications D04 hold requires owned disposable local data; a feature flag
  is not a live activation bypass.
- **Rondo:** model tools read bounded evidence. Coverage mutations require the
  explicit Owner-reviewed command and commit-time checks. Saved goals are intent,
  not authority. Provider configuration does not prove provider authentication.

## Onboarding and worker boundaries

Production admission defaults closed. The approved-recipient mode is a bounded
inbox fence, not public signup. Mixed open admission plus a production inbox
fence fails closed. Registration rejection precedes persistence. Provider
creation requires explicit capacity policy, including the bounded total-project
cap; pending/unknown attempts retain capacity until safely reconciled.

Keep the web, provisioner, enrolled worker and independent monitor principals
separate. Do not expose privileged bootstrap or management credentials to the
browser/web process. Fresh-company installation, existing-company upgrade and
restore are different operations; never rerun the fresh seed chain on an existing
company. See [self-service operations](../../runbooks/self-service-onboarding.md)
and [worker enrollment](../../../ops/workforce/ENROLLMENT-RUNBOOK.md).

## Reviewed roster import

The same-company Owner APIs `POST /api/onboarding/roster/preview` and
`POST /api/onboarding/roster` parse and atomically create reviewed profiles.
CSV/TSV is limited to 50 rows; the existing company plan limit remains enforced.
These endpoints create no credentials and send no invitations. Employee IDs,
roles, catalogue choices and Manager scope use canonical employee commands;
unknown outcomes reuse the original operation ID. Invitations are a separate
explicit review and existing batch command. See the
[backend/UI contract](../../handoffs/2026-11-14-owner-simplicity.md) for exact
request/response shapes, validation and recovery. The backend contract does not
establish that Claude's import UI or hosted rollout is available.

Directory position-source failures remain unavailable instead of silently
substituting access roles. Calendar-derived payday labels describe a scheduled
payday, not evidence that money was paid.

## Verify safely

Inspect scripts before execution and use the version/locked dependencies in the
current CI configuration. The declared `build` and `start` run Next.js directly;
setup, workers and database harnesses have separate side effects. Read the
engineering-toolkit README before using shared utilities.

For an ordinary code change, run the relevant focused regression first, make the
smallest fix, and rerun it. The normal static/unit checks are:

```bash
npm test -- --maxWorkers=1
npm run typecheck
npm run lint
```

Use the specific owned PostgreSQL/browser runner for integration evidence. Read
its ownership and cleanup controls first; use fictional, invocation-owned data.
Never point tests at customer databases or use real SMTP/push as a fixture. A
worker invocation can create jobs, documents or deliveries; it is not a harmless
health probe. Do not run migrations by filename order.

Follow [CI](../../../.github/workflows/ci.yml) for source-bound builds and
SQL/browser/package gates. Phase E requires six leaves and all 70 combinations:
separate Home engines run seven widths each; other suites run both. Existing
limits apply; missing, duplicate or mismatched evidence fails aggregation.
Preserve failures, skips and independent findings. Record source SHA,
environment, command, result and artifact identity; distinguish local, CI,
development, hosted and production acceptance.

For guides, validate links/evidence, rebuild and verify PDFs with checked-in
tooling. Never relabel older PDFs or hosted receipts. Keep secrets and private
test content out of Git, logs and support records. See the
[operations guide](operations.md) for deployment custody and incident boundaries.

## Calculation policy and test selection

Payroll availability and calculation policy are separate. New work defaults to
`NEVORA_PAYROLL_CALCULATION_MODE=external`, even with native tables installed.
`native_provisional` is an explicit operator/test opt-in, not customer approval.
Preserve historical statements and receipts; Manager access administration stays
available in external mode. See the [backend contract](../../handoffs/2026-11-15-inspection-backend-remaining.md).

Provider runs and their new documents retain factual location coverage from
protected source reads, including retained time-entry history. Manager grants
continue to apply to that coverage. Correction parents are authorized by exact
ID even outside the latest-300 display window and rechecked before returning a delta.

The [test inventory](../../handoffs/2026-11-15-test-projects.md) names every test
configuration. `npm test` runs the unit project. Use existing owned runners for
SQL/browser projects; their admission and cleanup are still mandatory.

## Integrated backend contracts and remaining consumers

The [Phase 5 contract index](../../handoffs/2026-11-16-backend-phase5-claude-contract-index.json)
joins the reviewed financial, scheduling/decision and access/reminder contracts.
It records the actual qualification source separately from each original phase
commit. Consult its final source/evidence binding before claiming a tested or
deployed capability.

- Finance retains CSV/JSON exact amounts, immutable correction artifacts,
  per-break paid-time review and byte-aware whole-employee export batches.
  Successful batch receipts do not establish a complete period manifest or a
  verified downstream provider import. Recover original operations unchanged.
- Scheduling exposes typed independent-review eligibility, complete versus
  observed task totals, effective restriction versions, historical coverage
  outcomes and explicit report/coverage units. Null, partial and unassigned
  facts must not become zero, complete, overdue or a named reviewer.
- Reminder eligibility is read-only and currently scoped. Persisted queue
  receipts do not establish provider/device delivery. Shared recovery, activation,
  last-Owner and request-local support-reference protections remain required.

Session-ended explanations require a presented session cookie. Proxy replaces
the internal `x-nevora-auth-return-to` marker with the actual allowlisted request
path and strips caller markers on other matched routes, including auth bypasses.
Session code applies `safeReturnTo` again. Referer, Host and forwarded-host values
establish neither a prior session nor a return destination; the hint grants no
business authority. Language remains validated cookie/Accept-Language handling.

Claude must still implement the indexed consumers and qualify their current
mobile/keyboard/EN/ES/private-state behavior. Revisit user-guide instructions
after those consumers change; source-qualified PDFs alone do not pass an unwired
journey. Rondo knowledge/provider/tool work and actual-model quality evidence
remain with its existing owner. Hosted/provider activation and physical-device
acceptance remain separate from local backend checks.


## Phase5 source and contract handoff

Use the [consolidated backend contract index](../../handoffs/2026-11-16-backend-phase5-claude-contract-index.json) and [Development publication record](../../handoffs/2026-11-16-backend-phase5-development-publication.json) for current source and check bindings. [Remaining UI, hosted and Rondo dependencies](../../handoffs/2026-11-16-backend-phase5-remaining-dependencies.json) are separate acceptance work; this source-qualified guide does not certify provider activation or an operating release.
