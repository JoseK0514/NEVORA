# Employee mobile: Home time, Requests and Availability

Implemented and independently approved for the bounded local prototype. HTML SHA-256: `aa48c2c4d40c1a45d6a8fdb8ed79d7d46c15ae78508002f0cf2be5d27b5fd59b`. The current source rebuild, saved artifact and served page agree byte for byte.

## What changed

- Home puts today's recorded clock state directly beneath the shift, with clock-in time/location and a clear route to Hours. Clocked in, on break, off clock, overnight, empty and unavailable states remain distinct. Phone punching stays on the location Clocker.
- Requests provides full/partial-day leave, waiting/decided history, own Pending cancellation, swap/cover/callout creation, incoming responses, coverage requests, own withdrawal/cancellation and activity history. Requesting/answering does not approve a schedule change. The fixture uses a stated manager-review policy.
- Coverage eligibility rechecks canonical published overlap, saved usual/weekly availability and approved full/partial leave at list/detail/submission. A saved Thursday-unavailable preference removes the October 29 action.
- Availability now edits usual hours and dated weekly overrides, with review/edit/save receipts, midnight handling, explicit whole-week unavailability, submission/deadline states and a guard when switching views with unsaved changes. Closing a sheet cancels uncommitted drafts.
- Existing Owner-derived teal colors, system type, official wordmark, Phosphor icons and48/44 px controls remain. Shift/availability view selection now uses one shared ViewSwitcher.

## Verification actually performed

| Check | Result |
| --- | --- |
| Strict TypeScript / React build | PASS; no application/database build or migrations |
| In-memory source rebuild | PASS `node build.mjs --check`; saved/served bytes match |
| Existing scenarios |38/38 in Chromium, WebKit and Firefox |
| Home recorded time |14/14 in each engine |
| Today/account refinements |9/9 and10/10 in each engine |
| Requests |17/17 in each engine, including saved availability removing coverage eligibility |
| Availability |15/15 in each engine; midnight, closed submitted/not-submitted, whole-week unavailable and keyboard/focus |
| Browser total |103 passing cases per engine; no reported failures/runtime errors |
| Domain invariants |12 exchange +7 coverage checks recorded;7 coverage invariants independently rerun by root |
| Layout / focus |320/390/430/660px roots,884px targeted review, controlled200% text, native sheet containment/Escape/return, no recorded horizontal overflow |
| Fresh independent review | APPROVE this exact artifact; no remaining blocking finding |
|21st current-source review |27 files,23 informational canonical-token color advisories,0 fixed |
| Artifact checks |5 frozen reference hashes,12 raster origin/image hashes,27 source modules below250 nonblank lines, defined CSS variables |

Counts describe scenarios, not a feature-completion percentage. The independent reviewer inspected all18 suite reports and ran additional browser captures; it did not independently rerun every supplied scenario. Browser WebKit and controlled enlarged text are not native device, OS picker/keyboard or screen-reader certification. Standalone lint/security suites are not configured.

## Findings resolved before approval

The review caught an initially offered coverage shift overlapping Alex's own published shift. The source now has one canonical published-shift fixture and computes overlap; the corrected October 29 offer avoids that conflict in the sample. A second consistency check now applies newly saved availability and approved leave to coverage actions. The selected-state visual inconsistency was removed through the shared ViewSwitcher.

Two harness issues were corrected without reducing product assertions: the keyboard test explicitly focuses the opener before Enter/Escape because WebKit pointer clicks do not promise button focus, and parallel Availability runners now use engine-specific compiled model/HTML paths. The latter avoided a shared-file race. The same strict scenarios passed afterward on the final hash.

## Remaining scope and handoff

All data and writes remain fictional and in memory. Refresh resets sample changes; closing sheets discards unsaved drafts. This does not certify production permissions, live eligibility/policy/revisions, durable writes or full desktop parity.

The [34-workflow coverage ledger](desktop-parity-audit.md) now records local Requests/Availability coverage. Next are Hours/timecards/broader correction history, then permitted communications, complete account tools and capability-driven Pay, followed by real integration and recovery verification. Previous first-slice gate reports apply to their historical hashes.

Implementation stays in `work/employee-mobile/` and `outputs/employee-mobile/`, with task evidence under the recorded evidence folders. The source application at development 46e2027 was read-only and its checkout remains clean/detached. This projectless prototype has no Git branch, commit, PR or deployment. No real messages, account changes, paid generation or analytics were used.

[Prototype](index.html) · [Overview](overview.png) · [Requests](requests.png) · [Availability](availability.png) · [Independent review](next-pass-ui-review.md) · [Detailed checks](checks.json)
