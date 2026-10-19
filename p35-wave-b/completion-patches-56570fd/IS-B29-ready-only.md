# IS-B29 ready-only completion — static proposal

Applies only to ready368e98a. Actual candidate56570fd does not contain this Wave B implementation; do not apply this patch there. Source `inspection/interaction-states.md:210` measures expiry-induced body focus and closed Report definitions when network reads outlast snapshot validity. Earlier source timing/scroll fixes stay intact.

The patch captures only static DOM preferences immediately before mandatory expiry: open booleans keyed by two static disclosure IDs, a whitelisted static focus locator, workspace identity and a moved-on bit. It never saves private report contents, amounts, labels, or stale DOM nodes. Expiry still clears the report, aborts pending work and enforces original validity limits.

After a successfully projected fresh authorized response for the same applied period and workspace, restore only after that snapshot's new DOM is mounted. Require active foreground view, still-valid fresh snapshot, unchanged generation, body focus and no user focus/pointer/keyboard/wheel/touch action during the gap. A401/403, offline/paused/unavailable transition, account storage change, period change, workspace mismatch, stale response or cleanup discards preferences. Missing new disclosures/targets are ignored. Existing scroll restoration remains unchanged; focus uses preventScroll.

No app edits, tests or runtime. Required next proofs: held reads crossing expiry in both engines; old private DOM absent at expiry; same-workspace fresh response restores definitions open+summary focus and scroll; moved-on input stays focused;401/403/workspace/period/account/hidden cases never restore private state/preferences. This is implementation preparation and not independent closure or zero certification.

## Revision2 after independent Desktop review

Original proposal and full after-file archived under `archived/IS-B29-v1-before-desktop-review/` with hashes; do not apply it. Independent review: `/workspace/nevora-inspections/p4-desktop/ready-desktop/crosswalk-aa5e07e/IS-B29-independent-review.md`.

The revised settle order retains the held minimum height and Y while restoring the new snapshot's disclosures. A narrow `data-restoring-preferences` marker disables only details-content transitions during this synchronous fresh preference initialization, with higher specificity than portal-motion.css's200ms rule. A layout read commits the final open geometry before releasePlace removes held height and restores Y. Finally removes the marker before paint; ordinary user disclosure animation is unchanged. Reduced motion follows the same final-geometry order. No timer wait can apply stale restoration. Existing active/generation/validity/workspace/period/foreground/moved-on guards remain.

Required positive proof adds bottom-of-open Report definitions (savedY beyond the closed document's maxY), ordinary and reduced motion, both engines. A legitimately shorter fresh authorized report may clamp to its true final maximum; it must not clamp to an intermediate closed-disclosure height. Existing source scroll restoration is unconditional even if the user moved on during the gap; the added disclosure/focus restoration remains suppressed after movement. That pre-existing scroll behavior must be observed, not silently counted as new closure.
