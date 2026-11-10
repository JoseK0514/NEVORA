# Nov 10 UI review: non-native backend contract

Implementation contract for the approved non-native scope. Exact-source qualification and development-delivery receipts are tracked in [SCRUM-175](https://thevelani-team.atlassian.net/browse/SCRUM-175) and the evidence root below. This is not production authorization or independent phase acceptance.

Base development: c497d8f953c04effe02160d283daaf9327837bba. Review source: b4995323808f4c5ad6d506003c00cf38a12ae55b. Jose selected implementation and BOTH NV261 reminder targets. Codex owns backend; Claude owns UI. Native work remains separate.

## Claude integration contract

| Finding | Source / available behavior |
|---|---|
| NV006, NV007 | Existing base contains shared timecard review classification and additive Owner `payrollStatus`. Forward `payrollStatus` in held Home compositions; personal `readNextPay` semantics stay. |
| NV038 web, NV188, NV156 | Existing base contains generic web notification/can’t-work compatibility copy, recovery route/email wording, and every waiting own time-off request beyond recent history. Native provider payloads remain separate. |
| NV014 | `readShiftChangeAvailability.policy` carries managerReviewRequired (boolean or unknown) and rulePath. Generic policy prose is removed from each row notice; overtime and recorded manual-request facts stay. Render policy once. |
| NV079 | `ActionRequestFacts.counterpartName?` is a current authorized active swap/coverage participant. Missing/stale counterpart is omitted, never invented. Parser bounds names and rejects control characters. |
| NV138 | Manager `hourRows` includes existing authorized employee role. Mark Owners using this field; no roster visibility policy changed. |
| NV109 | Manager coverage obligations carry `upcoming` from the workspace business date. They are obligations, not past activity. |
| NV152 | `readEmployeeWeeklyReview` retains the exact own-publication comparison after confirming, using an immutable private operation baseline. `acknowledgement.acknowledgedAt` is the canonical ISO receipt time. A newer changed revision still needs confirmation. Legacy acknowledgements without captured comparison history return no invented historical diff. Public command results exclude private baseline metadata. |
| NV165 | Requests and Exchange list/detail share `exchangeCounts:{open:number|null,forYou:number|null}`. A failed source is independently null; disabled module is zero. Counts describe authorized listing rows, not guaranteed final eligibility. |
| NV092 | `readOperationalEmployeeHours` returns protected scheduledTodayMinutes/scheduledWeekMinutes/workedWeekMinutes plus date/week/timezone/source coverage. Worked basis is effective elapsed time INCLUDING breaks, not paid time. Unknown/overlapping/missing source stays null. Published schedule and canonical overnight/week boundaries apply. |
| NV252 | Timecards expose `weeklyHoursLimit:null`: no persisted company worked-hours ceiling exists. Personal scheduled maxima and overtime detector thresholds are not that ceiling. Omit an over-limit chip; do not substitute 60. Source hashes and payroll are unchanged. |
| NV158 | Requests expose `deviceAlerts:null` and `deviceAlertsAvailable:boolean`. Runtime capability does not establish this browser’s permission/subscription. Resolve actual status through existing device-alert browser transport before hiding/enabling device prompts. |
| NV091/NV240 | Protected clock monitor rows add `late:boolean|null` using canonical Today timing and an exact employee/location/current-punch match. Unknown is not on-time. |
| NV137 | `readActiveOwnerNames` provides bounded active Owner names with current session/workspace lifetime. No person-to-person message command is implied. |
| NV142 | Employee in-app notification items may contain an authorized date-only `subject`, such as the schedule week/request dates. Generic lockscreen payload privacy stays. |
| NV261 BOTH | See `src/lib/manager-reminders/README.md` for POST and recovery contracts. Availability reminders require the current open deadline/missing submission. Team-update reminders require the current unexpired REQUIRED revision/current recipient/missing receipt. Current Owner/Manager Company access, atomic audit+queue, session-bound operation recovery, daily budget and quiet hours apply. `committed` means queued/already queued, never delivered. Existing development activation hold stays. Management recipients now include canonical employeeId. |
| NV052 retry | PIN 429 returns real database remaining seconds across active device/workspace failure/rate windows, with matching Retry-After. Existing limits and pre-hash budget remain. No new countdown or per-person policy. |
| NV045 | PIN/setup errors include stable codes. `clockerErrorText` accepts code with legacy-message fallback. Claude can consume it in PIN/setup UI. |
| NV047 | Three punch-reference messages use plain language, preserving codes/recovery meaning and paired Spanish translations. |
| NV185 | `references(location,subject)` returns own references plus otherCount; no other subject’s IDs/actions. Legacy no-subject overload preserves Owner recovery. Kiosk selects current verified subject and withholds stale-identity handoff. Claude owns aggregate-count presentation. |
| Kiosk speed | PIN verify already returns verified status, firstName and expiresAt. Consume that response to avoid an unnecessary status round trip. |
| NV262 | Timecard action rows omit an unnecessary trailing period and distinguish same-period locations using already-authorized recorded location names. No hashed timecard source change. |
| NV121 | Ordinary time-off redirects retain reviewed=1 and add decided=timeoff-approved or timeoff-declined. Existing specific toast messages apply. No display names added to URLs. |
| NV068 | Shared prose durationText uses `8 h 30 min` vocabulary, including `<1 min` for sub-minute recorded time. Dense-grid formats and frozen payroll PDF formatting remain separate. Consumer expectations changed only for intended text. |
| NV174 | Real streamed public not-found routes recreate the document client-side. The document helper emits initial scripts on the server and performs bounded before-paint fallback initialization, avoiding inert React script elements and preserving theme/text scale. Actual Chromium/WebKit regression covers direct/client/history transitions, light/dark/system/storage-denied and scaling. Held b499532 deliberately uses light-only theme; the helper preserves each source’s own policy rather than changing it. |
| NV022 | Accessible auth routes get localized route titles even when Mobile Access is off. Hidden help/welcome routes stay hidden. Enabled Mobile Access titles retain their vocabulary. |

## Explicit remaining boundaries

- NV016 is optional shell/bell/sidebar shared client composition; Claude owns it. No count permission or source definition was changed for an optional layout choice.
- NV033 reported scan IDs are synthetic. Both checked branches contain the `scan-leave-maria` string only in review artifacts, not a tracked fixture producer. Database IDs are text, not a proven UUID constraint. Withdrawal retains the current UUID guard until the preview seed is corrected or actual older IDs are established; no live data was inspected or command scope broadened from assumptions.
- NV186 exact Spanish slogan, NV308 new Spanish PDF template and legal recovery link labels are proposed in `docs/handoffs/2026-11-10-backend-review-decisions.md`, pending Jose’s explicit wording decision. Existing approved PDF bytes/versions remain.
- Reports retain DESIGN’s technical “Unable to work” vocabulary. Per-person PIN lockout/countdown and new person messaging are separate product/security decisions.
- Native NV214/NV212/provider NV038, UI redesign/composition, hosted acceptance, worker activation and production deployment are outside this delivery.

## Controls, evidence and next gate

CTO: source-owned additive contracts, existing queue/ledger and canonical projections; no schema/dependency additions. CISO: current role/session/source/recipient checks and least-privilege scopes retained; no actual browser permission inference, private push subjects, real sends or cloud secrets. Governance: development review conditional on exact-candidate qualification; no production authorization or independent finding closure.

Evidence root: `/Users/josek0514/.codex/ui-review-backend-20261110`. Actual owned PostgreSQL: reminders41/41, schedule acknowledgement/current counterpart25/25, kiosk PIN/transport56/56. Actual IndexedDB browser:30 checks across Chromium/WebKit. Focused root109 tests plus each cohort’s focused checks; counts overlap and must not be added as unique tests. Additional actual SQL: shift contracts44/44 and scoped operational reads10/10. Streamed-not-found regression16/16 on development and16/16 on the frozen UI policy. Final default/typecheck/build/review receipts are linked from SCRUM-175; do not infer a hosted or production result from local evidence.

Ownership: Codex owns combined qualification/review/development delivery; Claude consumes the contracts and validates UI. All production and activation gates remain explicit and separate.
