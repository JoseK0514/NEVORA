# ST-P4-13 proposed repair on exact Desktop input

Bounded implementation proof passes; this is not independent certification or a full Desktop exit. Original `8012d9790e72987140f939c7d70e1df9612ea009` remains nonzero. Source worktree untouched; only owned external preview mirror changed temporarily and then restored before clean closure.

Final patch: [exact-initial-open.patch](exact-initial-open.patch). Root reviewed and approved its shape conditional on proof. A newly mounted selected native details group receives its initial open attribute before first paint; the value stays constant for that mount so native toggles retain ownership on refresh. Key changes still use a layout effect to reveal a newly selected group without closing other groups. No data/auth/privacy/focus/scroll semantics changed.

The first useLayoutEffect-only attempt failed: `portal-motion.css:80` animates details::details-content for200ms, so even with open=true before paint the content grew after paint. Full failed proof is preserved in [results.json](results.json), [summary.json](summary.json) and [exact.patch](exact.patch); do not use that patch.

Final revision [summary](revision2/summary.json) and [raw results](revision2/results.json): all8 opening cases and all4 guard cases pass, both Chromium/WebKit at1440 and1024, text100/200. Natural100 Chromium CLS1440:0.064180→0.000112;1024:0.128466→0.000217. Natural client-filter navigation after text200 has CLS0.005252/0.005341. WebKit layout-shift observer unsupported: CLS is null; first painted ready group geometry is stable/open in all4 cases. Screenshots in revision2/shots/.

Each browser has guard passes for refresh read deduplication, unchanged focus/scroll, selected manually closed group staying closed, other manually opened group staying open, pane heading focus and Escape return, offline private-row clearing and held scroll, and session-ended private-row clearing/status focus/held scroll. No Inbox mutation was sent; mutation guard allowed only same-origin safe requests and the exact action-center weekStart read payload. No errors or blocked mutation attempts.

Owned preview closed after restoring original mirror content; see closure-audit.json and revision2/mirror-restoration.json. Exact review-branch SHA must receive its own gates/full exit before merge. No full preview restart until root releases canonical gate window.

TC-P4-22 ID collision: header shortcut finding copied from inspections fe2adb1 to header-kbd-report-fe2adb1.md is tracked as TC-DESKTOP-KBD-01 (alias TC-P4-22 header), distinct from existing Availability TC-P4-22. Its source locator in that report is inaccurate: measured font comes from portal-gusto.css376, not portal-desktop.css116. Preserve original report verbatim and correct attribution in the review ledger.

Source report77ad3b3 subsequently renamed the header shortcut to TC-P4-24. Stable fix commit TC-DESKTOP-KBD-01 and exact reviewSHA remain unchanged. [Renamed source report](header-kbd-report-77ad3b3.md); original colliding snapshot above remains verbatim.

Additional raw-snapshot check: reconnect scroll stays800px in all4 final guard cases ([derived proof](revision2/reconnect-scroll-proof.json)). Original and layout-effect-only1440/100 baselines clamped800→181px on reconnect; initial-open patch removes that transient collapse as well. No new browser run or scope change was needed to check the captured numbers.
