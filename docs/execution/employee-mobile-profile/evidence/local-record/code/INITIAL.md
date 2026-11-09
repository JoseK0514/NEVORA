# Employee mobile Profile — independent code review

Reviewer: `/root/profile_local_code_review`. Candidate `8f1b53d4406e819f6738dbbf29b9559cfaa254a6`; base `e7f1c76804aae3bfe8897388824194d53607bd8a`. Worktree: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume`.

**codeQualityStatus: BLOCK**  
**recommendation: REQUEST_CHANGES**

## CRITICAL

None identified in the reviewed scope.

## HIGH

**CR-PROFILE-001 — initial mobile render still exposes the static legacy identity.** `src/components/employee-mobile/profile.tsx:30,38` uses `useEmployeeMobile()` to choose the legacy header. Its real server snapshot is explicitly `false` (`src/components/employee-mobile/use-mobile.ts:5`), so the server render and initial hydration render select `legacyHeader`. That header contains the proof name, role and workspace (`src/app/app/profile/page.tsx:28`). The new mobile classes are added only when `mobile` becomes true; the scoped CSS has no pre-hydration rule hiding `.q-who`. A slow/blocked script or disabled JavaScript therefore leaves the static identity outside the finite own-profile controller instead of the promised nonprivate loading view. This is an unmet privacy/lifecycle requirement, not a claim of cross-account disclosure: the server proof was authorized when rendered, but the displayed identity bypasses the new finite reader and its pause/expiry lifecycle.

The approved plan explicitly requires mobile identity/work details from the finite endpoint, and its refinement says the original desktop header should render only on desktop **after hydration** (`docs/execution/employee-mobile-profile/plan.md:5,14,24`). The new unit test cannot detect this: `profile-preferences.test.tsx:6` always mocks the mobile hook to true, then claims no static header at lines15–18. Existing browser checks wait for the hydrated mobile loading selector before inspecting content.

Required correction: gate the legacy private header until the responsive client state is established, retaining the original desktop presentation once established; keep mobile identity within the ready finite view. Add a regression using the real server snapshot/hydration boundary and actual mobile evidence with hydration delayed. Recheck desktop and stable service ownership. Source control flow is verified; I did not launch a browser to reproduce pixels because this reviewer was assigned no runtimes.

## MEDIUM

**CR-PROFILE-002 — mobile visual order and native focus/reading order diverge.** Settings and Calendar occur before the account panel in `profile.tsx:41–52`, but `.em-profile-private { order:-1 }` at `profile.css:10` moves identity/work/Refresh above Settings visually. Native Tab traverses preferences, Notifications and Calendar before jumping upward to Refresh; screen-reader traversal likewise encounters settings before the identity/work block shown above them. The browser test only checks Language → Appearance (`employee-mobile-profile.integration.ts:81`) and does not exercise this overall sequence. Keep a coherent mobile DOM/visual sequence while preserving the stable Calendar/Passkey owners and desktop order; verify complete native Tab traversal. Independent UI should own the final interaction assessment. This is a source-confirmed order mismatch, not a personally executed assistive-technology result.

## LOW / retained verification condition

**CR-PROFILE-003 — Firefox System appearance failure remains unexplained.** `local-preflight-5` failed at the dark → light System transition (`employee-mobile-profile.integration.ts:84`); `local-preflight-6` passed after a diagnostic-only test edit, with no theme implementation change. Retain the failure and have the independent QA gate exercise it again. The later pass is evidence of a passing run, not proof that the earlier failure's cause was fixed. This is not classified as a demonstrated production defect.

## Verified scope and evidence

I read all16 changed application/test/config files, the approved plan/source map and retained preflight artifacts. Current tracked tree was clean. I independently compared all2016 hashes in preflight6's `source-manifest.json` to current files: zero mismatches, checkpoint exactly the candidate. Ownership records for preflights4/5/6 say closed/sourceVerified/mirrorVerified. Preflight6 records36 checkpoints,81 captures and54 contrast samples across three engines; its result JSON has no page errors or unexpected console errors. I inspected metadata/diagnostics, not every screenshot, and did not run tests myself. The broad combined/unit/TypeScript/lint gate is owned by separate QA and is not claimed complete here.

The finite reader/parser/server proof owners are reused. Employee/Lead role split and current session/workspace checks remain in canonical owners; no new peer selector/editor or expanded authority was found. Terminal401/403 body cancellation preserves immediate denial; swallowing cancellation failure is justified here because it must not convert a known refusal into a retry. Service slots stay structurally stable across responsive changes. Contextual legal links are fixed allowlisted destinations; public defaults and canonical policy facts/visibility remain in their existing owners.

The logout fixture revision is justified by inspected evidence: preflight4's WebKit response records two proper Set-Cookie fields, while its route.fetch cookie jar already retained the session with a different expiry. Native-response preflight6 removes the session and preserves the opaque cleanup cookie. Holding outgoing native submission now proves private-DOM/service removal before dispatch, and still asserts real session deletion/cookie removal after completion. It no longer claims observation of a held post-commit response. No original cookie/session assertion or timeout was relaxed.

## Skill-perspective check

Consulted `omo:remove-ai-slops`, `omo:programming` and its TypeScript reference, plus repository executive/CTO/CISO/governance instructions. This was a read-only review pass, not a cleanup execution. The programming perspective identifies a real coverage gap from mocking the responsive state in CR-PROFILE-001. I found no introduced deletion-only or tautological test, needless production parsing/normalization, or speculative abstraction. UI copy assertions support actual permission/state/scope contracts rather than AI prompt prose. The long browser journey follows the repository's existing ownership-fixture pattern and has named checkpoints; it is not evidence that every later stage ran on earlier failed attempts. Framework boundary wrappers and the existing transport/controller are purposeful. No package/toolchain migration is warranted by generic skill preferences.

## Required closure

Close CR-PROFILE-001 with source plus a regression that exercises the real initial responsive boundary. Address/verify CR-PROFILE-002 with the independent UI reviewer. Preserve CR-PROFILE-003 and the original failed artifacts; independent QA must report its outcome and remaining uncertainty. No Phase3, hosted, physical-device, production or release approval follows from this report.

Report location rule: `omo-agent-toolkit ulw-loop status --json` returned `ULW_LOOP_PLAN_MISSING`; this report is also preserved at `.omo/evidence/employee-mobile-profile-code-review.md` per reviewer fallback.
