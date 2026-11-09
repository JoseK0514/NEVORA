# Quiet v4 follow-up review: 31038293

codeQualityStatus: WATCH
recommendation: REQUEST_CHANGES

Base34a974d87c5842934bc06721381c7f9a5299c4dd → head3103829366dbf27b21c0860a7ef13fc458648563. Repository /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler. Reads used exact git objects, not mutable checkout state. Goal: close H1/M1/M2/M3 while retaining Quiet styling and security/lifecycle contracts. Eight changed code/test files inspected, plus evidence README and relevant unchanged handlers/source. No heavy suite, live runtime, branch operation or external mutation.

## CRITICAL / HIGH
None newly established in this patch. Prior H1 is closed by source inspection as detailed below. This does not certify all Quiet pages or release readiness.

## MEDIUM
### R1 — Do not suppress lifecycle effect failures in the new phone tests
File /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler/src/components/timecards.batch.test.tsx:307 at31038293.
New mountAll invokes every captured effect inside `try{return effect();}catch{return undefined;}`. Any real production effect throwing during mount silently disappears while the tests proceed to pass on manually driven state. This weakens the evidence for lifecycle/resize behavior and directly conflicts with the working agreement against suppressing failures to get green results. Unlike an explicit known browser shim, it accepts every exception from every effect.
Required before approval: supply the specific missing browser APIs needed by the harness, or use a mounted/browser fixture, and let unexpected effect errors fail. Retain current exact-command retry and privacy assertions. No production changes requested.

### R2 — Device coverage improved, but its hook simulator is brittle and cannot prove browser lifecycle/focus
File /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler/src/components/clocker-device-manager.test.tsx:8,132,150.
The new harness replaces React's state/ref/effect lifecycle, preloads the first ref as the dialog, runs only effects[0], ignores dependencies and cleanup, and manually walks JSX/fakes selectors. A harmless ref/effect reorder breaks it; missing dependency updates or cleanup can pass. It does exercise real component handler choices and state-specific options, so it is useful narrow coverage rather than a tautology. Do not equate this with mounted dialog/keyboard/focus verification.
Follow-up: move lifecycle/focus cases to the project's existing browser surface; keep unit coverage limited to behavior it actually observes. The previous removal-only `not.toContain('type="search"')` remains at55; remove that diff-pinning assertion unless a separately stated behavior requires search absence. M3 is partially closed, not fully closed.

## LOW
### R3 — Open-cover deep links are excluded from default expansion
File /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler/src/components/manager-shift-requests.tsx:183.
Open-cover rows use `open={false}`. Existing notification destination generation at src/lib/data/notification-state.ts:343 emits `/app/exchange?tab=coverage&requestId=...`. These links therefore reach a collapsed row, unlike pending deep links at165/173, and open-cover list items have no selected identifier. This is not loss of the new facts (users can expand manually), but README's broad deep-link claim is incomplete. Use matching requestId for expansion/targeting and add a coverage-tab case if all request deep links are intended to open. Pending deep-link closure is supported.

## Closure evidence
H1: CLOSED by inspection. ShiftFact renders owner, full calendar date/year, start/end, location, optional position/lead; ExchangeFacts renders distinct source and target swap shifts, coverage recipient, and callout reason/note. Pending rows have a native details/summary disclosure before the unchanged Decision. RequestId matches set open; unlinked rows remain collapsed but inspectable. Decisions retain revision fields and availability checks. Added tests use deliberately different source/target times, dates and locations; overnight coverage is covered. No new authorization or mutation implementation.

M1: CLOSED in production source, verification WATCH due R1. Phone Select, eligible checkboxes, selected action, exact review, explicit confirmation, per-card outcomes, refresh and original-command retry now render above the phone return. Existing batch action/revision/source validation and maximum100 logic are reused. `act()` still uses commandRef.current for retry; `submitBatch()` still stops on unknown outcome and retains not-submitted cards. State remains outside the viewport branch, so resize does not itself clear review or confirmation. Existing blur/expiry/account paths still invalidate private source/review; new phone section is guarded by ready. No lifecycle handler was weakened in production.
New tests check actual emitted command identity, blocked self-selection, explicit confirmation, unknown-outcome stopping/retry, viewport state continuity and blur clearing. Finalization's new case only checks DRAFT ineligibility, not a successful FINALIZE receipt. Unknown retry uses an always-failing transport, so it proves identity reuse, not eventual reconciliation success. Browser validation remains necessary.

M2: CLOSED by inspection. Support response and address now render POLICY_FACTS.SUPPORT_RESPONSE_TIME and BUSINESS_CONTACT_DETAILS directly. Canonical aim/holiday/investigation qualifications return; policies.ts is unchanged. New source-fidelity assertions are relevant to this explicit policy-preservation requirement, not forbidden prompt-prose tests. Some repeated phrase assertions are redundant, but not a demonstrated maintenance blocker.

M3: PARTIAL. New device cases drive tab selection and real option handlers across ACTIVE/UNREGISTERED/PENDING/EXPIRED/REVOKED, unavailable location and hydration states. No production device edit. R2 limits the claimed interaction/lifecycle coverage; old search-removal assertion remains.

## Evidence, style and skill check
`git diff --check 34a974d8 31038293` passed. No new suites run as requested. README at docs/product/specs/owner-v4-quiet/codex-review-1/README.md and listed screenshots are retained executor evidence, not independently replayed verification. Its claimed9502 pass count and mutation controls were not independently confirmed from raw runner logs. Screenshots were not visually certified in this pass; no WebKit evidence is claimed. CSS additions use existing q-details, q-row, q-list, q-nav and color variables, with bounded facts/bulk presentation; no broad design rewrite identified by source inspection.

Both previously loaded remove-ai-slops/programming perspectives applied. R1 violates failure-transparent testing; R2 violates implementation-independent testing and retains a deletion-only assertion. Neither is promoted to HIGH without demonstrated production failure. New request tests include `as never` fixture escapes, which reduce type assurance; prefer typed fixtures in follow-up. No unrelated production extraction/normalization added. Full-file size is inherited and not represented as a newly introduced critical defect.

## Required next step and blockers
Blocker for this follow-up approval: R1's blanket effect-error suppression. R2/R3 are actionable nonblocking WATCH items; do not describe M3 or all deep links as fully independently certified. Parent owns combined-candidate cloud tests and PR29's separately open mandatory gate failures. This report does not authorize edits to Claude UI, main, production, or database state. Only this required report artifact was written. ULW plan absent; fallback artifact location used; no notepad provided.
