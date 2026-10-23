# Independent engineering/security review — Owner AI integration

Candidate: `2830a1484b6f28c5a5f4baed20c9a5cbebcf9f46`.
Base: `40282f12c9f42ba00ed0f116c1dc6e42775efe8d`.
Checkout: `/Users/josek0514/.codex/worktrees/owner-ai-integration-20261023/Fuel Scheduler`.

codeQualityStatus: **BLOCK**
recommendation: **REQUEST_CHANGES**
reportPath: `/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/reviews/security.md`
blockers: **M1: align valid investigation citation output with the browser response contract and prove the multi-period path.** Release gates below remain independently open.

## Findings

### CRITICAL
None identified within the reviewed code scope.

### HIGH
None identified within the reviewed code scope. This is not hosted security certification.

### MEDIUM — M1: valid multi-period investigations fail browser parsing after completion
Locations: `src/components/owner-advisor/public-response.ts:29`; `src/lib/owner-advisor/loop.server.ts:188` and `:226`; `src/lib/owner-advisor/period-review.server.ts:48`.

The browser accepts at most eight sources. The investigation permits eight read calls including its initial briefing, and a period review contributes two sources. Source deduplication preserves different observation timestamps. Four period calls plus the initial briefing therefore produce nine sources, within five provider rounds and five read calls. The server accepts and persists this answer before the browser rejects it. The controller then describes an unknown/interrupted result; refreshing history cannot recover the structured period review and citations (history retains text only). This is a real cross-feature contract regression, not a hypothetical provider attack or an excessive-budget request.

Independent local reproduction used the actual transpiled `loop.server.ts` and `public-response.ts` in a Node VM, injected five deterministic provider responses (four valid period function calls then text), a no-op authority checker, a minimal tool parser returning the valid typed calls, and tool fixtures shaped like the actual two-source period projection. No provider/network/database was used. Exact output:

```text
{"providerRounds":5,"sources":9}
browser parser rejected: Invalid advisor response
```

The parser/loop were actual source; the tool/parser/authority dependencies were fixtures. This is a discriminating contract probe, not an integration or browser certification. Actual `parseTool` accepts the supplied 2026-10-01 through 2026-10-07/en arguments by inspection and existing tests.

Required correction: make the bounded source contract consistent across producer and consumer without silently discarding distinct period/publication evidence. Add a regression passing a valid multi-period loop answer through the public parser (and preferably controller) and verify existing privacy/citation behavior. Request independent re-review of the correction. Parent must not self-close M1.

### MEDIUM — M2: existing controller size/complexity debt, nonblocking
`src/components/owner-advisor/controller.ts:55` combines authority leases, refresh arbitration, dirty-edit conflict handling, mutation transport and UI transitions in a 360-line module. This remains the previously documented size/maintainability deviation under remove-ai-slops. Behavioral tests materially mitigate the risk. No demonstrated security failure from this organization was found; no broad refactor is required for this bounded integration.

### LOW — known resource and diagnostic limitations
`src/lib/owner-advisor/briefing.server.ts:19` and `src/lib/owner-advisor/tools.server.ts:128` load the canonical historical generation source before checking row ceilings. Those checks bound later processing, not SQL extraction/memory. This is documented preexisting growth debt; do not describe database extraction as bounded.

`src/lib/owner-advisor/period-review.server.ts:38` and `src/lib/owner-advisor/briefing.server.ts:39` collapse all read failures into unavailable/partial output. This is fail-closed for readiness, but obscures unexpected programming/storage errors. Optional follow-up should preserve safe public output while exposing sanitized internal diagnostics.

## Security/control assessment

- Owner admission uses original workspace/Company Access authority and guarded transactions. Reads and provider/tool boundaries recheck authority. Browser content has a finite 15-second maximum lease, generation fencing, retirement and refreshed authorization after long operations. These controls are present; no claim of instantaneous browser revocation is made.
- Persistence and receipts are keyed by workspace and Owner. Workspace-wide advisory locking serializes request budget and concurrency. Ask leases expire at 65 seconds; service deadlines are 60 seconds. Expired/failed request IDs do not trigger repeat paid execution. Preference writes and personal briefing dispositions use expected revisions and command hashes.
- Provider endpoints are configuration allowlisted; redirects fail closed. Requests use bounded transport/body/tool/output limits and no automatic retries. Provider text/history are treated as data and rendered as text. Allowed tools cannot execute business mutations. Executable coverage review hints are removed from provider input and attached from server tool evidence, not generated prose.
- Coverage still commits through canonical scheduling validation. Review hints bind actor/workspace/source and exact assignment; current publication state is checked inside canonical commit construction. Published replacements require explicit consent; draft behavior stays separate. The historical nested-paragraph/implicit-label defect is corrected in current markup. Missing setup is now included in partial coverage evidence.
- Period review projects limited timecard facts and payroll exception categories. It excludes monetary/private payload fields, labels historical finalized cards, and always returns financial readiness unverified. The catch path stays unavailable. Model prose can still be wrong; deterministic controls do not certify answer quality or prompt-injection resistance.
- Migration 0036 adds scoped profiles, request receipts, limits and atomic reservation/save functions; 0037 adds personal triage receipts/revisions and limited triage cleanup. Neither constitutes hosted migration/restore evidence. Preference operation receipts retain historical priority values without automatic age deletion; the handoff expressly discloses this. `store:false` is a request parameter, not proof of zero provider retention. No provider retention policy was independently certified here.
- The owned Next merge retains explicit advisor opt-in, excludes ambient provider credentials for ordinary runtimes and requires explicit pilot configuration for the optional preload. Existing process ownership hooks remain. CI adds required local PostgreSQL/browser/pilot regressions; configured jobs are not proof those jobs passed remotely.

## Skill perspectives

Loaded AGENTS.md, repository operating model, CTO, CISO, Governance & Risk and release-governance skills. Loaded `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/remove-ai-slops/SKILL.md`, `programming/SKILL.md` and its TypeScript README. Applied both perspectives before test/maintainability judgment.

No deletion-only tests, requested-removal pins, tautological tests, brittle natural-language prompt tests, or new untyped escape hatches were found in reviewed affected tests/code. Tests exercise observable authorization, malformed input, cancellation, leases, replay, privacy and conflict behavior. Capability-list assertions concern the machine API, not model prose. HTTP/provider/retained-hint parsing is justified at real trust boundaries; canonical privacy projection is required by the goal. The new failure is a missing producer/consumer composition test. Size debt M2 and broad catches above violate the strict skills' size/error-handling perspectives; typed casts/non-exhaustive branches also remain in surrounding conventions. These do not justify replacing the established framework/toolchain or blanket refactoring. No claim of perfect skill compliance is made.

## Evidence actually examined and executed

- Verified clean HEAD at the candidate before testing; inspected the complete changed-file inventory and substantive security/server/migration/confirmation/lifecycle/CI diffs plus relevant canonical authorization and scheduling callers. UI visual certification remains another reviewer's responsibility.
- Read integration plan, historical engineering review (including superseding closure), reviewed-workflows review and Owner AI handoff. Historical BLOCK reports were not treated as current source failures.
- Independently ran `npx vitest run src/lib/owner-advisor/adversarial.test.ts src/lib/owner-advisor/loop.test.ts src/lib/owner-advisor/http.test.ts src/lib/owner-advisor/briefing.test.ts src/lib/owner-advisor/workflows.test.ts src/components/owner-advisor/controller.test.ts src/components/owner-advisor/client.test.ts src/app/app/schedule/new/review.test.tsx --maxWorkers=1`: **8 files, 82 tests passed**, exit 0, 1.60 seconds. Output is recorded here; no separate test log was written because report-only ownership was assigned.
- Independently ran the M1 source contract probe described above and `git diff --check 40282f1 HEAD` (exit 0).
- Inspected supplied `engineering/release-engineering.log`: 119 passed, zero failures. `engineering/audit-production.log`: zero vulnerabilities reported. These are executor receipts, not independently rerun checks or security certification. `engineering/default.log` had only startup lines when examined, so full default-suite success was not established by that artifact at that time.
- No database integration, actual browser, live provider, secrets read, metered inference, remote mutation, merge, deployment or customer data action occurred in this review. No source/tests/index/HEAD or other reports changed.

## Unresolved release gates and disposition

M1 blocks my engineering approval until independently rechecked. No policy exception is needed to fix it. Implementation owner: parent-coordinated executor; reviewer retains closure authority.

Source inventory/externally owned branch retirement remains an integration gate. Require candidate-bound complete local verification and independent QA/UI acceptance, then exact remote CI for publication/development integration. Hosted acceptance additionally requires proven isolated non-production environment/database custody, migration/rollback evidence and approved provider/data configuration. Any fresh live inference requires Jose's new budget; the previous pilot allowance is exhausted. Production remains separately unauthorized.

`omo-agent-toolkit ulw-loop status --json` returned `ULW_LOOP_PLAN_MISSING`. The review task explicitly restricts writes to this external raw report, so no checkout-local fallback copy was created. The integration plan is the supplied progress/notepad reference; no separate notepad was supplied. This report is independent code/engineering assessment, not independent hosted security certification or release authorization.
