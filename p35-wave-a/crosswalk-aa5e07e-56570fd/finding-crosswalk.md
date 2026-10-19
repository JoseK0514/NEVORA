# Wave A historical finding crosswalk — static, not an exit certificate

Report snapshot `aa5e07e`; candidate patch base `56570fd0fc5e23503dbb50550af9dfcd965861ec`; ready Wave A `563bf65a83f6ff4ce97da4dc7eb131a18f9e9fea`. Read all five latest `round-2` reports, all44 original named findings, later ST-WA-7–11/TC-WA-15–16 and the preserved source supplements. No preview, CI, tests, source edits or browser work. The full1792 axe matrix and manual/state bar are unchanged.

**Retained causes:** ST-WA-1 and IS-WA-5 share the missing Coverage loading boundary; IS-WA-12 retains SelectField hint/name duplication and Optional markers. Two separate patch files are prepared, not applied. IS-P4-11 is an additional explicit cross-owner deferral supplied by Desktop and confirmed in the unchanged return-link code. Nothing in this audit closes a runtime finding.

The33-entry candidate ledger is compared to the current32-fix ready branch: only rolling `ST-RC-HOME-01` / `b68f250` is absent. That is an expected base refresh, not a separate Wave A finding. Candidate34 TC-P3-25 at56570fd is also later than the ready branch and remains root-owned.

| ID | Severity | Disposition | Provenance / implementation |
|---|---|---|---|
| AL-WA-1 | P0 | covered implementation; final browser recheck pending; Content container threshold follows rem text; default is one column, so text growth removes split. | `70bc122`; `src/app/app/premium-wave-a.css:124` |
| AL-WA-2 | P0 | covered implementation; final browser recheck pending; Coverage uses same content/rem threshold and one-column default. | `70bc122`; `src/app/app/premium-wave-a.css:162` |
| AL-WA-3 | P1 | covered implementation; final browser recheck pending; Availability counts stack within narrow card containers. | `70bc122`; `src/app/app/premium-wave-a.css:362` |
| AL-WA-4 | P1 | covered implementation; final browser recheck pending; Segment tracks use auto-fit/min(100%,9rem), min-width0 and wrapping. | `70bc122`; `src/app/app/premium-wave-a.css:298` |
| AL-WA-5 | P2 | covered implementation; final browser recheck pending; Checkbox/radio offsets follow half the first-line rem height. | `70bc122`; `src/app/app/premium-wave-a.css:52` |
| AL-WA-6 | P2 | covered implementation; final browser recheck pending; Title notice icon offset follows rem line height. | `70bc122`; `src/app/app/premium-wave-a.css:75` |
| AL-WA-7 | P2 | covered implementation; final browser recheck pending; Body-only notice has separate callout-line offset. | `70bc122`; `src/app/app/premium-wave-a.css:76` |
| AL-WA-8 | P2 | covered implementation; final browser recheck pending; Reading cap includes32px content padding, preserving720px cards. | `70bc122`; `src/app/app/premium-wave-a.css:118` |
| AL-WA-9 | P2 | covered implementation; final browser recheck pending; Decision grids stretch cards; last action block uses margin-top:auto. | `70bc122`; `src/app/app/premium-wave-a.css:279` |
| ST-WA-1 | P1 | confirmed reported cause retained; external patch prepared, not applied; Most own loading files/per-width rules exist, but Coverage has no loading.tsx and inherits schedule/grid. Retained Coverage subcase; ST-WA-1.patch prepared. | `24d0704`; `src/app/app/premium-wave-a.css:375` |
| ST-WA-2 | P1 | coordinator-owned implementation integrated; combined browser recheck pending; Shared coordinator font-loading fix is integrated; own-source cold-load/CLS still requires browser. | `62cd033`; `src/app/layout.tsx:20` |
| ST-WA-3 | P1 | covered implementation; final browser recheck pending; Exact source uses integrated HoldHeight component around list/empty state. | `7679133`; `src/components/availability-team-list.tsx:58` |
| ST-WA-4 | P2 | coordinator-owned implementation integrated; combined browser recheck pending; Shared coordinator measures last-pill geometry instead of scrollWidth padding. | `62cd033`; `src/components/kit/keep-selected-visible.tsx:9` |
| ST-WA-5 | P2 | coordinator-owned implementation integrated; combined browser recheck pending; Shared coordinator page min-height fixes exposed short-canvas shelf. | `aae87e4`; `src/app/app/portal-premium.css:190` |
| ST-WA-6 | P2 | coordinator-owned implementation integrated; combined browser recheck pending; Shared coordinator tab reserve/scroll padding integrated; verify actual bar clearance at large text. | `aae87e4`; `src/app/app/portal-premium.css` |
| ST-WA-7 | P1 | covered implementation; final browser recheck pending; Candidate reserves both labels in one grid cell, not transformed pixel hold. | `0e29e38`; `src/components/wave-a/pending-button.tsx:63` |
| ST-WA-8 | P1 | covered implementation; final browser recheck pending; Delete reserves both labels; ready Wave A also carries source PIN/timeoff useKeepHeight. Exact pending focus guard preserved. | `6e67193`; `src/app/app/schedule/edit/delete-shift-button.tsx:9` |
| ST-WA-9 | P2 | covered implementation; final browser recheck pending; Source PIN/timeoff hold uses layout offsets; candidate reserved labels avoid transformed measures entirely. | `7f75dc4`; `src/components/wave-a/keep-height.ts:16` |
| ST-WA-10 | P1 | covered implementation; final browser recheck pending; Source layout width hold plus candidate responsive reserved-label controls retained in review. | `7f75dc4`; `src/components/wave-a/keep-height.ts:16` |
| ST-WA-11 | P1 | covered implementation; final browser recheck pending; Source PIN/timeoff width clamp and candidate responsive label grid retained; actual rotation still must run on final review. | `a05f26a`; `src/components/wave-a/keep-height.ts:16` |
| TC-WA-1 | P1 | covered implementation; final browser recheck pending; Wave A row titles explicitly unset line clamp and allow wrapping. | `f3eb334`; `src/app/app/premium-wave-a.css:370` |
| TC-WA-2 | P1 | covered implementation; final browser recheck pending; Selected status moved under need label; shared Wave A title unclamp preserved. | `f3eb334`; `src/components/coverage-assistant.tsx:112` |
| TC-WA-3 | P2 | covered implementation; final browser recheck pending; Durations replace spaces with NBSP; affected summaries wrap duration and preceding dot together. | `f3eb334`; `src/components/wave-a/keep-duration.ts:5` |
| TC-WA-4 | P2 | covered implementation; final browser recheck pending; Delete/overnight hints join weekday/date with NBSP; labels remain whole. | `f3eb334`; `src/app/app/schedule/edit/page.tsx:118` |
| TC-WA-5 | P2 | covered implementation; final browser recheck pending; Choose-someone instruction is rendered only when READY with candidates; empty state omits contradiction. | `f3eb334`; `src/components/coverage-assistant.tsx:88` |
| TC-WA-6 | P2 | covered implementation; final browser recheck pending; Edit metadata and employee/new-person choices consistently use shortName. | `f3eb334`; `src/components/employee-scheduling-fields.tsx:54` |
| TC-WA-7 | P2 | covered implementation; final browser recheck pending; Swap/callout shift summaries and option names use Shift lead. | `f3eb334`; `src/components/swap-shift-summary.tsx:23` |
| TC-WA-8 | P2 | covered implementation; final browser recheck pending; Each step explicitly adopts kit body typography. | `f3eb334`; `src/app/app/premium-wave-a.css:324` |
| TC-WA-9 | P2 | covered implementation; final browser recheck pending; Receipt codes inherit surrounding kit role/font; no mono override. | `f3eb334`; `src/app/app/premium-wave-a.css:187` |
| TC-WA-10 | P2 | covered implementation; final browser recheck pending; Permission notice uses Add terminology. | `f3eb334`; `src/app/app/employees/new/page.tsx:15` |
| TC-WA-11 | P2 | covered implementation; final browser recheck pending; No-target band no longer promises absence of shifts as the only refusal reason. | `f3eb334`; `src/components/swap-page-content.tsx:22` |
| TC-WA-12 | P2 | covered implementation; final browser recheck pending; Swap/coverage/report pending cards use consistent Waiting label. | `f3eb334`; `src/components/manager-shift-requests.tsx:110` |
| TC-WA-13 | P2 | covered implementation; final browser recheck pending; Both role surfaces now use identical employee reason words. Source deliberately retained Illness / sick wording; no further editorial/legal rewrite inferred. | `f3eb334`; `src/components/manager-shift-requests.tsx:20` |
| TC-WA-14 | P2 | covered implementation; final browser recheck pending; Chip agrees with summary/stat/person status. | `f3eb334`; `src/components/availability-team-list.tsx:21` |
| TC-WA-15 | P1 | resolved shared integration observation; reverify final review styles; Explicit integration disposition: old source shared field1.413:1, newer coordinator/candidate measured3.45:1 on46 controls. Winning field token preserved, no duplicate Wave A patch. | `227150b`; `src/app/app/portal-premium.css:1388` |
| TC-WA-16 | P2 | covered implementation; final browser recheck pending; Winning disabled/aria-disabled opacity1 candidate override; historical152-case proof scopes old candidate, final review pending. | `fe77095`; `src/components/kit/kit.css:347` |
| IS-WA-1 | P1 | covered implementation; final browser recheck pending; ActionForm catches non-Next action failures, retains page and renders own notice. | `cdf714d`; `src/components/wave-a/action-form.tsx:34` |
| IS-WA-2 | P1 | covered implementation; final browser recheck pending; Candidate fixes newest intermittent catch/commit race using failed counter and post-commit reveal effect; PendingButton outcomes also retained. Repeated runtime failures still required. | `536dfe6`; `src/components/wave-a/action-form.tsx:25` |
| IS-WA-3 | P1 | covered implementation; final browser recheck pending; Wave A Field and callout help moved outside labels; shared FormValidation strips hints/optional words. SelectField name issue remains IS-WA-12. | `cdf714d`; `src/components/wave-a/parts.tsx:52` |
| IS-WA-4 | P1 | covered implementation; final browser recheck pending; Member/new and related segments use own kit error/retry boundary with one alert sentence. | `cdf714d`; `src/components/wave-a/route-error.tsx:10` |
| IS-WA-5 | P2 | confirmed reported cause retained; external patch prepared, not applied; Most segment loading labels/shapes fixed. Coverage still inherits Schedule grid/Loading schedule; same retained cause as ST-WA-1. | `cdf714d`; `src/app/app/schedule/loading.tsx:4` |
| IS-WA-6 | P2 | covered implementation; final browser recheck pending; Availability chips wrap instead of horizontal clipping. | `cdf714d`; `src/app/app/premium-wave-a.css:243` |
| IS-WA-7 | P2 | covered implementation; final browser recheck pending; Show everyone moves focus to persistent Everyone chip. | `cdf714d`; `src/components/availability-team-list.tsx:75` |
| IS-WA-8 | P2 | covered implementation; final browser recheck pending; Link drops overriding aria label, preserving visible words in native name. | `cdf714d`; `src/components/manager-time-off.tsx:142` |
| IS-WA-9 | P2 | covered implementation; final browser recheck pending; Manager guard precedes invalid-link and receipt rendering; read authorization remains independent. | `cdf714d`; `src/app/app/schedule/copy-receipt/page.tsx:50` |
| IS-WA-10 | P2 | covered implementation; final browser recheck pending; One alert sentence; actionable retry/back controls remain outside. | `cdf714d`; `src/components/wave-a/route-error.tsx:13` |
| IS-WA-11 | P2 | covered implementation; final browser recheck pending; Explicit source-report alternative implemented: kit OfflineNotice beside FormActions. Original shared unavailable sentence itself remains; verify visible offline outcome and no send. | `cdf714d`; `src/components/wave-a/offline-notice.tsx:15` |
| IS-WA-12 | P2 | confirmed reported cause retained; external patch prepared, not applied; Wave A Field/callout help separation landed; shared SelectField still includes hint in implicit label and describedby, plus Optional markers remain named. IS-WA-12.patch prepared. | `cdf714d`; `src/components/select-field.tsx:45` |
| WR-WA-1 | P1 | covered implementation; final browser recheck pending; Pairs require14rem per normal field,9rem for times/PIN, with min(100%,...) responsive stack. | `113fb9d`; `src/app/app/premium-wave-a.css:42` |
| WR-WA-2 | P2 | covered implementation; final browser recheck pending; Availability status wraps and uses auto height/max-width100%. | `113fb9d`; `src/app/app/premium-wave-a.css:47` |
| WR-WA-3 | P2 | covered implementation; final browser recheck pending; Closed native selects request ellipsis; engine behavior needs browser. | `113fb9d`; `src/app/app/premium-wave-a.css:45` |

## Explicit deferrals and source decisions

- **IS-P4-11 P2 remains:** original Desktop report line43, retained waiting-Wave-A statuses137/230. Parent coordinator owns the next assignment. Preserve the selected action-center item along with the Inbox filter, with an allow-listed ID; requestId is not the item identifier. The existing code does not do that.
- **Shared ST-WA-2/4/5/6:** coordinator-owned font readiness, pill overflow, canvas and tab reserve implementations are in the ready tree; their combined runtime checks remain required. They were deliberately excluded from Wave A-only counts, not silently closed.
- **TC-WA-15:** explicit newer-coordinator disposition already measured the same46 active controls at3.45:1. Do not duplicate that old shared-CSS observation as a fresh Wave A repair.
- **TC-WA-13:** source author deliberately harmonized manager reason words to the employee list (`f3eb334` commit body). Cross-role inconsistency is addressed; the optional editorial suggestion to shorten “Illness / sick” was not applied. No new P2 or authorized legal-wording change is inferred.
- **IS-WA-11:** the source report explicitly allowed Wave A to add an OfflineNotice beside actions while shared form-result wording remained unchanged; that alternative is implemented. Its actual offline outcome still needs final browser judgment.
- **C1–C3:** optional reviewer/need-count/receipt-description read enrichment and fallback contracts are separate joint-testing data work, already consumed when present. Business persistence, sends, approvals and copy execution are not certified by blocked/mocked UI states.
- **Jose wording/device authority:** legal/policy/status prose remains as supplied; phone access is still root/Jose-owned. No device, production, publishing or tunnel action is authorized by this audit.

Every row above is an implementation crosswalk only. Affected fields, placeholders, states and all five area judgments must be measured on the final frozen review SHA.
