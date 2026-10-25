# NEVORA developer guide

This guide maps the current `development` application. Start with
[`AGENTS.md`](../../AGENTS.md), [`package.json`](../../package.json) and the code
for the workflow you are changing. Historical phase documents record decisions
at a point in time; their presence does not mean a feature is enabled or deployed.

## Current application and vocabulary

NEVORA is a Next.js App Router application using React and TypeScript with
PostgreSQL/Neon data access. The current delivery configures **one company per
database**, with a singleton workspace, multiple locations and explicit employee
eligibility. Company identity and business timezone come from stored data. See
the [single-company delivery scope](../execution/single-company-20261012.md).

`OWNER`, `MANAGER`, `LEAD` and `EMPLOYEE` are access roles. Operational positions,
location eligibility and designated shift leadership are separate concepts.
Manager authority can be company-wide or limited to locations; checking the
string `MANAGER` is insufficient for an operational mutation.

Some internal names still say `fuel` or `NUVORA`. Treat protocol names, cookie
names, database function names and public asset paths as compatibility contracts;
renaming them requires checking their consumers.

## Where to look

| Area | Entry points and responsibilities |
| --- | --- |
| Document and protected shell | [`src/app/layout.tsx`](../../src/app/layout.tsx) sets the public document; [`src/app/app/layout.tsx`](../../src/app/app/layout.tsx) requires a session and projects capabilities into [`AppShell`](../../src/components/app-shell.tsx). |
| Pages and forms | `src/app/app/**/page.tsx` composes reads/views; nearby `actions.ts` files adapt form submissions into server commands. `src/components/` contains client interaction and presentation. |
| HTTP boundaries | `src/app/api/**/route.ts` handles request transport. Shared boundaries such as `lib/payroll/http.ts` and `lib/time-corrections/http.server.ts` implement envelope/origin/body checks. |
| Session and identity | [`lib/auth/session.ts`](../../src/lib/auth/session.ts), `permissions.ts`, recovery/invitation/passkey services, and [`lib/company-access/`](../../src/lib/company-access). |
| Operational authority | [`lib/company-access/operational-scope.server.ts`](../../src/lib/company-access/operational-scope.server.ts) admits and rechecks current scope; operational readers return scoped projections. |
| Persistence | [`lib/data/`](../../src/lib/data) holds queries, guarded transactions, publication snapshots and command receipts. [`lib/db.ts`](../../src/lib/db.ts) provides the SQL connection boundary. |
| Scheduling rules and generation | [`lib/scheduling/`](../../src/lib/scheduling) contains validation, periods, coverage, copy plans and the generation solver. Data orchestration lives in `data/schedule-generation.ts` and related modules. |
| Shift changes and time off | `lib/shift-changes/` parses/evaluates commands; `data/shift-changes.ts`, `data/requests.ts` and related writers persist state and receipts. Server actions live under `app/app/exchange` and `requests`. |
| Clocker | [`lib/clocker/`](../../src/lib/clocker) separates device enrollment, PIN authority, transport validation, punch commands, schedule context and recovery review. |
| Recorded time | `lib/attendance/`, `lib/time-corrections/` and `lib/timecards/` project recorded punches, corrections, review evidence and exportable periods. |
| Payroll | [`lib/payroll/`](../../src/lib/payroll) separates HTTP/contracts, command orchestration, scheduling, jobs, documents and native calculation. `lib/payroll-export/` exports time data; it is distinct from payroll calculation and payment instructions. |
| Notifications and communication | `lib/notifications/` owns subscription/delivery policy and worker behavior. `lib/communications/` owns communication commands, projections and recovery. |
| Home and management work | `lib/action-center/`, `lib/owner-advisor/`, `lib/reports/` and data readers compose existing operational facts. Read projections do not themselves change assignments. |
| Workspace presentation | [`lib/workspace-presentation/`](../../src/lib/workspace-presentation) owns derived brand tokens, vocabulary, module switches and revisioned saves. |
| Tenancy/runtime contracts | [`lib/tenancy/`](../../src/lib/tenancy) contains capability resolution, source/catalog checks and installation contracts. Some material supports held work; do not infer current multi-company provisioning from its existence. |
| Database installation | [`db/migrations/order.ts`](../../db/migrations/order.ts) is the migration ordering authority; [`db/migrations/README.md`](../../db/migrations/README.md) explains base, final and held migrations. |
| Verification | Co-located `*.test.ts(x)` files cover helpers/services/components; `src/test/integration/` and dedicated `vitest.*.config.mts` files cover environment-specific suites. |

Paths beginning `lib/` in this table are relative to `src/`. TypeScript's `@/`
alias also resolves to `src/`, as configured in `tsconfig.json`.

## Follow a request through the layers

1. A page, client fetch or form supplies selectors and command fields. Treat all
   submitted IDs, roles, versions and URLs as untrusted.
2. The route/server action validates the transport and obtains the current
   session or `SessionMutationProof`. The proof contains server-side identity and
   a session-token hash; it must not be serialized into client state.
3. The domain service/parser evaluates the workflow contract. Pure projections
   and validators do not establish database authorization.
4. The data writer executes protected reads/writes with current session, scope,
   version and source guards as required by that workflow. A preflight read or
   successful role check cannot replace commit-time checks.
5. The adapter returns a bounded projection/receipt, or revalidates and redirects.
   Next.js `redirect()` ends execution by throwing; keep it outside generic
   catches unless the existing action deliberately handles it.

For examples, trace `app/app/schedule/actions.ts` into `data/schedules.ts` and
`data/publication-revisions.ts`, or `app/api/payroll/runs/route.ts` through
`payroll/http.ts` into `payroll/service.ts`. Each workflow has its own guards;
do not assume that every exported data reader is independently authorized.

## Contracts that are easy to break

### Operation IDs and uncertain outcomes

Many writes pair an immutable command with an operation ID and a stored receipt.
A network failure can happen after commit. An `outcome-unknown`/unconfirmed result
therefore means “check the same operation,” not “the write failed.” Reconciliation
must preserve the original ID and payload; a new ID can create a second action.

See `components/shift-change-form-state.ts`, `components/payroll/use-payroll.ts`,
`data/schedule-copy.ts` and the workflow's service tests. Not every write has a
receipt protocol: Clocker device administration, for example, asks the user to
refresh state after an uncertain mutation. Follow the specific contract.

### Versions, source snapshots and publication

Fields such as `expectedUpdatedAt`, `expectedVersion`, `expectedRevisionId` and
review/source tokens refer to what the user actually reviewed. Preserve them
through the adapter; do not replace them with a fresh value to make a stale
command pass. Original-scope checks around awaited work detect authority changes.

Draft assignments, published schedule revisions, acknowledgement receipts and
clock-in schedule context serve different purposes. Employee-facing published
facts and historical attendance evidence must not silently follow later draft
edits. See `data/publication-revisions.ts`, `data/acknowledgements.ts`,
`clocker/schedule-source.server.ts` and `attendance/historical-schedule.ts`.

### Calendar labels, instants and units

`date-utils.ts` performs calendar-label arithmetic with UTC noon. It does not
calculate elapsed payroll time. `business-time.ts` converts local boundaries with
the configured business timezone and rejects unresolved local times.

Availability/coverage windows can use `24:00` as end-of-day. It differs from
`00:00` at the start of the same written date. Week-start labels are Mondays;
recurring day-of-week fields use Sunday=0. Read the relevant type/helper before
mixing representations.

Native payroll uses explicit minor-unit amounts, rational arithmetic and precise
durations. Keep the serialization/rounding contracts in `payroll/native/money.ts`
and the calculation modules; converting values to floating-point dollars can
discard evidence or change totals.

### Private browser state

[`private-snapshot-client.ts`](../../src/lib/private-snapshot-client.ts) owns
expiring in-memory reads. Visibility/connectivity hooks must pause or stop it,
clear private snapshots and ignore late responses. Its validity budget subtracts
request time and remains armed during renewal.

View-authority headers bind a panel to a session lifetime; they do not authenticate
a request. Cookie/session and database checks still apply. `null`, unavailable,
access denied and a ready-but-empty result are distinct states. Never turn an
unavailable read into a confirmed empty list or a successful action.

`navigation-coordinator.ts` and `components/app-navigation.tsx` coordinate current
navigation and deferred identity refreshes. A completion from an older transition
must not release the current transition's barrier.

### Module switches and database source contracts

Hiding navigation is insufficient to disable a module. Pages/actions/APIs use
their module gate too. Presentation read failures have different display and
gate behavior; gates use strict reads so an outage cannot reopen a saved disabled
module. See `workspace-presentation/current.server.tsx` and `service.ts`.

Runtime SQL installation/source checks and some tooling compare exact stored
source or parse literals. Even a comment inside a SQL string can affect those
contracts. For a documentation-only change, add TypeScript lexical comments
outside strings and keep migrations/runtime SQL/generated material unchanged.

## Working locally and verifying a change

Start from freshly fetched `origin/development` in an isolated checkout. Inspect
scripts before running them and keep secrets in approved private stores.
The package declares `next build` and `next start` directly; neither installs
migrations. Setup/worker/integration commands have separate side effects.

```bash
npm ci
npm test -- --maxWorkers=1
npm run typecheck
npm run lint
```

The single-worker setting matches the required CI unit-test invocation. Tests
that require owned databases or browser runtimes have separate entry points;
skipped integration tests are not evidence those integrations passed. See
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) for required release
checks and the test configuration for environment prerequisites.

For database verification, read `src/test/integration/local-postgres.ts` and the
specific owned runner first. Use isolated fictional data and explicit ownership
markers. Never reuse a live database or send real messages as test fixtures.
Do not run `notifications:worker` or `payroll:worker` as a health check: they can
persist jobs/deliveries/documents and invoke configured providers.

Never apply migrations by filename order. Fresh installation uses
`scripts/setup-company.mts`/`company-setup.ts` and an explicitly selected setup
database. Updating an existing database follows its runbook; held migrations
remain held. Builds, a green unit suite and a push are separate from hosted or
production verification.

## Keeping comments useful

Add JSDoc to significant public methods with the contract a caller needs:
purpose, units/input shape, side effects, caller responsibilities and meaningful
failure/return states. Add inline comments where ordering, locking, compatibility
or business rules explain a non-obvious choice. Link the matching tests when the
contract spans several modules.

Do not restate obvious assignments or infer guarantees from a method name. Check
the implementation and tests, then update the comment in the same change as the
contract. Leave existing accurate documentation intact. Any new claim such as
“atomic,” “authorized,” “idempotent” or “exact” needs a corresponding mechanism in
the implementation and evidence in its tests.
