# NEVORA Phase D D3–D8 internal completion record

This document preserves the passing runtime checkpoint below. Later remediation and the final exact-head disposition are controlled by the [final publication package](/Users/josek0514/.codex/visualizations/nevora-phase-d-final-20261007/COMPLETION.md) and [PR #10](https://github.com/JoseK0514/Fuel-Scheduler-/pull/10), which records the final SHA/tree, actual CI and evidence readback. Do not infer current-branch acceptance from this historical checkpoint alone. Production remains NO-GO.

## Identity and delivery

- Repository: `JoseK0514/Fuel-Scheduler-` (private).
- Branch: `codex/phase-d-d3-d8-execution-20261007`.
- Starting SHA: `7485463dedb6b93e8b6ec4ebf3a86172fb9be5b5`; tree `99c8a5fb923c88bf8a520592e425be66f7902bfd`.
- Runtime candidate: `252223a5ccc6708190b96ad66cbdd16965c751ff`; tree `22570aa60172e93a0f8b58f424ce8569f0915f5e`.
- [Draft PR #10](https://github.com/JoseK0514/Fuel-Scheduler-/pull/10), targeting development. No merge, main integration or production deployment was performed.
- PR base at inspection: `0516b7dcbb07a10d926cc5c53f3b650343cad9bd`; at the runtime checkpoint the PR includes 170 changed files / 28 commits against development, including ten inherited commits through the frozen D2 baseline. The D3–D8 program counts below are measured from the authorized D2 SHA, not from the older development target.
- Vercel records Preview deployment `6920858177`, state success, `production_environment=false`, for the runtime candidate. [Preview identity](https://fuel-scheduler-4n1ncz5qo-josekarlo-5933s-projects.vercel.app). This records a deployment, not hosted authorization, recovery or database verification.

## Workstreams

| Section | Resulting behavior | Status |
| --- | --- | --- |
| D3 | Canonical period timecards, entry/break/correction detail, exception-first management review, immutable approve/finalize/reopen revisions and finalized-source interlocks | COMPLETE |
| D4 | Current protected period, approval, employee/location/position, plan-versus-actual, attendance, request, shift-change and stability reports; unavailable policies/evidence remain explicit | COMPLETE |
| D5 | Authorized formula-safe CSV and printable/PDF reports, including definitions/source observation and print disclosure restoration | COMPLETE |
| D6 | One canonical finalized NEVORA time/export model; configurable immutable mapping profiles and provider adapters; explicit identifiers and precision; no payroll calculation | COMPLETE |
| D7 | Manager Action Center joins existing scheduling/request, attendance, correction and timecard sources with real counts, contextual links and private lifecycle clearing | COMPLETE |
| D8 | Internal integrated local/CI regression, migration/race, recovery/error/privacy, responsive/keyboard, Chromium/WebKit and exact source custody | COMPLETE |

## Mandatory amended acceptance

- **UX-01:** customer Forgot access and Reset access; 256-bit hashed proof, 15-minute expiry and single use; indistinguishable known/unknown request responses; expired/reused proof recovery paths; current manager/Owner assisted recovery with independent verification record. Reset invalidates every portal session and pending push delivery while preserving roles, eligibility, schedules, Clocker identity and punch/break/correction/timecard history. Stale reviewed credentials cannot create a replacement session. Existing authentication architecture is retained.
- **UX-03:** unpublished, published without assignment/off, and unavailable/error schedule states are distinct. Drafts are not disclosed.
- **UX-04:** loading, verified empty, pending, offline/unavailable, reconnecting, pause and authorization loss remain distinct. Only a verified current empty snapshot says “No correction requests.” Private names/counts clear; uncertain decisions retain the same operation and require a fresh authorized snapshot before retry.
- **UX-05:** employee-scoped pending Clocker slots preserve previous unresolved intent/receipt while another employee records their own work. No cross-identity replay or uncertain receipt deletion. Current manager receipt inspection supports resolution without rewriting punch history. Network loss, retries, reload, duplicate input, identity changes, binding and concurrency are tested.
- **UX-02:** OPEN / DEFERRED. Stronger first-activation identity proof was not implemented or authorized.

## Verification

Local browser verification on the same clean runtime candidate: **193 integrated + 282 correction + 46 attendance + 70 Clocker checks PASS** in Chromium/WebKit (**591 overlapping check executions**, not unique requirements). Exact-head Linux CI passes the same four suites with the same counts and no report errors. Responsive widths include 320/375/390/430/768/1024/1440, keyboard/focus, private lifecycle clearing, unknown/offline/error/role loss, authenticated API mutations and safe receipt recovery. The receipt test verifies duplicate active focus remains stable, real blur clears data and returning performs a fresh authorized read.

The current runtime candidate has passed exact-head CI validation: 201 files / 2,115 default unit tests, typecheck, lint, build and production dependency audit. Its exact-head Clocker/Phase D PostgreSQL job passed 33 files / 502 tests; its release PostgreSQL job passed 31 executed files / 737 tests across five suites. The browser job and all required SHA/mandatory UX verification steps pass. These execution totals overlap and are not added to default unit totals. [Exact-head CI run](https://github.com/JoseK0514/Fuel-Scheduler-/actions/runs/37686732707).

Owned PostgreSQL coverage includes ordered migrations 0001–0021, frozen D2 upgrade/data preservation, current roles/sessions, source/revision conflicts, finalization/reopen write interlocks, old/new reassignment protection, immutable corrections and receipts, punch/break concurrency, export selection/mapping/precision, proof expiry/reuse/concurrent redemption/session invalidation and preservation of unrelated operational records. Scheduling/publication, request/exchange, generation, foundational authority and notification gates are included. All verification uses invocation-owned loopback databases and fictional accounts. Only fictional local SMTP delivery is tested; no real messages or customer mutations were made.

Actual PDF extraction verifies three pages, all 12 report sections, definitions and source observation. Browser print checks also verify hidden navigation/controls and restoration of collapsed disclosures. WebKit checks print behavior; operating-system Save as PDF dialogs are not automated.

## Defects and retained holds

- P1: D3 current-role read loss and D8 old/new reassignment interlock bypass were reproduced, remediated and covered by regression. The four user-designated P1 UX requirements have implementation and local/Linux whole-phase PASS evidence. No new unresolved Phase D P1 is known. UX-02 and inherited FR-AUTH-001 remain explicitly open outside this development completion scope.
- P2: finalized raw-history interlocks, unpublished plan totals, native mapping-select overflow, Action Center expansion/focus, generic receipt feedback, Linux narrow-header overflow and missing collapsed PDF content were remediated. Linux header and mapping geometry retests passed. The manager receipt focus regression is reproduced and corrected; all 193 local integrated checks pass, including duplicate-focus stability and real-blur privacy. Its final Linux retest passes.
- P3: inherited development-only lint dependency advisory remains open pending a compatible upstream patch. Production dependencies have zero advisories. [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects braces through the developer lint chain; public application input does not reach lint globs. No checks were disabled or forced incompatible downgrades made.
- P4: no separate open Phase D polish finding is recorded.
- GitHub artifact upload quota remains a carried evidence limitation. Exact Git source/tree and retrieved CI job logs are retained; local evidence is packaged with hashes and successful every-member readback. Remote artifact upload/retrieval is not represented as passed. No paid upgrade or blanket deletion was performed.
- Development/main branch enforcement remains open. Actual CI results do not imply server-side branch protection.
- Hosted authorization/rollback/recovery, physical-device and screen-reader acceptance and existing independent findings retain their documented states. Local automation does not independently close them.
- Assisted recovery cannot be self-issued; a Manager cannot recover an Owner. Owner recovery needs another current Owner, or an independently authorized ownership-support process when that authority cannot be established. No support identity or privilege exception was created.
- Production SMTP configuration/delivery and customer import-template compatibility are separate release states. D6 neutral CSV makes no provider import claim. ADP RUN Generic v1 fields were checked against official documentation and require the account's current template/codes; no unsupported QuickBooks import preset was invented.

## Executive reconciliation, custody and next gate

Product: bounded D3–D8 and amended requirements, without guessed payroll/policy rules. Engineering/Technical Assurance: canonical adapters, current-authority checks, immutable/idempotent commands, migration preservation and regression evidence. Security: recovery proof/session controls, account enumeration resistance, private current snapshots and identity-bound receipt handling. Product Experience: explicit uncertainty, recoverable shared-device use and real contextual action counts. Governance/Delivery: controlled source lineage, retained production holds and evidence limitations. These are embedded assessments in this execution, not independent reviewers or certifications.

Git verifies the frozen D2 SHA as an ancestor. Its actual parent is `9caafedf1b37d794f359ca47309bffa31ecddd21`; the pasted parent transcription discrepancy did not alter the SHA/tree. Frozen D2 and shared development worktrees were preserved. The runtime candidate contains 135 changed files across 18 commits; the source-custody manifest enumerates every path, status, blob SHA-256 and commit/tree. The later candidate includes receipt-form startup remediation and a deterministic delayed-script regression. Its final SHA/tree, exact-head CI and source differences are recorded in the referenced final package; historical report identities are preserved.

No executive stop condition required escalation. The production NO-GO and FR-AUTH-001 OPEN remain in force. Owner: engineering execution branch; future independent release authorities retain their findings. Next gate: remaining development program and its later consolidated independent production review. No routine Jose decision is requested for this bounded work.


## Tracked severity totals

Execution findings: **P1 2 closed / 0 new in-scope open; P2 10 closed / 0 new in-scope open; P3 1 open/deferred; P4 0 new open/deferred**. The four mandatory P1 UX requirements are separately satisfied; UX-02 and inherited production/independent holds remain open as specified. IDs and reproductions are retained in `phase-d-d3-d8-ledger.md`. This is internal development evidence, not independent production certification.


## Later receipt startup remediation

The documentation publication at `a8a5ff3f814a389fd148d8c3261a9003e3ca4489` passed all three backend jobs but its Linux WebKit receipt lookup timed out after 178 checks. That run is not a complete D8 PASS. A controlled delayed-script regression reproduced an enabled receipt form before its client controller existed (82 checks before assertion failure). P2 `D8-EXEC-007` keeps reference input/submission disabled through startup and active protected reads; the manager can then submit the preserved reference through the same immutable reader. Local Chromium/WebKit rerun passes **195 integrated checks**, including this new readiness case and the existing active-focus/real-blur privacy checks. The old CI timeout lacked request/state diagnostics, so the controlled startup defect is established without claiming that every intermittent timeout had the same cause. New diagnostics record receipt request/response state on failure. Final Linux and whole-phase publication-head evidence is required in the final package before development-complete disposition; no independent or production approval is implied.
