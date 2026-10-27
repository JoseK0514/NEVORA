# Current code-review disposition — bounded fix recheck

Candidate: `a2758f8932d5893f59d77f0f6c3c03ee8ed94eae`.

- codeQualityStatus: **WATCH**
- recommendation: **APPROVE** for the bounded code change; required browser/independent UI/QA gates remain separate.
- blockers: **No remaining code-review finding.** Root's strict browser rerun was still in progress when this recheck was recorded, so this is not an all-gates-green claim.
- CR-RSP-1 (HIGH): **CLOSED by original reviewer** after independent real-PostgreSQL replay.
- CR-RSP-2 (MEDIUM): **CLOSED by original reviewer** after independent real-PostgreSQL replay.

## Closure evidence

Independently reran the original, unmodified reviewer reproduction file against this fix candidate: **2/2 pass**, `.omo/evidence/employee-mobile-responses-code-review/closure-replay.log`. The permission race now returns only `{state:unavailable,reason:access_denied}`. The report-history outage returns a null reported slot and null history, while preserving the independently allowed cancellation.

The exact incumbent recipient query supplies a deterministically ordered location array. The new scope guard compares it to the captured array inside every subsequent guarded transaction, including final lease admission. Existing employee/location/eligibility locks still precede that check; the fix does not replace the canonical permission source or weaken lock order. It also applies to list and history paths. Inspected the promoted four maintained SQL regressions and their retained RED→GREEN logs (`review-privacy-red.log`, `review-privacy-green.log`): detail, list, late final-admission revocation and history outage. The report slot now stays unknown if immutable history cannot establish original terms.

Independently reran the same six focused unit/component/route files: **25/25 pass**, `closure-unit.log`. Reviewed all seven files changed in the bounded fix, including kind-specific withdrawal consequence, scoped navigation surface and stronger canonical-settlement/browser network diagnostics. No console/pageerror allowlist was weakened. The additional tests target observed defects rather than removal-only or constant-mirroring assertions. The previously recorded programming/remove-ai-slops perspective remains satisfied by the fix.

No product edits were made by this reviewer. No new CRITICAL/HIGH/MEDIUM/LOW code findings arose in this recheck. Preserve the original findings and failed evidence below as review history. UI and QA own their findings; this code closure does not close theirs or authorize assembly/deployment.

---

# Employee mobile responses — independent code review

Candidate: `42237d75f3d05981c3b5c34438b88de432c03dff`; base: `583b39b4`. Reviewer: `responses_final_code`. Reviewed 23 changed files /676 added,31 removed lines against the bounded response/detail plan. No product, test, configuration or other reviewer files were changed. This is a local code review, not release or Phase 2 completion approval.

- codeQualityStatus: **BLOCK**
- recommendation: **REQUEST_CHANGES**
- blockers: CR-RSP-1 current-location disclosure; the required response browser diagnostics gate is also still red.

## CRITICAL

None identified.

## HIGH

### CR-RSP-1 — a location revoked during the read still appears in the returned detail

`src/lib/data/employee-exchange.server.ts:28` captures `allowedLocationIds` once. Lines30–47 then use this stale set across separately committed guarded transactions, while the final guard at lines83–85 only requires some eligible location to remain. Removing the secondary location after the access read does not retire the detail, history or peer terms gathered later.

Independently reproduced with the actual disposable PostgreSQL service and current migrations: seed a legitimate cross-location swap, intercept the completed recipient-access transaction, remove the recipient's loc-2 eligibility while retaining primary loc-1, and continue the real reader. It returns `state:ready`, peer `QA B.`, `West Office` offered terms and original history for loc-2. The command planner correctly blocks ACCEPT, but that does not repair the read disclosure. The expected absence of private detail fails.

Required fix: bind or revalidate the exact current location scope through final read admission under the relevant locks, so any revoked scope used by the result retires the read. Cover list, selected detail and retained history; preserve legitimate cross-location reads and safe closure policy. Do not merely hide Accept.

Evidence: `.omo/evidence/employee-mobile-responses-code-review/revocation.test.ts:10`, `revocation.log`, and `revocation-and-history.log`. These are reviewer-authored reproduction artifacts; the ignored runner is a copy of the owned runner with only this review config added to its disposable exchange-prefix allowlist. Each run creates a new loopback cluster/database, uses fictional fixtures and closes it. No existing database or application inputs were changed.

## MEDIUM

### CR-RSP-2 — history failure substitutes a live replacement time for reported terms

`src/lib/data/employee-exchange.server.ts:65` builds a slot from the live `getCallout` join. At line69, missing/unavailable immutable history falls back to that slot. `exchange-view.tsx:50` labels it “Reported shift,” even when the report was submitted for earlier terms.

Independently reproduced with an actual own report submitted for08:00, followed by changing the live shift to09:00 and a controlled failure of only the history SELECT. The new read returns offered.startTime09:00, history:null and no warning that the reported terms are unknown. This violates the plan's retained-original-terms contract. The UI history-unavailable notice does not make the falsely labelled shift accurate.

Required fix: obtain immutable recorded report terms from their authoritative owner or render the reported slot unavailable when they cannot be established; do not substitute a current assignment. Preserve any independently permitted cancellation. Add a regression for history outage after live terms change.

Evidence: `.omo/evidence/employee-mobile-responses-code-review/revocation.test.ts:36` and `revocation-and-history.log` (`HISTORY_OUTAGE_RESULT`). Both independent regression expectations fail on this candidate.

## LOW

No additional standalone low-severity finding. The compact style is consistent with nearby mobile adapters, though it increases review effort. No unrelated formatting rewrite is requested.

## Skill perspective and test relevance

Loaded/consulted `omo:remove-ai-slops` and `omo:programming`, plus repository executive, CTO, CISO, technical assurance and governance guidance. Checked the production and test diff for deletion-only/prose-removal assertions, tautologies, implementation-constant mirroring, unnecessary parsing/normalization, speculative wrappers and untyped escape hatches.

No separate slop/overfit violation found: strict DTO parsing is at the private transport boundary and enforces the requested data minimization; the shared operation adapter has two real consumers and reuses the incumbent operation owner; existing read/command/history services remain authoritative. Unit tests exercise participant filtering, unknown planner outcomes, malformed transport, conflicting intents and unavailable-state behavior. UI text assertions identify rendered states/consequences, not natural-language model prompts. Their gap was concurrent read-scope change and failed report-history fallback, demonstrated above. Several casts originate from untyped SQL rows at the established boundary; no new generic domain abstraction is required as a review fix.

## Evidence inspected or executed

- Independently ran six focused unit/component/route files: **24/24 pass**, `focused-unit.log`.
- Independently ran two adversarial real-PostgreSQL reader cases: **2/2 fail** on this candidate; exact evidence above. The failures are retained, not suppressed.
- `git diff --check 583b39b4..42237d75`: pass.
- Inspected root broader unit log:206 passed,12 pre-existing DB-dependent skips; this is inspected evidence, not my own replay.
- Inspected current root full run:39/40 pass. All33 response journey checks and36 contrast samples finish, but final strict diagnostics fail on WebKit `TypeError: Load failed` and a stack-frame pageerror during own-details. See `.omo/evidence/employee-mobile-responses/browser-final.log` and external `outputs/employee-mobile-responses/final/details/results.json`. Do not report that suite as passed or suppress the unexplained diagnostics. Prior capture-induced hydration failure and its caret-option change remain preserved in run4 evidence.
- No production build, hosted deployment, physical device or assistive-technology certification performed here. Development assembly/source inventory remains a separate existing gate.

The review should be rechecked against the bounded fix candidate and exact new artifacts. Root may remediate; this reviewer owns closure of CR-RSP-1/2. Phase 3 remains gated.
