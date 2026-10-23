# Independent SelectField UI closure report to Jose

**UI recommendation: GO WITH CONDITIONS for the locally tested candidate `69ce51458b49031cb2c6a17db73d7d5d182e5992`. UI-1 is independently CLOSED.** Native arrow-menu behavior and the previously recorded physical-device/full-accessibility/hosted/model-quality limits remain unverified. This is not production authorization. Both earlier reports and their failed evidence remain unchanged.

## VERIFIED — target geometry, selection and focus

All four controls—Coverage date, Period start, Period end and Review language—measure **48px high** in **Chromium and WebKit at 320, 390 and 1440px**. That independently satisfies the approved 44px target and closes UI-1, including the WebKit native control failure that survived the previous min-height-only attempt. The actual application selector uses the established SelectField component. I inspected mobile and desktop viewport screenshots; English/Español and the chevron remain legible without overlap. The language control has a visible 2px focus outline. Computed appearance is none; computed right padding is 12px despite the source's 38px declaration, so I do not claim that declaration wins. The actual fixed option labels have adequate observed clearance.

In the actual application, after waiting for enabled state and asserting that the select is document.activeElement, pressing `e` selects English, then another `e` selects Español. Both value assertions and retained-focus assertions pass in both engines at all three widths. English and Spanish actual period-result reviews also pass. This is real keyboard typeahead, not programmatic selectOption substituted for the keyboard check.

Evidence: all 6 `ui-select-field/supplemental-typeahead/*-workflow-targets-*.json`, all 6 `*-language-keyboard-*.json`, per-key diagnostic JSON, and viewport screenshots. I visually inspected Chromium 320 and WebKit 320/1440 selector screenshots, plus the current baseline WebKit 390 period screenshot.

## VERIFIED — complete workflow replay and custody

Repository baseline passed in 71.56s with 28 scenario groups. Final external supplemental passed in 74.04s with 36 groups. These are 2 passing Vitest tests containing grouped checks. Both reports are complete=true. The final supplemental retains exact-source baseline assertions and adds English results, exact consent screenshots, target measurements and keyboard typeahead.

The merged candidate re-passes actual coverage proposal/exact draft save, unchanged draft notifications, separate initially unchecked published consent, invalid-submit→keyboard consent→canonical revision, briefing track/defer/restore and changed evidence, priority persistence and repeated revision-drift review, responsive layout and keyboard fields, synthetic private-state retirement, and real Manager/Employee discovery/page/API denial. Answer/error/cancel tests remain clearly labelled intercepted UI fixtures. No provider was configured and no real customer data or delivery used.

All 5 app runtimes, including 3 unsuccessful keyboard attempts, are CLOSED. I independently matched all 1,866 source hashes for each run to 69ce5145. Every ownership receipt confirms sourceVerified/mirrorVerified and derived dependency/cache release after closure. Owned PostgreSQL runners confirm stopped clusters. Git status was clean at final custody audit. Both complete reports show external=[] and errors=[]; all trace action/error records and diagnostics were inspected. There were no uncaught page exceptions or external browser requests. Expected navigation cancellations and deliberate 429 fixture console errors remain in diagnostics; “zero console/network errors” is not claimed. Parent was notified after final closure so its final build could proceed.

## RISK / LIMIT — native arrow-menu verification remains unresolved

Three supplemental attempts failed to switch Spanish using ArrowUp+Enter, Space+ArrowUp+Enter, and an explicitly enabled/focused ArrowUp+Enter sequence. They remain failed logs with complete:false, not rewritten as successes. The third attempt records disabled=false and activeElement=the SELECT before and after ArrowUp; value remained es. Enter then submitted the form and disabled it during the request.

I reproduced the same unchanged arrow/menu-key behavior in plain native selects with no application code, in both headless engines. Typeahead `e` reliably cycles both options in those controls and in the actual application. This does not establish an app-specific keyboard defect, nor does it certify native arrow-menu operation. A physical or faithful interactive browser check is needed before claiming that broader behavior. No system keyboard preference was changed. The successful typeahead check preserves exact value/focus assertions and does not waive the retained failures.

## Remaining conditions and findings

UI-1's size condition is closed by independent evidence. Earlier low-priority page-density and raw DRAFT Spanish-state wording observations remain follow-ups. Mobile exact-replacement/consent, physical touch/OS backgrounding, screen reader/full axe/contrast certification, larger actual populations, payroll-enabled result contents and model-generated reasoning remain outside this local certification. The security citation-bound change is not independently certified here. Source inventory, final build/CI, hosted acceptance and production approval belong to their separate gates.

No product, repository test, index or HEAD changes by this reviewer. Source stayed frozen throughout each runtime. External review harnesses and all failures are preserved under `ui-select-field/`. Matrix: `ui-select-field/owner-ai-integration-ui-manual-qa.md`. Source/diagnostic audit: `ui-select-field/closure-audit.json`. Every PASS links to non-empty artifacts.
