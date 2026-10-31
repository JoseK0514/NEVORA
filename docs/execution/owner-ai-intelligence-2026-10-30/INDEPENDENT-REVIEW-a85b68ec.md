# Independent whole-change Code / Security / QA review

**Disposition: NOT READY for delivery at a85b68ec; fix three Important issues.** No Critical issue found. This is an independent local backend assessment, not production approval or a live-model intelligence certification.

## Frozen scope and method

- Base: `8d9487362d7f2295dc99f173ebe3977e049719b7`.
- Head: `a85b68ece0c2de090c4f9ef4c22eba8de8e12268`.
- Tree: `16bf1ef4542a0f6be424c53438773c328ab8de86`.
- Repository: `/workspace/work/nevora-owner-ai-implementation-20261030`.
- The checkout was clean at entry and on final inspection. No checkout, index, branch, product, runtime configuration, or older evidence was changed. All probes import this exact production source from an external directory and use fictional transports/data. No SQL cluster, browser, paid model, real provider, notification, deployment, or business writer was started by this reviewer.
- Read AGENTS.md, the executive operating model, CTO, CISO, technical assurance, independent QA and governance skills; SPEC.md, PLAN.md, and all ledger Ruling lines. Applied the senior reviewer template, without delegating.
- Inspected every changed source/test file and the relevant unchanged tool, service, settlement, coverage/period contracts, public response parser and workflow renderer. The authorized AI-owner delivery branch is recognized; shared integration/production authorization is not inferred. UI-M1 remains independently OPEN.

## Strengths

1. The provider adapter keeps routing explicit, preserves the Responses default, and does not guess a model/vendor or add fallback inference. Chat tool definitions/results are translated into their protocol shape; Responses encrypted continuation and the endpoint-specific 4096 output bound are retained.
2. Tool names/arguments, returned item shapes, same-turn duplicate call identities, mixed decision/read batches and slot budgets are checked before the first read in that turn. Provider input/output, time, call and decision-correction bounds remain explicit.
3. Decision references originate only from completed reads in this investigation. Strict decision parsing, partial acknowledgements, canonical coverage references, changed whole-ledger fingerprints and failed-review prose rejection are meaningful deterministic controls. Coverage recommendation attachment follows the chosen actual canonical plan.
4. The implementation reuses admission, replay, reservation, cancellation and settlement rather than duplicating them. Secret review payloads remain outside model context. There is no new business capability, schema, dependency, component or runtime activation.
5. Tests cover actual production orchestration and outbound bodies. The supplied complete owned SQL evidence verifies 58 cases against this exact SHA, including the seven new service cases. Fictional provider transcripts are correctly described as contract evidence rather than model intelligence proof.

## Issues

### Critical

None found in the reviewed range.

### Important — INT-I1: display language incorrectly changes evidence freshness identity

**Files:** `src/lib/owner-advisor/decision.ts:44` (especially line46); `src/lib/owner-advisor/loop.server.ts:149`.

`current()` compares the entire serialized ToolCall. For `attendance_payroll_review`, `language` changes labels, not which operational period is observed. A second read of the same dates in Spanish therefore does not supersede the earlier English read. This commonly matters when resumed period tasks first force an English read at loop.server.ts:165, followed by a requested-language read.

**Reproduction:** read Oct1–2 in English as E2 with zero exceptions, reread Oct1–2 in Spanish as E3 with a new attendance exception, then submit a decision whose observation and recommended option cite E2. The decision is accepted and says `No attendance exceptions were recorded. [E2]`, while the attached periodReview contains the newer exception. This is a reference-freshness error, independently of whether arbitrary prose can be semantically verified.

**Evidence:** `freshness-probe.test.ts` and `freshness-probe-02.log`: the desired stale-reference rejection fails; three controls/characterizations pass. Unchanged-language E2 is rejected, current E3 succeeds, and the stale-text/new-attachment mismatch is asserted. The initial simpler observation remains in `edge-probes-01.log`.

**Effect:** an Owner can receive an accepted decision based on superseded records after the same investigation already saw a newer result. Financial readiness caveats do not correct stale attendance evidence.

**Fix:** define canonical source-scope identity for each tool; ignore display language for period freshness while preserving different date ranges. Add both language directions and resumed-task regression coverage.

**Status:** ISSUE / OPEN. Should fix before branch delivery.

### Important — INT-I2: accepted period recommendation attaches a different period's details

**Files:** `src/lib/owner-advisor/loop.server.ts:149` and `:210`; `src/lib/owner-advisor/decision.ts:112`. Consumer: `src/components/owner-advisor/workflows.tsx:49`.

The loop always retains the last periodReview read. Accepted decisions replace coveragePlans using the selected option, but do not similarly resolve period evidence. This is separate from INT-I1: both period sources can be current and valid.

**Reproduction:** read Oct1–2 as E2, read Oct3–4 as E3, recommend an option citing only E2 with the summary `Review October 1–2 first.` The accepted public answer attaches periodReview.startDate `2026-10-03`. The unchanged public parser accepts it, and the workflow renderer displays Oct3–4's period exception section beneath the Oct1–2 recommendation.

**Evidence:** `attachment-probe.test.ts` and `attachment-probe-03.log`, one failing desired assertion against the real loop and public parser.

**Effect:** the Owner receives the wrong detailed period evidence for an otherwise valid selected recommendation. This is a new structured-selection integration gap; the pre-existing last-read slot becomes misleading when the new decision tool deliberately recommends an earlier source. The spec's focus on canonical coverage does not justify this ordinary period-review inconsistency.

**Fix:** derive the attached period evidence from the recommended option's current references when unambiguous. Define safe bounded behavior when the option references multiple periods or no period; avoid silently assigning the last read as the selected recommendation's details. Preserve the unchanged public contract and test public parsing and distinct-period selection.

**Status:** ISSUE / OPEN. Should fix before branch delivery.

### Important — INT-I3: explicit incomplete Responses calls pass whole-turn preflight

**File:** `src/lib/owner-advisor/provider.server.ts:47` through the call validation ending at line52.

Messages validate their item status, but function_call items do not. An otherwise completed envelope can contain a function call explicitly marked `status: "incomplete"` and the adapter admits it. This violates the planned fail-closed handling of incomplete/malformed provider output before tool effects.

**Reproduction:** return a completed Responses envelope with one completed published_staffing call followed by one otherwise well-formed published_staffing call marked incomplete. The real loop executes both, asks the provider again and returns a successful answer.

**Evidence:** `edge-probes-01.log` preserves the failing desired rejection assertion. `protocol-status-probe.test.ts` and `protocol-status-probe-04.log` independently characterize the actual behavior: three reads including mandatory briefing, two fictional fetches and a successful answer. The characterization passes.

**Effect:** malformed partial provider output can initiate reads and another provider turn instead of failing before effects. The reads remain authorized and bounded; this finding does not claim privilege escalation or business writes. The error matters at the specific untrusted protocol boundary this change promises to validate.

**Fix:** reject explicit non-completed statuses on Responses function-call items during full-turn validation, before any sibling executes. Omitted status can retain existing compatibility if that is intentional. Test a late malformed item, unknown/non-completed statuses, and accepted omitted/completed cases.

**Status:** ISSUE / OPEN. Should fix before branch delivery.

### Minor

No additional actionable minor issue promoted. Initial cross-turn duplicate-ID observations are preserved and dispositioned below; they were not silently dropped or counted as verified defects.

## Evidence and test interpretation

Reviewer-owned runs, all against production imports from frozen a85b68ec:

- `edge-probes-01.log`: 3 desired-rejection assertions fail. Two seed confirmed issues INT-I1/INT-I3; the third tests a stronger across-turn uniqueness assumption that is not promoted to a finding.
- `freshness-probe-02.log`: 1 expected regression failure, 3 passing controls/characterizations.
- `attachment-probe-03.log`: 1 expected regression failure; public parser accepts the mismatched answer before the assertion fails.
- `protocol-status-probe-04.log`: 1 passing characterization of the incomplete-call behavior.
- `git diff --check 8d948736..a85b68ec`: exit0.

These are nine test executions, not nine independent defects or a green suite. Original probe files and output logs are retained unchanged. Vitest's cache is incidental, not immutable test evidence.

Supplied implementation-team evidence independently inspected, not rerun by this reviewer:

- `../sql-final-01/execution.json` and output: exact head/tree, clean state, exit0; 9 files /58 tests passed,44.15s; owned PostgreSQL cluster stopped.
- `../types-final-01/execution.json`: exact head/tree, nonincremental whole TypeScript, exit0.
- `../lint-final-01/execution.json`: exact head/tree, whole ESLint, exit0.

The complete default unit suite, original browser gates and final activation sentinels for this frozen head were still pending when this report was finalized. Passing earlier/focused tests cannot close these new issues. After remediation, preserve this original report, produce a new SHA/tree and evidence, then obtain independent reproduction before closure.

## Declined to judge — explicit dispositions

1. **Live Neon/OpenAI model catalog compatibility, provider-specific optional fields and actual model behavior:** no paid/live calls or model activation were authorized for this review. Fictional outbound-wire tests establish local shape/guard behavior only; authorized live capability evaluation remains a release condition.
2. **Semantic correctness, completeness of business judgment, superior/extreme intelligence and actual prompt-injection resistance of a live model:** arbitrary prose is not semantically checked by review_decision. References and bounded capabilities are inspected; fixture transcripts do not establish model judgment. This does not excuse the deterministic freshness/attachment issues above.
3. **Across-turn call-ID global uniqueness as a required rejection rule:** the original probe shows the same ID can recur on different turns. The adapter rejects duplicates within a turn, emits causal call/result ordering, and all such reads remain allowlisted/bounded. I did not establish that every supported provider forbids repeated IDs across distinct turns, or demonstrate a wrong mapping in this loop. Preserve this as a protocol compatibility question for authorized live evaluation, not a confirmed security defect or release blocker.
4. **Hosted performance, provider retention promises, billing guarantees, network environment parity and production certification:** local bound checks and supplied SQL tests do not establish these. No hosted/production authorization inferred.
5. **Visual/chat design and closure of earlier UI-M1:** no changed UI file; Claude owns design, and UI-M1 remains independently OPEN. I read unchanged consumers only to trace backend effects.
6. **Business execution, notifications, autonomous follow-through and action consent beyond the current read tools:** this increment intentionally adds no writer or standing autonomy. Their absence is not judged a defect in the authorized backend slice.
7. **Broad inherited application/coverage-planner certification:** relevant consumers and source contracts were traced, but this is a review of the frozen increment, not a new audit of every unchanged subsystem or exhaustive planner benchmark.

## Independent recommendations

**Code: WITH FIXES / not ready at this SHA.** The architecture fits the plan, and the scope/implementation deviations recorded in the ledger are reasonable. Fix INT-I1/I2/I3, rerun focused regressions and required affected/full gates, and submit the new frozen source for independent verification.

**Security: CONDITIONAL.** No new business authority, credential disclosure, cross-owner admission bypass or uncontrolled inference path was found. INT-I3 weakens the explicitly promised provider preflight boundary and should be corrected. Existing live-provider privacy/retention and hosted controls are not certified here.

**QA: NO-GO for delivery of a85b68ec.** Three independently reproduced deterministic issues remain open, and final full unit/browser/sentinel evidence is pending. Local SQL/static success is useful evidence but does not supersede these failures or authorize production.

**Governance/release impact: BLOCKER for this increment until fixes and verification.** The implementation owner may remediate; independent QA retains closure authority. No material risk acceptance or production decision is requested or inferred by this review. Publication remains limited to the explicitly authorized AI-owner branch after the agreed gates, with no merge/deploy implied.
