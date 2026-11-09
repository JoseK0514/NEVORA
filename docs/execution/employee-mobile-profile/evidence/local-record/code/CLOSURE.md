# Profile code review — authored remediation closure

Candidate: `f52f314ed33f0aafae11afc4cb5fcb1103e5ddff`. Original report remains immutable. This addendum supersedes its BLOCK recommendation for this candidate only.

- codeQualityStatus: WATCH
- recommendation: APPROVE
- blockers: none remaining in this reviewer’s scope

## CRITICAL / HIGH

None remaining. **CR-PROFILE-001 closed.** Independently inspected the remediation at `src/components/employee-mobile/profile.tsx:27–54`: explicit server hydration snapshot gates the legacy desktop header; initial server output is generic and hydrated mobile identity remains owned by the finite reader. The desktop identity is retained after responsive hydration. The new static-render regression exercises the false/mobile-server path and failed against old source. Real authenticated, JavaScript-disabled DOM assertions in each engine now verify absence of the static identity. This is a DOM presentation guarantee, not a claim that server serialization contains no authorized data.

## MEDIUM

None remaining. **CR-PROFILE-002 closed.** The same parent now renders a keyed sibling array in mobile reading order (work details, Settings, Calendar) and original desktop order. CSS order overrides are removed. Stable keys preserve the Calendar owner rather than switching wrapper trees. Actual native keyboard traversal checks More → Refresh details → Sign-in language; existing Calendar-node identity checks survive mobile/desktop/mobile resize. Browser tests retain exact focus assertions.

## LOW / retained conditions

**CR-PROFILE-003 stays open:** preflight5 Firefox System appearance transition failed without a proven cause. Preflight6 and expanded9 passing do not establish a fix. Preserve diagnostic evidence and cover it in the independent combined gate.

Preflight9 retains seven WebKit preload warnings (CSS/font timing). There are no recorded page errors or unexpected console errors; warnings are not called error-free output. No new material code issue is inferred from these warnings alone.

## Evidence independently inspected

- Four-file remediation diff from8f1b53d4 through81c02cfb, then two-file scope/oracle corrections throughf52f314e. No implementation changes by this reviewer.
- `.superpowers/sdd/employee-mobile-profile-plan/local-review-order-ssr-red.log`: two new cases fail on old source; `local-review-order-ssr-green.log`: 18 tests pass across three files. No tests rerun by reviewer.
- `outputs/employee-mobile-profile/local-preflight-9/results.json` (under the design root): 42 named checkpoints, 108 registered captures, 54 contrast samples across Chromium/WebKit/Firefox. Three additional before-hydration PNG/HTML pairs exist outside the registered capture array. The raw `local-preflight-9.log` reports one complete three-engine journey pass.
- `local-preflight-9/owned-next-tpZkAB/ownership.json`: closed, sourceVerified and mirrorVerified true. Independently hashed all2016 source-manifest entries against the worktree: zero mismatches, exactf52f314e checkpoint.
- Preflight7/8 failures are retained. Preflight7 cannot claim later journey coverage. Preflight8 completed Chromium but stopped at the new Mac WebKit keyboard assertion.

## Oracle corrections and acceptance limits

Independently parsed preflight8 `chromium-profile-before-hydration.html`: native sign-out button is under Next’s hidden `div#S:1`. JavaScript-disabled role accessibility is therefore not proven and is not claimed. The final assertion and checkpoint are limited to server DOM identity exclusion; misleading noscript availability copy was corrected. Native sign-out with JavaScript, server session invalidation, cookie removal and unresolved device-proof retention remain tested in the unchanged substantive journey. No claim of a general no-JavaScript portal fix.

Inspected `outputs/employee-mobile-profile/local-probes/native-keyboard.json`: on darwin standalone native HTML, WebKit26.5 Tab skips button to language select whereas Alt+Tab reaches Refresh; Firefox153 Tab reaches Refresh. The platform-scoped Alt+Tab change preserves exact destination assertions and does not force tabindex or bypass traversal. This is an appropriate oracle correction. Apple documentation fetch timed out for this reviewer; no independent web-source verification is claimed.

## Skill perspectives

The previously loaded remove-ai-slops and programming criteria were reapplied to remediation. New tests cover SSR identity lifetime and actual user focus order; they are not deletion-only or tautological. The hydration snapshot and keyed ordering solve concrete lifecycle/accessibility problems without added parsing, normalization, untyped escapes or speculative abstraction. No new violation of either perspective identified.

Approval is for code quality of this exact bounded candidate, not final product acceptance, release, physical-device/assistive-technology certification, or the independent expanded22-file QA gate. I inspected artifacts and source; did not launch runtimes, execute tests, or personally inspect every capture. Original report is preserved.
