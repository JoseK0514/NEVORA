# IS-B31: Enter submission keeps its active field

The scheduling forms capture FormData, keep the synchronous busy guard, then lock their fields individually. The Enter-submitting input or textarea remains focused and read-only while the captured command is pending; other controls are disabled. Controls without read-only support hand focus to the form's external submit action. Finally restores each original disabled/read-only value and the original failure focus. Server actions, FormData construction, policy revision handling and request identities are unchanged.

Bounded implementation proof against frozen9bd265e in an owned external mirror:16/16 before cases lose focus to BODY;16/16 after cases pass. Four forms (staffing,coverage period,trade policy,coverage policy),Chromium/WebKit,390/100% and320/200%. Repeated native Enter plus requestSubmit produces1 intercepted POST per case; serverReached0. Active values cannot change while held; failure restores FormData and prior field states. Action bindings remain identical before/after. Source and mirror baseline are verified, mirror restored and runtime/PostgreSQL closed.

Evidence: `/workspace/nevora-inspections/p35-wave-b/is-b31-preview-proof/` contains the exact patch, raw before/after JSON, harness,64 crops, provenance and shutdown manifests. Patch SHA256: `87f9d9a0a9e9151b5ade8bae98ebaa9ea33289a2c17a2019b82a5c58e0268e84`.

This is implementation evidence. Exact final review-SHA gates and independent exit review remain required. Original source9bd265e is not certified zero.
