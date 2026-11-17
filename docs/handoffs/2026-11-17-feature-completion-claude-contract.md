# Existing feature completion — Claude and integration handoff

November 17, 2026, America/Puerto_Rico. Jose confirmed: **Keep Claude on UI;
handle backend and integration.** This handoff continues his supplied six-area
verification report; it does not declare those areas complete.

## Source, ownership and environment

Combined baseline: `e8181384fc98d3c0edd988ae1cfc04819f63d2ee`, freshly fetched and
verified with the 73-source / three-active-branch development inventory. Work is
isolated at `/Users/josek0514/.codex/worktrees/nevora-feature-completion-20261117`.
The collaboration checkout and its existing untracked files are preserved.

Development is the operating and acceptance release, held to production standards.
Codex owns backend/hosting/integration; Claude owns presentation, forms, navigation
and browser acceptance. The existing Rondo owner retains backend/model evaluation
and sealed evidence custody. No UI-owned file, schema, feature flag, authorization
rule or provider configuration was changed by this pass. Main/production,
customer-data testing, real delivery and paid model runs remain separate.

The backend implementation delta is `src/lib/support-reference.ts`, with its unit
tests and an updated actual reminder HTTP error test. Existing server logging and
domain bodies are unchanged. Final source, checks and delivery state are recorded
in the accompanying backend/integration handoff and evidence receipt.

## U11: ready-to-use diagnostic reference contract

Import `readSupportReference` from `@/lib/support-reference`. It is client-safe,
stateless and reads only `X-Nevora-Request-Id` from the supplied response. It accepts
the logger's complete UUID syntax and otherwise returns null. It neither reads
the body nor substitutes an operation ID, deletion reference or previous error.

```ts
const response = await fetch(/* existing route and authority contract */);
const supportReference = readSupportReference(response);
// Keep this reference with this response's failure state before reading JSON.
// Existing receipt lookup, conflict and uncertain-mutation handling still apply.
```

Claude owns the actual display/copy affordance and EN/ES copy. Label it **Support
reference**; omit the reference when absent. Bind it to the same active request,
account/authority and error lifecycle as the response. Retire it when that request
is superseded or access changes; this pure reader does not manage UI freshness.
Never put raw errors, workforce/pay data, credentials or recovery proofs in copied
support text. Do not collect or send it automatically.

Local HTTP evidence covers a forged incoming UUID, a real route's unexpected error,
the validated outgoing reference, unchanged safe error body and the exact matching
sanitized stderr event. The transport/service dependency is deliberately stubbed
to throw a fictional error; this is a local contract drill, not a hosted incident
or an authenticated support-team drill. The separate interleaved-request logger
tests prove response-local IDs and no ID on ordinary expected refusals.

For an authorized operational drill, record the selected environment/deployment,
time and static route; locate that reference in its existing sanitized stderr
stream and follow the domain operation's recovery procedure. A reference proves
neither identity nor mutation outcome. Hosted log access, responder custody and
physical-device behavior still require actual evidence from their owners.

## Remaining consumers and their acceptance cases

| Work | Existing backend source / contract | Claude's acceptance case on the combined candidate |
| --- | --- | --- |
| U01 / SCRUM-197 — external payroll | `payroll/contracts.ts`, `payroll/model.ts`, `payroll/csv-import.ts`; [Phase 2 contract](2026-11-16-backend-phase2-claude-contract.md) | Load the real authorized roster, explicitly match imported employees, upload CSV and JSON with exact cents, inspect/correct linked amounts, review and publish only after current server authority/source checks. Preserve complete original body/operation through lost replies and recover its receipt before changed input. Include inactive/zero/excluded roster dispositions rather than silently omitting people. |
| U01 — paid-time and whole-period export | `payroll-export/paid-time.ts`, `batches.ts`, `client.ts`; Phase 2 fictional fixtures | Review every exact employee/entry/break identity, choose paid rest or attested relieved meal without inference, plan by UTF-8 bytes and whole employees, verify every reply/hash and manifest completeness. Exercise a 30-person multi-batch period, one lost reply, exact retry and changed-body refusal. Show incomplete/unknown until every expected artifact and the server manifest are reconciled. |
| U02 — agreed restrictions | `/api/manager/scheduling-restrictions`, `/api/employee/scheduling-restrictions`; [Phase 3 contract](2026-11-16-backend-phase3-contract.md), section 1 | Manager confirms legacy-unconfirmed versus explicit unrestricted, chooses an admissible effective Monday, sees future versions and employee requests, and independently approves/denies. Own Employee/Lead sees the effective agreement and submits a change request without approving it. Cover cross-location authority, next effective-week lower bound, closed-week race and overnight occupancy. Availability preferences remain separate from management agreements. |
| U03 — permission-aware Home/tasks | `action-center/review-facts.ts`, `needs-you.ts`, employee Home `tasks` facts; Phase 3 sections 2–3 | With the same three closed timecards (two reviewable plus one requiring another reviewer), desktop and phone both count two reviewable cards. Preserve a truthful explanation/routing for the independent-review item. Use typed `actorMayReview` and `concernsActor`, never English-title inference. For partial/legacy task sources, do not turn observed counts into complete totals or announce all-clear from a three-row preview. |
| U09 — reports/coverage | `reports/project.ts`, `scheduledByDay`, generation coverage basis/unit; Phase 3 sections 4–5 | Label historical observed coverage-request outcomes as observed history, including the empty/unknown distinction. They are not a complete staffing denominator. Scheduled-versus-recorded uses elapsed workplace time and null/unpublished limitations. Planner coverage means fully covered nominal location-period minutes; it is not staff-hours or payroll time. Check partial/unknown, overnight and DST examples. |
| U10 — communication/reminders | `/api/manager/reminders/eligibility`, command and original-operation lookup; [Phase 4 contract](2026-11-16-backend-phase4-claude-contract.md) | Consume ready, cooldown, queued/already-queued, held, blocked, conflict and outcome-unknown states under current communication authority. After an uncertain write keep the original command/ID and query it; never mint a replacement or say delivered from a queue receipt. Manual Owner-help is explicitly not sent and grants no new scope. D04/Updates/provider holds remain effective. |
| U11 — account help | `account-deletion/requests.server.ts`, auth/recovery APIs; Phase 4 contract plus support helper above | For `LAST_OWNER`, explain another active usable Owner must complete activation/replacement before a deliberate personal-deletion retry, or existing support handles separate company closure. The refusal creates no deletion request and ends no session. Preserve original deletion-status recovery and separate `DEL-…` references. Check EN/ES, keyboard/focus and supported device states. |
| Rondo — existing owner plus Claude B2 | [Business UI contract](2026-11-16-rondo-business-evidence-ui-contract.md), weekly/knowledge contracts and sealed index | Finish owned business-record/evidence screens with exact read/publish/recovery gates. Resolve the business UI plan's outstanding contract questions with the existing Rondo backend owner before guessing at revisions/expiry/error enums. Actual model runs and independently scored 50-question acceptance remain separate; scripted answers and parser tests do not supply those grades. |

## Integration gate

Claude supplies exact source/commit(s), the adopted contract rows, and mobile plus
desktop/keyboard/EN/ES/loading/error/empty/partial/held/conflict/unknown evidence.
The integrator starts from freshly fetched development, preserves concurrent work,
runs `npm run check:development-sources`, incorporates only reviewed changes, then
reruns affected SQL/API and real browser journeys against the final combined
source. Refresh source-qualified manuals after application/test inputs change.

Do not change a gate or historical/sealed evidence to make the candidate pass.
Current backend checks are not the missing consumer journeys, hosted acceptance,
provider delivery, physical devices or independent finding closure. Those remain
open until the responsible owner supplies actual evidence. No new Jose policy
decision is needed to continue these already-approved consumer integrations.
