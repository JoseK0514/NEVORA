# Independent final Employee mobile QA

PASS for bounded independent representative local-browser review; no material finding. Not complete end-to-end34-workflow certification.

Current HTML SHA-256: `06c548a89f01e46c687c1d7e0a961da01c74952d6b7bfff34a1f7459e2396469`. Verified before/after and against each served initial page response. Baseline: `6b471b37047c6ba561b97ffacbad2cb71d638d87db62f44df9aa27ad91aa7c56`.

Chromium, WebKit and Firefox: **20/20 current scenarios each** plus **2/2 baseline reproductions each** (60 current +6 baseline; zero final failures). Zero page errors, unexpected/operational requests or native calls. All34 ledger IDs reconcile to current source;20 have fresh representative browser evidence and14 are source-only. A representative scenario does not prove every operation within its workflow.

Application checkout was inspected read-only at `46e202786863279302026ee03a0e225c359fa55c`, detached and clean. Prototype workspace is not a Git repository. No product source/build change, real message, API, credential, permission prompt, PR, commit or deployment was performed.

## manualQa.surfaceEvidence

Exact invocation: `node work/employee-mobile/evidence/final-mobile-review/independent-qa/review.cjs <engine>` for each engine. Each row ran in all three engines; action-level selectors, entered values, actual text/focus and verdict are in `<engine>/<ID>.json`.

| Scenario | Criterion reference | Exact browser path / expected result | Verdict | Artifact refs |
| --- | --- | --- | --- | --- |
| Q01 | home, schedule, schedule-review, recorded-time | Home → today detail → Schedule next/previous → review → Hours detail → More | PASS ×3 | `chromium/Q01.json`, `webkit/Q01.json`, `firefox/Q01.json` |
| Q02 | timeoff-full, timeoff-history, timeoff-withdraw, recovery | Requests → enter full-day draft → Escape → Hours → Requests → retain → submit → Keep request → cancel | PASS ×3 | `chromium/Q02.json`, `webkit/Q02.json`, `firefox/Q02.json` |
| Q03 | timeoff-partial, recovery | Requests → partial-day draft → Escape/reopen → discard/Keep editing | PASS ×3 | `chromium/Q03.json`, `webkit/Q03.json`, `firefox/Q03.json` |
| Q04 | availability-usual, availability-week | More → Availability → Monday native select Unavailable → review/save → reopen By week native select | PASS ×3 | `chromium/Q04.json`, `webkit/Q04.json`, `firefox/Q04.json` |
| Q05 | notification-inbox, schedule, recovery | More → Notifications → search SCHEDULE → source Oct19 week → Notifications exact row focus/search | PASS ×3 | `chromium/Q05.json`, `webkit/Q05.json`, `firefox/Q05.json` |
| Q06 | profile-read, language, appearance | More account → Language keyboard radio → Done focus → Dark → Light → readonly details | PASS ×3 | `chromium/Q06.json`, `webkit/Q06.json`, `firefox/Q06.json` |
| Q07 | support-legal | Profile support → account return, Privacy Policy → account return exact opener | PASS ×3 | `chromium/Q07.json`, `webkit/Q07.json`, `firefox/Q07.json` |
| Q08 | notification-inbox | 320px 200% Notifications deliberate soft-hyphen line break and accessible heading | PASS ×3 | `chromium/Q08.json`, `webkit/Q08.json`, `firefox/Q08.json` |
| Q09-on | account-delete, support-legal | deletion-result missing receipt → Open support → legal visibility on | PASS ×3 | `chromium/Q09-on.json`, `webkit/Q09-on.json`, `firefox/Q09-on.json` |
| Q09-off | account-delete, support-legal | deletion-result missing receipt → Open support → legal visibility off | PASS ×3 | `chromium/Q09-off.json`, `webkit/Q09-off.json`, `firefox/Q09-off.json` |
| Q09-missing-fact | account-delete, support-legal | deletion-result missing receipt → Open support → legal visibility missing-fact | PASS ×3 | `chromium/Q09-missing-fact.json`, `webkit/Q09-missing-fact.json`, `firefox/Q09-missing-fact.json` |
| Q10-denied | notification-inbox, modules | Notifications denied fixture refuses records and refresh | PASS ×3 | `chromium/Q10-denied.json`, `webkit/Q10-denied.json`, `firefox/Q10-denied.json` |
| Q10-foreign | notification-inbox, modules | Notifications foreign fixture refuses records and refresh | PASS ×3 | `chromium/Q10-foreign.json`, `webkit/Q10-foreign.json`, `firefox/Q10-foreign.json` |
| Q11 | timeoff-full, modules | Timeoff off hides creation/history while Availability remains editable | PASS ×3 | `chromium/Q11.json`, `webkit/Q11.json`, `firefox/Q11.json` |
| Q12 | profile-read, modules | Unrelated profile refuses own controls and identity | PASS ×3 | `chromium/Q12.json`, `webkit/Q12.json`, `firefox/Q12.json` |
| Q13 | pay-statements, modules | Pay default off, enabled own list, foreign/module-off refuse statement records | PASS ×3 | `chromium/Q13.json`, `webkit/Q13.json`, `firefox/Q13.json` |
| Q14 | recovery, timeoff-full | 320px 200% dark unavailable Time off → Check again → draft keyboard containment/Escape | PASS ×3 | `chromium/Q14.json`, `webkit/Q14.json`, `firefox/Q14.json` |
| Q15 | sign-out, recovery | Profile Sign out → Keep signed in → Sign out → direct hours/notifications/profile routes refuse private reentry | PASS ×3 | `chromium/Q15.json`, `webkit/Q15.json`, `firefox/Q15.json` |
| Q16 | modules, recorded-time, notification-inbox | Each root and inbox lacks Employee management/phone punching/generic Mark read actions | PASS ×3 | `chromium/Q16.json`, `webkit/Q16.json`, `firefox/Q16.json` |
| B01 | two-polish-fixes | Route local URL to saved baseline; page=notifications at320px; html font-size200%; Original baseline lacks authored break and uses arbitrary wrap | PASS ×3 | `<engine>/polish-comparison.json` |
| B02 | two-polish-fixes | Saved baseline page=deletion-result; read fallback text and available controls; Original baseline says legal links are below while direct links absent | PASS ×3 | `<engine>/polish-comparison.json` |
| Q17 | notification-inbox | Current page=notifications&notifications=earlier-week → Action needed → search SCHEDULE → Schedule update → Notifications; Filter/search and exact row focus persist | PASS ×3 | `<engine>/polish-comparison.json` |

B01/B02 deliberately reproduce the old defects; they do not label baseline behavior correct. Supplemental invocation: `node work/employee-mobile/evidence/final-mobile-review/independent-qa/polish-comparison.cjs` (all3 engines). Q08 measures actual authored line breaks and accessible heading lookup; screenshots were visually inspected. Q09 asserts copy, no invented reference and legal gates.

## manualQa.adversarialCases

| Scenario | Adversarial class | Expected behavior | Verdict | Artifact refs |
| --- | --- | --- | --- | --- |
| Q02 | retained draft and cancellation | Closure/navigation preserves own unsent draft; explicit cancellation only updates own Pending sample | PASS | `chromium/Q02.json`, `webkit/Q02.json`, `firefox/Q02.json` |
| Q09-off | legal visibility off | Support reachable; no fabricated receipt or unavailable legal links | PASS | `chromium/Q09-off.json`, `webkit/Q09-off.json`, `firefox/Q09-off.json` |
| Q09-missing-fact | missing legal facts | Missing facts fail closed, support stays reachable | PASS | `chromium/Q09-missing-fact.json`, `webkit/Q09-missing-fact.json`, `firefox/Q09-missing-fact.json` |
| Q10-denied | denied authority | No inbox records or repair control | PASS | `chromium/Q10-denied.json`, `webkit/Q10-denied.json`, `firefox/Q10-denied.json` |
| Q10-foreign | foreign identity | No foreign inbox content | PASS | `chromium/Q10-foreign.json`, `webkit/Q10-foreign.json`, `firefox/Q10-foreign.json` |
| Q11 | module off | No Time off actions/history; independent Availability remains | PASS | `chromium/Q11.json`, `webkit/Q11.json`, `firefox/Q11.json` |
| Q12 | foreign profile | Identity/work details/preferences withheld | PASS | `chromium/Q12.json`, `webkit/Q12.json`, `firefox/Q12.json` |
| Q13 | financial/module scope | Foreign/module-off has no statements; enabled own list has two; no automatic document | PASS | `chromium/Q13.json`, `webkit/Q13.json`, `firefox/Q13.json` |
| Q14 | narrow enlarged text and keyboard | Recovery and draft usable at320px200%; native dialog contains focus and Escape returns opener | PASS | `chromium/Q14.json`, `webkit/Q14.json`, `firefox/Q14.json` |
| Q15 | session closure/direct reentry | No private content after sample sign-out; only ended boolean persisted | PASS | `chromium/Q15.json`, `webkit/Q15.json`, `firefox/Q15.json` |
| Q16 | management/phone punching exclusion | No management, phone clock-in/out or generic inbox Mark read controls | PASS | `chromium/Q16.json`, `webkit/Q16.json`, `firefox/Q16.json` |
| N01 | real native credentials/permission or external delivery | Not applicable to two presentation/copy fixes: prototype makes no native or live operational calls; all engines capture zero. Actual integration remains unverified. | not_applicable | `chromium/results.json`, `webkit/results.json`, `firefox/results.json` |

## 34-workflow reconciliation

Every row has a freshly captured current prototype file/hash and application source excerpt/hash in `source-review.json`. All source markers resolve. The ledger’s older HTML hash is retained as historical evidence, not relabeled. Live operations remain **UNVERIFIED for every row**.

| Workflow ID | Fresh browser basis | Current prototype source | Review boundary |
| --- | --- | --- | --- |
| home | Q01 | `Home.tsx` | Representative local path; live operation unverified |
| schedule | Q01, Q05 | `Schedule.tsx` | Representative local path; live operation unverified |
| schedule-review | Q01 | `ScheduleReview.tsx` | Representative local path; live operation unverified |
| open-shifts | None — source only | `ExchangePanel.tsx` | End-to-end NOT VERIFIED by this review |
| swap-create | None — source only | `ExchangeCreate.tsx` | End-to-end NOT VERIFIED by this review |
| swap-incoming | None — source only | `ExchangeDetail.tsx` | End-to-end NOT VERIFIED by this review |
| callout | None — source only | `ExchangeCreate.tsx` | End-to-end NOT VERIFIED by this review |
| exchange-history | None — source only | `ExchangePanel.tsx` | End-to-end NOT VERIFIED by this review |
| timeoff-full | Q02, Q11, Q14 | `TimeOffRequest.tsx` | Representative local path; live operation unverified |
| timeoff-partial | Q03 | `TimeOffRequest.tsx` | Representative local path; live operation unverified |
| timeoff-history | Q02 | `Requests.tsx` | Representative local path; live operation unverified |
| timeoff-withdraw | Q02 | `RequestDetail.tsx` | Representative local path; live operation unverified |
| availability-usual | Q04 | `Availability.tsx` | Representative local path; live operation unverified |
| availability-week | Q04 | `Availability.tsx` | Representative local path; live operation unverified |
| recorded-time | Q01, Q16 | `Hours.tsx` | Representative local path; live operation unverified |
| timecards | None — source only | `Timecards.tsx` | End-to-end NOT VERIFIED by this review |
| entry-correction | None — source only | `TimeCorrectionForm.tsx` | End-to-end NOT VERIFIED by this review |
| missing-time | None — source only | `TimeCorrectionForm.tsx` | End-to-end NOT VERIFIED by this review |
| correction-history | None — source only | `CorrectionHistory.tsx` | End-to-end NOT VERIFIED by this review |
| notification-inbox | Q05, Q08, Q10-denied, Q10-foreign, Q16 | `Notifications.tsx` | Representative local path; live operation unverified |
| company-updates | None — source only | `CommunicationDetail.tsx` | End-to-end NOT VERIFIED by this review |
| team-post | None — source only | `CommunicationCompose.tsx` | End-to-end NOT VERIFIED by this review |
| profile-read | Q06, Q12 | `Profile.tsx` | Representative local path; live operation unverified |
| language | Q06 | `PreferenceChoices.tsx` | Representative local path; live operation unverified |
| appearance | Q06 | `PreferenceChoices.tsx` | Representative local path; live operation unverified |
| device-alerts | None — source only | `DeviceAlerts.tsx` | End-to-end NOT VERIFIED by this review |
| calendar | None — source only | `Calendar.tsx` | End-to-end NOT VERIFIED by this review |
| passkeys | None — source only | `Passkeys.tsx` | End-to-end NOT VERIFIED by this review |
| support-legal | Q07, Q09-on, Q09-off, Q09-missing-fact | `PolicyReader.tsx` | Representative local path; live operation unverified |
| account-delete | Q09-on, Q09-off, Q09-missing-fact | `AccountDeletion.tsx` | Representative local path; live operation unverified |
| sign-out | Q15 | `AccountTools.tsx` | Representative local path; live operation unverified |
| pay-statements | Q13 | `Pay.tsx` | Representative local path; live operation unverified |
| modules | Q10-denied, Q10-foreign, Q11, Q12, Q13, Q16 | `App.tsx` | Representative local path; live operation unverified |
| recovery | Q02, Q03, Q05, Q14, Q15 | `session-model.ts` | Representative local path; live operation unverified |

## manualQa.artifactRefs

Evidence root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/final-mobile-review/independent-qa`. Every PASS links to a non-empty artifact. `artifact-manifest.json` enumerates 138 evidence files with id, kind, description, absolute path, SHA-256 and bytes. `manualQa.json` provides the complete structured matrix and34-workflow map.

| ID | Kind | Description | Path |
| --- | --- | --- | --- |
| chromium/results.json | browser report | 19 current scenarios, console/request/native capture, build hash | `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/final-mobile-review/independent-qa/chromium/results.json` |
| chromium/polish-comparison.json | browser action/results | 2 baseline reproductions +1 current filter-return scenario | `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/final-mobile-review/independent-qa/chromium/polish-comparison.json` |
| webkit/results.json | browser report | 19 current scenarios, console/request/native capture, build hash | `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/final-mobile-review/independent-qa/webkit/results.json` |
| webkit/polish-comparison.json | browser action/results | 2 baseline reproductions +1 current filter-return scenario | `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/final-mobile-review/independent-qa/webkit/polish-comparison.json` |
| firefox/results.json | browser report | 19 current scenarios, console/request/native capture, build hash | `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/final-mobile-review/independent-qa/firefox/results.json` |
| firefox/polish-comparison.json | browser action/results | 2 baseline reproductions +1 current filter-return scenario | `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/final-mobile-review/independent-qa/firefox/polish-comparison.json` |
| source-review.json | source evidence | All34 source markers/excerpts, prototype source, hashes | `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/final-mobile-review/independent-qa/source-review.json` |
| artifact-manifest.json | provenance | All evidence files with hashes/sizes | `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/final-mobile-review/independent-qa/artifact-manifest.json` |

Screenshots inspected: Chromium baseline Notifications/missing receipt, Chromium notification current, WebKit Notifications current, Chromium recovered320px200% dark draft, Chromium dark account and Support legal-off. Current Notifications renders “Notifica- / tions” and retains accessible name “Notifications”. No screenshot substitution or accessibility certification is claimed.

## Disposition and remaining limits

No material product defect found within the executed paths. First Chromium run contained three harness mistakes, preserved under `diagnostic-chromium/` and `diagnostic-review.cjs`; corrected expectations/locators are grounded in rendered labels, legal gate source and visible glyph positions. The corrected full scenario set passed in all3 engines.

The14 source-only workflows are not passed as executed QA. Production integration, all-workflow end-to-end parity, live authorization/concurrency, durable requests, protected Pay download delivery, account deletion submission, actual logout, notifications, calendar access, WebAuthn and physical-device/screen-reader certification remain unverified. This bounded pass does not replace parent-owned full regression and visual matrices. No user action is needed to finish this local review.
