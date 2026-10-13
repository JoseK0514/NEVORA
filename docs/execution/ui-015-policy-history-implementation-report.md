# UI-015 Company Policies recovery — implementation checkpoint

The normal Owner policy page now handles an unavailable selected revision without crashing or activating an earlier policy. Recovery is an explicit, reviewed same-scope replacement. This is a separate candidate for independent combined acceptance; the existing Owner preview remains on its original completed UI checkpoint.

## Source and isolation

- Branch: `codex/nevora-ui-policy-history-20261012`.
- Verified application checkpoint: `013253301574b9e83e2caae8cd3f355e1a543a5b`.
- UI-only range: `0f003ee9e9d453e8dee5b6f4ced3d5a80f17b2cb..013253301574b9e83e2caae8cd3f355e1a543a5b` (six commits).
- Original completed UI/preview: `codex/nevora-ui-ux-refinement-20261012`, `b6e7c440f398a95644f8fb714fb9f6ae9065eec3`, clean and unchanged.
- Exact adopted Company originals: `411f4bb45f81edef516cca2f1663855021b7726c`, `1dc9d5acd530799da453935c79256c4272336aaa`, `229f39f03ab0cc9fee7510caac58cde93cd3f7d8`. Local cherry-pick equivalents: `00594092`, `fbf933eb`, `0f003ee9`. All six history/private-GET/validation source entries match their author intake hashes and original committed bytes.
- DEV, MAIN, the assembled baseline and peer workspaces are unchanged. No push, merge, deployment, schema change, external communication or real notification delivery.

## Resolution matrix

| Requirement | Current disposition | Evidence |
|---|---|---|
| Native page crashes on malformed selected/history data | Corrected locally: typed read renders a held state; valid newest revision remains editable despite older invalid history | Page/editor tests, native RED, final actual page/browser |
| Actual selected revision | Uses numerical authoritative expectedRevision, never changedAt ordering or a latest-valid fallback | Opposite timestamp fixture; real expectedRevision 2 correction to revision 3 |
| Invalid current recovery | No editor until explicit same-scope prior valid draft; complete replacement and private labor review acknowledgement required | Keyboard review, immutable row comparison, request inspection |
| Full private settings preservation | Validated compensation/rates/budgets/calculation reference retained exactly; attendance-only changes preserve private labor | Builder tests and company/location SQL/browser checks |
| Empty/null/inherited scope distinctions | Empty revision 0, explicit null and absent overrides remain distinct; no company payload borrowed as a location revision | Location correction/inheritance assertions |
| Inactive/no eligible valid prior draft | History stays readable; mutation held, no cross-scope fallback | Browser scenarios and screenshots |
| Invalid inherited company default | Warning survives valid location selection; attendance remains unavailable | Both engines 390/1440 and actual attendance read |
| Stale draft/conflict | Draft retained and compared; explicit discard/use-current required, no auto-merge/rebase | Manual newer read and actual 409 |
| Unconfirmed operation | Exact in-memory command frozen; retry retains operation ID/body, safe across a later revision | Real committed response loss, later revision, exact retry; pre-commit interruption |
| Receipt versus current revision | Reports saved receipt separately from current selected policy | Revision 6 receipt / revision 7 current assertion |
| Private read/unavailable/auth | No actionable blank form; unfinished values survive read failure; denial clears private draft/history | GET 503 recovery, actual Owner revocation, Manager/Lead/Employee denial |
| Input and labels | Blank custom threshold rejected, accessible scope/select labels, no raw parser diagnostics | Unit tests and browser axe/keyboard |
| Original policy history | Original company and location rows remain identical after correction; no rewrite | Actual PostgreSQL row equality |

## Changes

Only `company-policies/page.tsx`, `company-policy-editor.tsx`, scoped `company-policies.css`, their two test files and the UI fixture changed, plus execution/handoff docs. Client uses type-only history/model imports; no server projector is bundled. Existing Inter, Phosphor, palette, controls and authorization are reused. Private labor review is read-only; complete labor authoring, tax rules and payroll functionality are outside this increment.

## Verification

| Check actually run | Result |
|---|---|
| RED tests before UI changes | 12 expected failures in final pre-fix tests; native browser strict-parser render failure reproduced |
| Affected parser/history/HTTP/labor/page/editor | 403/403 passing after the review fixes, six files; initial task-done 401/401 |
| Full default suite, approved local process permissions | 7,405 passed / 801 console-reported skipped; 408 files passed / 27 skipped; exit 0 |
| Other discovered assertions | 55 existing held native Portal installation fixture cases not reported as executed successes; not claimed passing |
| TypeScript | Pass, exit 0 recorded in final-command-exits.json |
| Scoped ESLint | Pass, exit 0 recorded in final-command-exits.json |
| Production Next build/mirror | Pass; source and mirror hash custody verified at teardown |
| Original functional + Chromium run at a4cb809c | 43 passed checks; 24 WebKit HTTP fixture failures retained in that historical run |
| Final post-review local HTTPS surfaces at 01325330 | 52 passed checks, zero failures; all 48 Chromium/WebKit cases and inherited warning on both engines |
| Final review regression flows at 01325330 | 5/5 passing in each engine; saved-receipt/read-failure/newer-revision and complete comparison; screenshots/axe at 390/820/1440 |
| Responsive/automated accessibility | 48 passing surface cases/captures at 320, 390, 768, 820, 1024, 1440; Chromium and WebKit; axe WCAG A/AA, no new horizontal overflow, no page errors |
| Keyboard/focus | Explicit review via Enter, acknowledgement via Space, save via Enter and notice focus verified |
| Access/privacy | Actual current-role revocation plus Manager/Lead/Employee denial; generic response and no private compensation visible |

The restricted-sandbox full run initially failed 40 runner/process tests. Those same unchanged files passed with approved process permissions (83 and 13 follow-up assertions), followed by the successful full-suite repeat. Failures remain in historical logs. WebKit failed on the HTTP production-cookie fixture; the HTTPS run passed while preserving secure cookies and all application bytes. Counts overlap and are not unique business requirements.

## Evidence

Evidence root: `../ui015-evidence/`. Its README indexes logs, scripts, source manifests, captures and historical attempts. `verification-receipt.json` binds source/evidence hashes; `backend-custody.json` verifies the exact Company dependency. Reproduction scripts: task-root `ui015-browser.mjs` and `ui015-browser-supplement.mjs`. Both final owned database/server runs stopped cleanly.

The full initial F01–F17/Owner enhancements report remains `../NEVORA_UI_UX_IMPLEMENTATION_REPORT.md`. This document is the subsequent UI-015 integration supplement and does not retroactively alter that source or its evidence.

## Remaining gates

Independent combined NVA-002/UI-015 acceptance must replay the normal Owner recovery using this exact UI + Company candidate. Author verification and a fresh code review do not self-close it. Physical-device testing, manual screen-reader assessment, native 200% zoom and hosted readiness remain unverified. Arbitrary database corruption beyond validated legacy malformed enums is not certified as repairable.

UI-017 own published pay-statement notices remain queued for a separate exact Finance-authorized predicate/assembled privacy verification. The captured Finance access pre-integration review explicitly requests a frozen final candidate; its current-role/scoped predicate is owned by Finance, and the old UI checkpoint uses old grant flags. No authorization predicate is improvised here. Native UI-010/UI-011/UI-016 remain draft dependencies. Nothing here expands their business scope or asserts payment.

Fresh whole-branch review inspected `a4cb809c` and requested two corrections: retain a confirmed receipt through a failed follow-up read, and include every semantic rule field in stale comparison. Both were reproduced as failing native HTTPS browser checks; comparison display tests also failed before implementation. The one fix pass is commit `01325330`; both regressions then pass in Chromium and WebKit, including 390/820/1440 comparison accessibility/overflow captures. The raw review remains unchanged at task-root `.omo/evidence/ui-015-policy-history-recovery-code-review.md`; final disposition/evidence is task-root `ui015-evidence/REVIEW_DISPOSITION.md`. No second review or independent acceptance closure is claimed.

## Rulings made

1. Use an independent local clone to protect the live preview source and Git metadata. Cost if wrong: extra local disk and a separate integration increment.
2. Hold an invalid selected scope without a valid same-scope reviewed predecessor. Full private labor authoring is absent here; automatic reconstruction risks losing financial settings. Cost: Owner correction requires a later complete authoring capability for that case.
3. Follow the current canonical READY queue for candidate preparation while preserving independent combined acceptance. The older proposal's acceptance wording does not prevent bounded author preparation. Cost if wrong: candidate remains held from integration pending acceptance clarification.
4. Use a test-only local HTTPS proxy for WebKit production verification, preserving secure cookies. Cost if wrong: local certificates are not evidence for hosted TLS or physical-device behavior.
5. Keep arbitrary malformed/corrupt payload repair held; the demonstrated typed legacy recovery is bounded. Cost if wrong: more corruption cases require separate backend repair capability.
6. Leave effective attendance/business correctness beyond this adopted contract to independent combined service/SQL QA. Actual before/after attendance reads are author evidence. Cost: customer readiness remains dependent on independent checks.
7. Leave physical devices, manual screen readers, native zoom, hosted infrastructure and production readiness pending. Cost: local author coverage cannot establish those acceptance conditions.
8. Confirm initial preview continuity with an actual HTTP 200 probe and unchanged source, while withholding any guarantee of long-term tunnel availability. Cost: the temporary preview may stop with its local runtime.
9. Keep the branch local and preserve it for review, as the Owner explicitly withholds merge/deployment authorization. Cost: release remains a separate authorized step.

## Deferred minor

Broad formatting and cohesive extraction of the inherited oversized editor remain a maintenance follow-up. Current-rule display was separated within the owned editor for the correctness fix; no competing design component system was added. This does not block bounded candidate preparation.
