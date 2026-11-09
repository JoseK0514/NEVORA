# Final independent Calendar code review

**Recommendation: APPROVE for the bounded local implementation continuation, with the conditions below.**

- codeQualityStatus: WATCH
- recommendation: APPROVE
- blockers: none remaining within this bounded local code-review gate
- Application/test/config candidate: `f58d040b70909fa21dcb97b4f40edcfd5279226c`
- Review base: `a1b62ca68207a0fd3c6de300d55e17b621c9dc47`
- Branch at verified execution: `codex/employee-mobile-local-resume-20261027`
- This is not hosted/native/provider/device/assistive-technology or production-release approval.

## Findings by severity

### CRITICAL

None demonstrated; none open.

### HIGH

**CR-3 CLOSED by this reviewer at f58.** The original delayed-timer admission bug and later reopened clock-accounting bug both have author-owned closure. The controller now checks an absolute request-start-derived monotonic deadline synchronously before command/retry/copy and clears expired private status/URL while retaining uncertain original intent. The exact reopened harness sends zero expired POSTs on f58; independent lifecycle rerun passed20/20. Prior findings, exact harness/output, original closure, reopening, and final closure remain intact in [CODE_REVIEW.md](CODE_REVIEW.md).

No open HIGH production finding remains.

### MEDIUM

**CR-1 CLOSED by this reviewer.** Provider suppression tests now observe the real accessible provider section and guide links, with a ready positive control and paused/denied negative checks. Independent corrected render rerun passed5/5. No open MEDIUM code finding remains.

### LOW

**CR-2 remains nonblocking:** `src/lib/calendar/client.ts:19`, `:38`, `:56` use a shared request helper and caller casts to express read/write return types. Runtime parsers currently enforce the correct shape; no correctness failure was demonstrated. A small overload/typed seam would preserve this relationship in the compiler. No broader abstraction or dependency replacement is warranted for this observation.

## Evidence independently checked

- Reviewed the full Calendar change, canonical HTTP/service/feed boundaries, client ownership, mobile view, relevant tests and config. Reviewed subsequent fixes and the recovery-feedback effect delta; no additional production/test/config change followed f58 during accepted execution.
- Personally ran focused contract/lifetime/mobile tests44/44, corrected render tests5/5, lifecycle19/19 after the initial lease fix, and20/20 after the final arithmetic fix. Personally reproduced both CR-3 failures against the actual controller and reran the exact harnesses for closure. These independent checks are separate from the broader QA execution below.
- Read preserved meaningful RED/GREEN logs: initial7 lifecycle failures,5 mobile failures,3 delayed-callback failures, and1 arithmetic failure, followed by focused green runs. No failed assertion was removed or timeout expanded to obtain acceptance.
- Read [final combined results](../../local-review/qa/full-context-f58d040b-01/combined/suite-results.json) and [execution/custody result](../../local-review/qa/full-context-f58d040b-01/combined/result.json):26 files,254 passed,0failed/0pending,799.2s, original selector-free config and original assertions/10s pending-zero limit. Exact f58 source/HEAD/index stayed unchanged.
- Read exact-f58 static stdout/invocations/results:98files/799unit tests; `tsc --noEmit --incremental false`;16-file scoped ESLint, all exit0. Personally compared all2266 static/full-run source hashes and rehashed the current source:zero mismatches. Personally rehashed each of9 source manifests with2024 entries:zero source mismatches, exact f58 checkpoints.
- Read [QA audit](../../local-review/qa/full-context-f58d040b-01/audit-result.json):9 source/mirror/inventory checks, all owned Next closed with recorded dead PIDs/closed ports; owned PostgreSQL directory removed and PID/port closed. Mirror rehashing and runtime-custody verification were performed by QA; this reviewer directly inspected those artifacts and separately rehashed source.
- Final Calendar evidence records39 checkpoints across Chromium/WebKit/Firefox,108 captures and54 contrast samples. Independent UI/QA authors own visual acceptance. Controlled clipboard/network faults and local Next are not native clipboard/provider/hosted certification.

## Required carried-forward conditions

Read the independent QA author's final [GO WITH CONDITIONS](../qa/QA_REVIEW.md) and agree with its bounded scope. Carry these conditions unchanged into the implementation handoff:

1. **QA-CAL-1 remains OPEN RISK, cause UNRESOLVED.** The earlier exact-f58 full gate is preserved as253/254: one Firefox Profile pending Calendar GET after new-account login. The current254/254 pass is not a causal fix, does not prove a harness defect, and does not establish permanent reliability. No production delay, pending filter, assertion weakening, timeout increase, header wrapper or test-source workaround was introduced. If it recurs, stop the failing gate and investigate correlated request/consumer evidence before altering behavior or assertions. No further blind rerun is required now.
2. **Native observer completeness is limited.** The final global trace contains12 Chromium requests outside Profile without either terminal event;0 Page/Context mismatches. Profile's130requests, including31Calendar GETs, received both terminals. Do not claim all global transport events completed or infer the original Firefox cause. Native observers can alter scheduling and do not establish JavaScript consumer completion.
3. **Database marker sampling is limited.** Retain raw audit `markersValid:false` / `errors:["database markers"]` and the supplementary marker-sampling explanation. Three sampled OIDs had null markers and were not subsequently sampled marked. This is not a claim that every transient factory instance was independently observed after COMMENT. Existing factory ownership checks and complete owned-cluster cleanup passed; no foreign database access was demonstrated.
4. **Separate gates remain unexecuted:** real provider subscription/refresh, native clipboard permissions, physical devices, assistive technology, hosted build/transport parity and release/production authorization.

These conditions are explicit residual evidence limits, not self-closed findings. The QA author owns QA-CAL-1 classification; this reviewer does not convert the pass into historical causal closure.

## Skill perspectives and scope discipline

Loaded and applied remove-ai-slops, programming and its TypeScript reference, plus repository executive routing/CTO/CISO/technical-assurance guidance. Both skill perspectives ran. CR-1's false-positive assertion was corrected; CR-2 remains a LOW type-precision observation. No remaining deletion-only, tautological, prompt-prose, implementation-constant-mirroring test or needless production extraction/normalization was identified. Boundary decoding and finite lease checks directly serve this task. The hook-host tests are limited behavioral seams, supplemented by real browser/SQL execution; they are not represented as React/browser certification.

The implementation retains canonical own-session/workspace/Employee-or-Lead/location eligibility, replay/generation and bearer-feed behavior. No new business engine, persistent private URL, peer selector or dependency was introduced. One controller owner survives responsive presentation changes; signout ends it; unknown commands retain their immutable original identity through authorized recovery.

## Authorship and delivery

This reviewer made no application/test/config/HEAD/index edits, merge, deployment, provider subscription or customer-data operation. Only authored review artifacts were written. [CODE_REVIEW.md](CODE_REVIEW.md) remains unchanged as historical evidence. Later docs-only delivery commits do not replace the accepted application candidate; any later application/test/config change requires appropriate re-review. No user policy exception or production authorization is inferred.
