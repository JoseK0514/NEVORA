# Employee mobile teal — Phase 1

Jose selected the new Owner concept's clean teal direction for Employee mobile, then authorized Phase 1 of `docs/execution/employee-mobile-phase1/plan.md`. This is an Operate surface: employees find their next shift, distinguish scheduled time from recorded punches, and review their own published week. This scoped decision supersedes older blue/Quiet presentation only for the implemented Employee/Lead mobile surfaces; it does not replace global DESIGN.MD or authorize management capabilities.

## Implementation boundary

`src/components/employee-mobile/mobile.css` owns the semantic palette, typography, spacing, radii, target sizes and focus. The actual `#employee-mobile` root is present only for Employee/Lead. Media rules share `useEmployeeMobile`'s767px breakpoint and coarse short-landscape query. A responsive active marker fences the legacy E5/Quiet shell chrome; desktop and other roles retain their existing CSS. Home and Schedule have explicit page markers. Other Employee pages retain their incumbent content until their Phase 2 batch. Their shared navigation receives the new foundation.

Use system typography from the approved mobile prototype and the existing original NEVORA wordmark and regular Phosphor icons. Do not add a second icon library, ornamental imagery, gradients, fabricated facts or screenshot assets. The global local-font/Signature system remains the desktop authority.

## Semantic choices

- Canvas `#f4f7f6`, surface white, ink `#172622`, supporting ink `#5f6d68`, action teal `#0b6e69`, selected wash `#eaf4f1`. Dark canvas `#0c1817`, surface `#172725`, ink `#f5f2eb`, supporting ink `#b8b7b0`, action `#a9e2da`. Foreground/background pairs travel together.
- Shared type roles: title32px, section19px, body/action16px, supporting14px, nav12px, shift22px at the default root size. Leading and weights are tokens. Text uses rem so the implemented surfaces respond to root text enlargement.
- Spacing uses4/8/12/16/20/24/28/32px tokens. Standard content inset24px,20px on narrow phones; section gap28px. Cards16px, controls12px, small surfaces8px. Primary actions48px; interactive controls at least44px. Seven-day strips bleed to6px edges on320px phones to preserve44px day targets.
- Selected days use teal text on a wash, without an inherited dark disc. Status never depends on color alone. Navigation grows to three columns at125% and two at150/200%; ResizeObserver reserves its measured height. Full-page task sheets keep their existing navigation dismissal behavior.

## Component and data ownership

The adapter reuses AppShell, QuietHeader/Section/List/Row/Segments, EmployeeHomeActions and its private release controller, EmployeeTimePanel, EmployeeMySchedule, ShiftSheetRow and EmployeeWeeklyConfirmation. No parallel mock data tree or new server contract is introduced. Home's current/next shift comes from the published-assignment reader; clock status is an independent actual-punch read and remains useful with no planned shift. The location Clocker continues to record punches.

Schedule presents the page title, week chooser, view segments, day strip, canonical review state and own shifts. The native date field resolves an actual Monday week and selected day; Calendar sync retains its existing destination in the chooser. The heading is first in DOM order; a small presentation wrapper preserves the prior desktop bar position. Confirmation keeps its original operation ID, displayed revision and server authority. Only a fresh canonical read displays success; a lost response retries the original operation.

The Calendar fragment targets the disclosure itself, with a separate accessible panel-heading ID. This avoids the browser opening a closed ancestor before React hydrates and preserves the existing fragment URL and focus return.

## Reference and supply provenance

Approved prototype: `outputs/employee-mobile/index.html` in the design task workspace, SHA256 `06c548a89f01e46c687c1d7e0a961da01c74952d6b7bfff34a1f7459e2396469`. Screens are a composition reference; actual service states and policy remain authoritative. Existing Gusto/Homebase/Mobbin research is retained in the prototype and incumbent design records. This phase does not claim a new competitor audit or exact clone.

21st free metadata search informed compact native week controls (Date Picker7499, React Day Picker470, Compact Date Picker29180). Existing project/native primitives fit this task; no retrieved code, paid retrieval, package or hosted generation was added. CLI review availability and actual checks are recorded in the execution handoff. Independent review reports own their acceptance findings; this design record is not certification.


## Phase 2 response/detail continuation

Incoming swaps and own shift requests continue this scoped mobile system. One full-page detail presents status, the original reviewed shift(s), explicit response consequences, current permitted controls and native history disclosure. Unavailable immutable report terms remain unknown; never replace them with a changed live assignment. Swap withdrawal explains that both employees keep their current assignments; pickup withdrawal explains one unchanged assignment. The shared mobile navigation stays opaque in both themes so underlying task copy cannot bleed through.

No new design library or business engine. See `docs/execution/employee-mobile-responses/HANDOFF.md` for exact tested candidate, independent findings/closure, supply provenance and remaining gates. This continuation does not certify the remaining Phase 2 workflows.


## Phase 2 creation/report continuation

Swap/cover creation and Unable-to-work submission reuse the reviewed-shift summary, semantic teal controls and native fieldset/radio/textarea vocabulary. The employee starts with an own published shift; swaps offer positively checked same-week targets, and coverage/reporting explain that the assignment remains until completion or release. The existing intercepted native task uses a scoped full-height mobile presentation; direct links use the same form. Closing returns focus to the originating shift row. Native browser-chrome navigation remains available, while blur releases private facts and pointer return refreshes current authority.

A source-term change requires deliberate review; a changed selected target requires a new choice. Retained reason/note/selection stays only in mounted memory through refresh/pause. Submission/recovery uses one original operation and exact own detail links. No persistent private cache, new visual world or management capability. See `docs/execution/employee-mobile-creation/HANDOFF.md` for exact implementation/evidence and the independent authored review conditions.

## Phase 2 time off and availability continuation

Own time off uses full-page Waiting/Decided lists, exact protected detail links, a native full/partial-day form and an explicit pending-withdrawal confirmation. Native date/time controls use real labels and field-linked errors; a partial-day date spans its row with start/end times grouped beneath it. The existing calendar-day midnight boundary is preserved. Legacy request fragments resolve to exact own details on mobile; desktop retains its existing sheets.

Availability uses the same segmented-link treatment and seven expandable day rows, retaining split intervals. The existing availability resolver unions overlapping/adjacent legacy usual windows. Weekly confirmation distinguishes not submitted from intentionally unavailable all week and checks the real deadline under the existing write lock. A mounted stale draft can reapply only its deliberately edited days to current saved hours, including all seven days for an explicitly unavailable whole week. Separate recovery decisions have token spacing; invalid periods open and focus their own day/field with an associated error.

Own planning requires current Employee/Lead identity, workspace and session, without inventing an assigned-location prerequisite. Availability remains independent of the Time-off module. Unknown writes retain immutable original intent in memory; time-off uses its existing stable request identity, while availability reads canonical matching state and an exact guarded basis rather than inventing a durable operation receipt. All private facts release on pause or denial. Scoped tokens, native controls and regular Phosphor remain the visual authority.

21st free metadata references for this continuation: Calendar474, Time Off Request Calendar25171 and Weekly Availability Checkbox Grid24924. Existing project/native controls fit; no paid code, generation or dependency was used. Local CLI review is unavailable (command not found); actual checks and independent acceptance limits live in `docs/execution/employee-mobile-planning/HANDOFF.md`.


## Phase2 Notifications and Updates continuation

Notifications and Updates retain the same scoped palette, type, spacing, regular Phosphor and native44/48px control vocabulary. Current-source lists have bounded paging, filter/search and exact destination/return focus. Detail separates own reading from permitted acknowledgement; opening a notification does not record either. Today-team authoring uses native fields, canonical text/expiry validation, field-associated errors and first-invalid focus, followed by deliberate current audience review. Withdrawal requires explicit confirmation.

One mounted authority-scoped owner keeps draft/list/original uncertain intent through soft navigation. Pause, expiry, denial and current module loss remove private content and stale action admission; late replies cannot invent success. A refused original lookup preserves its immutable identity and waits for fresh current authorization. Notifications remain independently usable when Updates is off. No private persistent cache, delivery/read-by-coworker claim or management capability was added.

The original submitted regression, subsequent independent findings, final frozen evidence and authored nonblocking conditions are recorded in `docs/execution/employee-mobile-communications/HANDOFF.md`. Three-engine local evidence is separate from physical-device/assistive-technology/hosted/release readiness and does not complete the remaining Phase2 workflows. Recorded21st metadata references27135/36949/31789/28458 were adapted with existing project/native primitives; no paid retrieval, new library or CLI review is claimed.


## Phase2 Profile/preferences/help/session continuation

Own identity/work facts remain inside the finite canonical reader and disappear on pause, failure, denial or sign-out. The static desktop header waits for hydration; mobile visual/DOM/keyboard order agree while keyed Calendar/passkey/account owners survive resize. Native labelled preferences truthfully limit language to sign-in and appearance to this device. Shared rem type/line height, inset Phosphor carets,44/48px controls and continuous short-page canvas support enlarged text and pending states. Contextual legal/help reuse canonical facts/visibility and fixed return focus. Existing native logout owns side effects and uncertain cleanup remains honest.

The existing appearance owner reconciles the latest choice once before paint so coalesced native changes around System do not leave an intermediate theme; this adds no parallel owner/polling. All material Profile code/UI/QA findings have author-owned closure at application candidate2e4104ce. Exact independent682/183/static/custody evidence and remaining capability/physical-device/release limits are in [the Profile handoff](../../../execution/employee-mobile-profile/HANDOFF.md). The remaining Calendar/passkey/device/deletion/Pay ports are not certified by reachable legacy controls.

## Phase2 Calendar continuation

Calendar remains the optional native Profile disclosure reached by Schedule's fixed fragment, with one stable subscription/operation owner across responsive changes. Mobile replaces the decorative example with a current link state, labelled one-time copy/select field, three native provider guides and deliberate replace/revoke confirmation. Teal semantic tokens, rem type, inset regular Phosphor carets and44/48px controls carry the established system. Warnings use calm semantic surfaces and explicit recovery.

The canonical own guarded read now supplies a DB-clock/session-bounded lease and current eligible-location issuance capability. One client validates exact status/operation receipts, limits header/body waits, subtracts round-trip time, clears private facts on pause/expiry/signout and preserves the original uncertain command through unrelated appearance storage or mounted resume. A created secret is displayed only after a fresh current-generation read. No credential is persisted/reconstructed and no provider connection is claimed. The existing bearer policy intentionally survives portal signout; revocation stops future access, not previously copied entries.

Provider guidance checked2026-10-27 against official [Apple](https://support.apple.com/en-us/102301), [Apple iPhone guide](https://support.apple.com/en-ca/guide/iphone/iph3d1110d4/ios), [Google](https://support.google.com/calendar/answer/37100?hl=en) and [Microsoft](https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web). No real subscription, paid retrieval/generation or dependency was used. Execution and certification limits belong to the Calendar handoff.

Calendar local application candidate `f58d040b` has authored code/UI/QA conditional acceptance:799units/254integration checks, with original failures preserved. The historical Firefox request-monitor anomaly remains OPEN RISK, cause unresolved; the current pass does not establish a fix. See [Calendar handoff](../../../execution/employee-mobile-calendar/HANDOFF.md) for exact source/runtime evidence, observation limits and deferred release/device/provider gates. This does not close Phase2 or earlier Communications conditions.
