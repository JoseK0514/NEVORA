# Independent closure supplement — INT-I1 / INT-I2 / INT-I3

**All three original findings are independently CLOSED at 8731362f.** This supplement verifies the remediation of those findings only. It does not replace the original whole-change report, certify the complete application, or grant production approval.

## Identity and preservation

- Fixed head: `8731362fcc05871db23fd303c311aa04d3a4dded`.
- Fixed tree: `d4b96d16e669b6c346cc8ad6483812fe82cd6203`.
- Original reviewed head: `a85b68ece0c2de090c4f9ef4c22eba8de8e12268`.
- Checkout: `/workspace/work/nevora-owner-ai-implementation-20261030`; clean at entry and final check.
- Original report: `../independent-a85b68ec/REPORT.md`. All original SHA256SUMS entries were verified before and after closure verification. Original files, logs, hashes and report remain untouched. Original findings remain valid historical findings at a85b68ec; this document records their closure on the fixed source.
- This reviewer inspected the six-file remediation diff and ran only lightweight external probes importing the exact production code. No product/config/index/HEAD/branch change, database/browser runtime, live model call, business writer or deployment occurred.

## Finding dispositions

### INT-I1 — CLOSED

`decision.ts:44` now defines attendance/payroll source scope using tool name and date range, excluding display language. `current()` at line49 uses that identity. The original stronger contradictory-period regression now rejects E2 after an ES reread. Same-language stale-reference and current-E3 controls also pass.

Independent additional checks confirm EN→ES and ES→EN both reject the prior ID as STALE_EVIDENCE, then accept the current ID and attach its corresponding language. Distinct periods remain separately eligible, demonstrated by the original period-selection regression. This fixes the deterministic freshness defect without claiming semantic verification of prose.

### INT-I2 — CLOSED

`decision.ts:91` resolves the recommended option's actual current evidence into single-slot workflow attachments. `loop.server.ts:154` and `:210` use that selected set for structured decisions rather than carrying forward unrelated last reads. The original two-period probe now recommends Oct1–2 and attaches Oct1–2; the unchanged public parser still accepts the answer.

Independent controls verify latest-source selection, no recommendation, unrelated references and ambiguous references for both period and proposal attachments. Ambiguous sets omit the single card and emit the server-owned caveat. No recommendation or no matching source attaches no implicit card. Private proposal review tokens remain outside provider bodies. Plain factual answers preserve the previous latest-read attachment behavior, and the chosen canonical coverage source still overrides a later other-date read.

No remaining attachment mismatch was reproduced in these finding-specific paths.

### INT-I3 — CLOSED

`provider.server.ts:46` now rejects any explicit item status other than completed during whole-turn validation. The original incomplete-call regression now rejects before its operational read.

Independent late-sibling probes cover incomplete, in_progress, unknown, null and false statuses. Each rejects after only the mandatory briefing, with one fictional provider request; the earlier valid sibling does not execute. A positive control with completed and omitted function statuses plus encrypted Responses continuation succeeds. Omitted-status compatibility is retained.

## Independent evidence

- `original-integrity.txt`: original immutable artifact hashes verified. Verification was repeated before finalizing this supplement.
- `original-regressions-01.log`: **5 passed, 3 deliberately skipped** across copied original probe files. The selected tests are the original incomplete-call rejection, the stronger stale-period rejection, same-language/current-source controls and the original distinct-period attachment assertion. Skips are the redundant initial coarse freshness probe, the old-bug characterization that intentionally asserted stale acceptance, and the cross-turn duplicate-ID hypothesis that was never promoted to a finding.
- `closure-controls-02.log`: **19 passed**, covering both language directions, period/proposal attachment selection and omission cases, plain-answer compatibility, protocol rejection/positive controls and canonical coverage attachment.
- Total independent closure execution: **24 passed**, no failures. These counts are test cases, not separate defects.
- `git diff --check a85b68ec..8731362f`: exit0.

The copied original tests are byte-preserving copies, not rewrites of historical evidence. The new compatibility suite and all logs are in this separate directory. All fixed-source probes use fictional data/transports and exact production imports.

## Supporting team evidence and limits

I inspected `../independent-findings-green-01/{execution.json,output.log}` (155/155 focused Owner units) and `../resumed-period-green-01/{execution.json,output.log}` (8/8 new owned SQL cases; cluster stopped), plus their added test code. These are **working-tree remediation evidence**, recorded at the older HEAD with six modified files, not clean fixed-SHA final gates. The new SQL case exercises the realistic saved-period EN read followed by changed owned records and ES reread, but I did not independently start or rerun SQL.

Complete fixed-SHA Owner SQL, whole TypeScript/lint, full default units, original browser suites and activation sentinels were still being run or scheduled when this supplement was finalized. Their final receipts must be assessed separately. No whole-QA acceptance is inferred from these 24 closure tests.

## Independent recommendation

- **Code:** the three blocking code findings are closed on the exact fixed head/tree. No additional material issue was found in this narrow remediation verification.
- **Security:** the reported provider preflight gap is closed; authority, privacy and live-provider limits from the original report still apply.
- **QA:** **GO WITH CONDITIONS for closure of INT-I1/I2/I3 only**. Broader delivery acceptance remains conditional on the pending required gates and their exact-source evidence.
- **Unchanged limits:** UI-M1 remains independently OPEN; no UI review was performed. Live model capability, semantic intelligence, hosted behavior, retention/billing guarantees and production authorization are not certified. Cross-turn global call-ID uniqueness remains the non-blocking compatibility question documented in the original report, not a newly closed finding.
