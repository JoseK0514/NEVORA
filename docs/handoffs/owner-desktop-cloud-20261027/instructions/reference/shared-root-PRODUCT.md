# Nevora owner mobile concept
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Small-business owners using their phones, including people with limited confidence using technology. Employee and Manager experiences are outside this concept.

## Product Purpose
Nevora supports workforce scheduling, attendance, requests, team management, and capability-dependent payroll/time-export workflows. The requested outcome is a clean, modern, premium owner experience that reduces cognitive load.

## Capabilities and Constraints
This is an isolated throwaway mockup, not application implementation. Current repository evidence is cached origin/development 46e20278 (2026-10-25), inspected without changes. Current Home supports staffing summary, missing clock-ins, open shifts, requests and conditional setup. Navigation is Home, Schedule, Inbox, Team and More. Time exports must not be presented as paying employees. All visible people, shifts and totals in this mockup are illustrative.

## Brand Commitments
Retain NEVORA identity and existing teal. User explicitly requested a combination of Gusto and Homebase patterns, with aligned spacing, consistent buttons, clear flow and low cognitive load. Exact hierarchy and palette details remain a proposal for review.

## Product Principles
- Make the next useful action obvious.
- Use plain language and progressive disclosure.
- Show only the information needed for the current task.
- Preserve real role, scope and data semantics.

## Accessibility & Inclusion
Readable mobile text, touch targets at least 44px, visible keyboard focus, text labels alongside icons and status colors, reduced-motion support. No formal accessibility certification is implied.

## October 26 refinement
Jose liked the initial direction and requested more polished, deliberate components plus clear mobile access to the desktop owner features, referencing ADP/Homebase and 21st UI build. The proposal now includes five root destinations and a42-entry feature index. Detailed workflows remain previews; no global system or production implementation is approved.

## Approved refinement
Jose approved both UI and UX improvements. The mockup now retains date/location intent and navigation continuity; shares consistent controls, spacing and status roles; groups Company settings separately; and adapts navigation for enlarged labels. This approval covers the local mobile prototype and does not authorize production integration or deployment.

## Owner feature inventory before further design
Jose approved completing a workflow checklist against the actual application before integration. On October 26, development was refreshed and remained at `46e202786863279302026ee03a0e225c359fa55c`. `outputs/owner-mobile-checklist.md` records 96 Owner workflow groups, four role exclusions, all 50 tracked app page files, the 42 prototype index entries, and 12 shared state requirements. No Owner workflow has been certified as fully redesigned or integrated by this inventory. The mockup's Owner My time link and Clocker recovery purpose need correction in the next design pass. The application and mockup were unchanged by this read-only inventory.

## Approved foundation and Schedule design phase

Jose authorized proceeding with the agreed sequence while retaining the original UI/UX foundation. The current deliverable is the foundation corrections plus the connected Owner Schedule mockup: browse/edit/cover/build/publish, templates, rules and activity. This is an extension of the approved visual direction using consistent shared controls. The detailed stage contract is `work/schedule-mobile/brief.md`. It does not replace all96 Owner workflows or integrate unreviewed designs into the application. All mutations affect fictional in-memory data only.

The stage is reviewable in `outputs/nevora-owner-mobile.html`; verification and remaining coverage are recorded in `outputs/schedule-review-results.md` and `outputs/schedule-coverage-progress.md`. The earlier feature inventory and V3 verification remain historical evidence. No real application changes or deployment accompanied this stage.

## Schedule control refinement

The four annotated mobile comments are addressed in the current week-strip Schedule: centered date navigation, a labeled compact Add shift action, and neutral section-count badges. Large text lets date navigation and Tools reflow. This preserves the approved visual direction and fictional workflows. The later, scoped verification record is `outputs/mobile-controls-polish.md`; the broader Schedule report retains its earlier artifact hash.

## Home detail refinement

The next four mobile annotations refine Home’s staffing proportions, coverage icon, contextual heading totals and upcoming-arrival layout. Existing totals, routes and fictional arrival times remain; no feature or action was removed. The later scoped record is `outputs/home-polish.md`. Prior reports retain their own hashes and validation scope.

## Team header action refinement

Team’s Add employee control now uses the shared labeled compact primary variant established by Add shift. Its existing preview destination and directory behavior remain. The scoped verification record is `outputs/team-action-polish.md`; this does not implement employee creation in the real application.

## Shift form detail refinement

The annotated location/person arrows now share an inset chevron treatment with other form selects and Team filters, preserving native menus. The published-change notice is visually separated from Notes with a calmer surface and explicit heading; its existing notification disclosure and required consent remain. The scoped record is `outputs/shift-form-polish.md`.

Schedule notices now use a shared neutral treatment with consistent icon/text alignment. Published-week guidance separates the existing status sentence from its next step; publication, coverage and published-edit cautions retain their full consequences and approval requirements. The scoped record is `outputs/schedule-notice-polish.md`; this remains a fictional mobile prototype.

## Coverage-rules detail refinement

Recurring coverage periods now have clear section spacing and consistent full-width Add/Save actions with subordinate per-period Remove actions. Native checkbox inputs used across Schedule have a refined visual treatment. The current lead selector and per-day position quantities remain, with their existing validation and draft/save behavior. The scoped record is `outputs/coverage-rules-polish.md`.

## Selected-day people disclosure refinement

Time off & unscheduled people now uses an aligned, wrapping person/status list and the shared Phosphor chevron while retaining native disclosure behavior. Existing names, date/location filtering, status classification and View team availability remain. A selected-date caption clarifies the context. The scoped record is `outputs/schedule-people-polish.md`.

## Owner mobile Team: profiles and Add/Edit

Jose approved Team next, starting with employee profiles and Add/Edit employee while preserving the original mobile Owner foundation. The prototype now connects the directory to full-page profiles, reviewed creation, core details/status/role editing, and a separately saved scheduling editor. Required names, immutable employee ID, US phone, primary location, optional unique email and optional qualifications follow the inspected source. Manager creation/promotion/reactivation requires an explicit operational scope choice; creating a record does not send an invitation.

One revisioned fictional Team store synchronizes names, activity, eligibility and qualifications with Schedule without replacing historical shifts. Person-based navigation and time-off fixtures use stable IDs. Core and scheduling save boundaries, conflict draft retention, unknown-outcome reconciliation and filtered-list return behavior are represented. Invitations, dedicated Manager access administration, Clocker PIN/recovery and real application integration remain later work. The scoped current record is `outputs/owner-team-review.md`; this stage does not certify full Owner feature parity.


## Owner mobile Team: employee invitations

Jose approved invitations as the next mobile Owner slice after profiles and Add/Edit. One Account invitation row under Account access opens a focused status page, then explicit issue/replacement or revoke review and a precise result. A missing registered email returns through the existing employee editor without auto-sending. The profile no longer duplicates account state in Work.

The metadata-only sample follows the inspected source eligibility order, registered masked recipient, employee/invitation revisions, fifteen-minute single-use expiry, fixed-window issue limits and original-operation reconciliation. Replacements retire the previous invitation even if delivery fails. Saved actions, delivery acceptance and activated credentials are separate facts. Non-denied status-read failure keeps the saved receipt while marking current validity/account status unconfirmed; access denial clears private transient invitation state.

This completes the invitation interaction mockup only. Actual delivery, server authorization, recipient activation and integration into Nevora remain unimplemented here. Dedicated Manager access administration, Clocker PIN/recovery and the other Owner previews remain separate work. Evidence: `outputs/owner-invitations-review.md`; current canonical artifact hash `f5f988d8166320f9d549c28b3f6e99f6d19f774181541e9580bc31e3b1e7f7c0`. Earlier stage reports remain frozen.


## Owner mobile Team: Manager access

Jose approved Manager access as the next Owner-only mobile mockup slice. A single Manager access row on Manager profiles opens current scope, explicit company-wide/selected-location choices, current-versus-proposed review, and a saved historical result. Revocation has a separate review and keeps the Manager role, employee record and separate payroll permissions. Access history is disclosed on demand. Non-Manager or inactive targets use the existing employee-details editor so promotion/reactivation and explicit access save together.

This is the existing Owner design world with source-backed operation boundaries, not a new permission matrix or Manager-facing application. Scope revision, employee version and role lifecycle generation remain separate. Unknown outcomes replay the same original command, which may commit an attempt that did not reach the service; no replacement command is generated. Current status refreshes after lifecycle edits while dirty editor/review baselines stay pinned. A saved receipt is historical and survives non-denied current-read failure; denial clears private UI state.

A regression found that Reset sample could read its initial values from the synchronized current directory. The immutable baseline now restores original roles and scope history after completed core changes. Scope and evidence: `outputs/owner-manager-access-review.md`; current artifact SHA256 `ad6fa49fd55dc123cae7122b8fe651ab2325e71c860cd39da36b72b748fa7e79`. Earlier stage reports remain frozen to their hashes. Actual permission enforcement, sessions, server integration and production remain outside this mockup.


## Owner mobile Team: Clocker PIN management

Jose approved the next Owner-only mobile mockup slice while preserving the established standard and consistency. Clocker PIN now has setup status, pre-entry consequence review, two matching masked four-digit fields, and precise results/recovery. Profile and More tools enter the same stable-person flow; More offers a searchable active-employee picker. The sample supports manual Set/Reset only and does not invent reveal, generate, send, revoke, unlock or PIN-history actions.

This source contract has no operation UUID or replayable receipt. Unknown/stale/unavailable results clear inputs and require refreshed settings before another attempt; current setup status cannot confirm the digits in an uncertain save. Reset ends Clocker tablet identification while preserving regular Nevora sign-in, employee data, independent access and invitations. Verification cooldowns are separate. Owner self is eligible; inactive people cannot set/use a PIN.

Source, final checks and remaining boundaries: `outputs/owner-clocker-pin-review.md`; current HTML SHA256 `3bc2e7b29d0eaba60fdbefc028b09d8faef225125cf3a20d6ab6571cc122093c`. Earlier reports remain frozen. No actual PIN, account, tablet, portal session, password, API or database change occurred. Account recovery remains the next separate Team access slice.


## Owner mobile Team: account recovery

Jose authorized the next Owner mobile mockup slice with the established standard and consistency. Account recovery now connects employee profile and More/Team tools through identity verification, a focused review and a private one-time-code handoff. People without existing credentials return to invitations. Owner self is excluded; other active credentialed roles, including other Owners, follow the same flow. Full preset attestations are visible before confirmation and on review.

The code is an unmistakably invalid display sample. Fifteen-minute expiry starts at each issue; replacement retires earlier unused proofs. Clearing the display does not revoke an existing proof. Verification/code state clears on leaving or switching away, expiry or eligibility loss, and generation guards suppress interrupted async disclosure. Ambiguous outcomes never claim rollback or offer original-operation replay/status retrieval. Password reset and its session/passkey/calendar/push effects remain the employee’s separate step, explained without being executed or reported complete.

The bounded initial UI/UX findings and final confirmation are recorded in `outputs/owner-account-recovery-review.md`, with checks in `outputs/owner-account-recovery-checks.json`. Current HTML SHA256 `579ef0c8905f442627e07c62142036cc9cc211a4ba9aa63425d0d8fa9b2bf225`. Earlier reports remain tied to their original hashes. This is still an isolated Owner-mobile concept with fictional data; no actual app, auth, API, database, message or production change occurred. A Team coverage review is a subsequent task, not a claim of complete Owner feature parity.


## Owner mobile Team coverage audit

Jose approved auditing Team and closing gaps before moving to Timecards, maintaining the established standard. The source-backed T-01…T-08 matrix now separates current interaction coverage, deliberate contact-preview behavior, real-integration limits and adjacent future tools. Current directory includes the Owner, accent-insensitive search and duplicate-name IDs. Connected fixes preserve exact person-hours context, distinguish qualifications acknowledgement from core operation receipts, retain inactive catalog references, clear confirmed stale drafts, and prevent pending core saves from replacing newly requested Team tasks.

The missing per-employee Owner operational review is now a focused five-rule flow with explicit applicability, whole-minute values/time basis/window/payment/routing, atomic independent revision, review/save, no-settings/unavailable and ambiguity recovery. It creates no default weekly maximum and does not certify legal applicability, worked time, actual policy enforcement or production behavior. Full source contract and bounded outcome: `outputs/owner-team-audit.md`; current artifact SHA256 `2198487ad3e70265199123bdfd032386c2c2aa72307bf32a3738da61537c0dee`. No actual app or production changes. Timecards remains the proposed next slice, not work started by this audit.

## Owner mobile Timecards P-01 continuation

The isolated mockup now supports company-wide recorded-time overview and employee detail with periods, status filters, local name/ID search, entries, breaks, correction status/proposed time and immutable captured history. All employees including self/inactive remain in complete cards; location names belong to entries, and the global location selector is static here. Recorded time includes breaks; this is not payroll calculation. The read-only prototype introduces no operational decisions. Correction review, approval, finalization/reopening, batching and export are subsequent slices. Current handoff: outputs/owner-timecards-review.md; authoritative code inspection: work/owner-timecards/source-contract.md.
