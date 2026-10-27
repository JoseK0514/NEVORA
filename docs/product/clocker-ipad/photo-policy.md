# Owner-controlled Clocker photos

Date: October 27, 2026. **Requirement confirmed:** each customer company's Owner decides whether Clocker uses employee photos and which clock actions use them. These are product requirements and integration tasks; photo capture is not implemented or activated in the current prototype.

## Owner settings

Place **Punch photos** within Owner → Clocker settings. Keep the reviewed teal/system-type/regular-Phosphor components, aligned controls and clear spacing. The employee screen shows only what the saved policy requires for the current action.

| Setting | Owner's choices | Behavior |
|---|---|---|
| Punch photos | Off / On | Off means no camera request, capture or upload. New companies start Off. Saved preferences alone do not prove the camera/storage service is ready. |
| Capture at | Clock in, Clock out, Start break, End break; independently selectable | Clock-in only, clock-in/out, all four, or another supported combination. On requires at least one selected action. Unselected actions follow the normal clock flow. |
| Keep photos for | Owner-selected whole number of days within the supported range | Earlier branch supports 1–30 days, initially 30 while Off. Preserve this existing technical range for the first integration; it is not a legal retention recommendation or a duration selected by Jose. Display the actual expiry and cleanup/backup disclosures. |
| Employee assistance | Contact and instructions | Company-specific help shown with the employee notice. Cleanup/backup claims come from verified platform behavior, not an editable claim the Owner can invent. |
| Review photos | Private Owner view linked to the original clock action | Show recorded, missing, pending or expired photo status accurately. No public image links or default Manager access. |

Settings apply to the authenticated company and its registered iPads. Derive company/workspace authority on the server; a submitted company ID cannot select another company's policy. Per-location/per-employee overrides are not established by the inspected source and are not silently added here. Owner-only administration does not prevent employees from using their own PIN to clock.

**Recommended first-use presentation:** Off by default; show the available action choices and an editable retention period before the Owner saves On. The earlier branch initially selects all four actions while Off. Make this visible and show the exact selection in the save summary; do not silently activate all events. Existing saved selections stay intact. Each Owner can change their company's settings later with current-version validation and truthful save/readback feedback.

## Employee experience

When the Owner's policy applies: **Enter PIN → choose clock action → read the brief photo notice → open front camera → take photo → confirm clock/photo status → return to PIN.** Stop the camera after capture, cancellation, privacy expiry, backgrounding or a change of employee. Do not request microphone access, record continuous video, add facial recognition or store the live preview in the recovery journal.

When photos are Off or the current action is unselected, follow the existing clock flow without opening the camera. Camera permission remains a Safari/device permission; Owner settings cannot grant or bypass it. All employee labels, permission/error guidance, alternatives and receipts are available in English and Spanish.

Time and photo evidence have distinct outcomes. A photo upload failure must never erase a recorded punch or cause a second punch to be sent. Retain the original clock command ID. Show “Time recorded; photo needs attention” when that is the actual result. Retry only the photo when time is already recorded. Do not present a single generic success while photo status is unknown.

The earlier implementation supports `ALLOW_WITH_EXCEPTION`: a declined, unavailable or missing photo records a separate photo exception and offers assistance/Continue without photo. Keep this existing behavior as the first integration's engineering baseline; **a strict mode that blocks timekeeping is not implemented and must not be advertised as an Owner option**. Jose's customization request establishes control over photo enablement/events, not an instruction to invent a new attendance enforcement rule.

## Policy changes and data lifecycle

- Use `expectedVersion` for Owner edits; stale or lost responses require reading saved policy before another save. Do not overwrite newer choices.
- Refresh effective policy and notice before collection and validate their versions again before upload. A change to Off, a different event selection, or an outdated notice must not let a stale screen continue collecting under old preferences. Clear the preview and refresh the action without duplicating time.
- Bind each image to the actual server-recorded command, employee/device generation, company and policy/notice versions. Never accept browser-supplied employee/company identity as authority.
- Preserve the earlier retention invariant: shortening retention can shorten existing expiry; increasing it never extends a photo's original expiry or restores an expired/removed photo. Explain this effect before saving a shorter period. Off stops new collection; it is not a claim that existing photos or backups were immediately erased.
- Owner review/removal, retention cleanup, restore/backup behavior and audit access need actual service evidence. Expired/removed images must not be returned by normal review, cached publicly or resurrected by a late upload/retry. Recorded time remains intact.

## Reuse and integration status

Existing reference: `codex/clocker-photo-monitoring-20261010` at `ecd06408dbc36cace68eebb68c5fcff07c66ecfe`. Relevant files are pinned in `work/clocker/integration-20261027/photo-reference/` with a separate manifest. This branch is **reference-only**, not part of the inspected `origin/development` snapshot.

Observed reusable pieces: `PhotoPolicy`/`PhotoPolicyUpdate`, strict per-event and retention validation, Owner settings/readback, temporary front-camera controller, photo/punch status separation, private review, current notice/profile checks, and expiry protections. The observed runtime returns `null`; its authority binder explicitly requires adaptation to current company proofs. The JPEG decoder imports `sharp`; declare/verify the compatible dependency and deployment support rather than assuming a transitive installation or copying an old package claim. Reconcile the source before selectively adopting it; do not merge the old branch wholesale.

Activation requires a real current-proof runtime, adopted private schema/storage, verified image validation/cleanup/backup disclosures, saved Owner policy, current employee notice and physical-iPad tests. Until those are present, show **Photo capture unavailable** separately from the Owner's saved On/Off preference. Saving a preference is not activation or production authorization.

## Acceptance and handoff

Integration task T8 in [integration-plan.md](integration-plan.md) owns the policy, camera/receipt and private review integration; T9 verifies it. [iPad acceptance](ipad-acceptance.md) adds IP23–IP28 for Owner customization, camera permissions, policy changes, partial failure, privacy and retention. No real employee photos, camera permissions, hosted storage, new subscription, database migration or production configuration were used for this requirement update.
