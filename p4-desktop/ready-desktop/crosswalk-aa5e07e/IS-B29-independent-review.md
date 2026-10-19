# IS-B29 independent static review

Reviewed 2026-10-19 against clean isolated ready-wave-b `368e98a18c16d47df04a93f2bea560843e461e0e`, proposal `/workspace/nevora-inspections/p35-wave-b/completion-patches-56570fd/IS-B29-ready-only.patch` and its explanation. No source edits, tests, preview or browser execution. This is a source review, not closure evidence.

## Change required before applying

**P2: restored open disclosures can still lose the reader's scroll position.** Patch line 79 calls `releasePlace()` before `restorePreferences()`. The fresh `ReportsView` renders both native disclosures closed. `releasePlace()` removes the old minimum height and immediately scrolls to the saved Y against that shorter document. A reader near the bottom of an open Report definitions section can therefore have Y clamped before the saved `open` boolean is restored. Subsequent expansion does not recover the lost scroll. The definitions summary focus uses `preventScroll`, so it cannot repair this.

Keep the held height and saved Y until the restored fresh disclosure geometry is available, then release and restore scroll. `src/app/app/portal-motion.css:80` animates `details::details-content` for 200ms; merely reversing the two existing calls can still restore against an intermediate height with ordinary motion enabled. Recheck both reduced and ordinary motion in Chromium/WebKit, including a bottom-positioned open definitions disclosure and a fresh report that is legitimately shorter.

## Other checks

- Stored state is limited to workspace identity, two static disclosure keys/open booleans, a whitelisted static focus locator and a moved-on boolean. No report snapshot, private label, amount, employee identifier, downloaded data or stale DOM node is saved by this addition.
- The effect lifetime is scoped to the applied period. Existing `active`/generation guards reject old responses, period cleanup clears preference state, and workspace mismatch discards it before restoration. Account isolation relies on existing `AppShell key={session.id}` remount plus the storage-event clear; the proposal does not introduce a separate authority/account cache.
- Auth denial, offline, paused, unavailable, hidden/pagehide and cleanup paths clear the preferences. Active foreground, validity and generation checks gate restoration. Pointer/keyboard/wheel/touch or non-body focus during the gap suppresses disclosure/focus restoration. Existing scroll restoration remains unconditional even after moved-on input; this was already present in the source and should be observed alongside the required scroll proof.
- Listener removal matches additions; existing timers/controllers are retired by `clear`. Frame callbacks are bounded and guarded by active/generation/validity before DOM mutation. They are not explicitly cancelled, but cannot restore preferences after teardown.
- Added selectors match the two actual native disclosures, the current section IDs, jump links and Timecards link. The title ID is on a nonfocusable h2; it normally cannot be the saved active target, so that extra whitelist entry provides no additional supported focus behavior.
- No API method, endpoint, body, response projection, validity limit, authorization check, print/export request or server behavior changes. Mandatory expiry still clears the report and aborts pending operations.

Disposition: fix the scroll ordering/geometry issue, then run the proposal's held-expiry, moved-on, auth/account/workspace/period/hidden guards on the exact final review SHA. Original Wave B remains nonzero until independent exit work completes.

## Revision 2 source review

The revised external proposal adds a narrowly scoped `data-restoring-preferences` marker, restores the fresh disclosures while held height/Y remain, reads fresh geometry with transitions suppressed by a more specific rule, then releases held height and scrolls. A `finally` removes the marker before the frame completes. This addresses the static ordering/ordinary-motion defect; normal user disclosure transitions remain unchanged. The marker contains no private data and is not retained past the synchronous restoration block. All previously reviewed lifecycle guards remain present. Source shape is acceptable for application on the isolated review target, conditional on exact-SHA browser proof; no browser result or zero certification is inferred.
