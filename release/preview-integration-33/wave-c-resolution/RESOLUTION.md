# Wave C conflicts: Claude integration plus candidate 33

Prepared externally from exact Claude integration `4aaa79383f82a3c6023f9d2a2c2f492ba3152fce` and exact candidate 33 `b68f250129e2d21731624652e0aad7412b042bc3`. Old ready target `de8b158` is a comparison only. No app tree, index or ref was edited. No preview, browser, CI or test was run.

## premium-wave-c.css

Take **all 573 source lines from exact 4aaa793**, then append only the named WR-WC-25 and ST-13 override blocks from exact b68f250, in their original order. The [resolved file](premium-wave-c.resolved.css) is 584 lines. Its first source segment and final candidate override segment are byte-identical to their respective immutable commits. [manifest.json](manifest.json) records all hashes.

Root can copy the resolved file into its isolated merge, or first select the exact 4aaa file and apply [this append-only patch](preserve-4aaa-append-candidate-33.patch). The patch is against the exact source file, not the unresolved conflict-marker file. Do not replace the full stylesheet with old ready de8: that would remove Claude's later additions.

Preserved additions since old Wave C 5f/ready:

| Claude change | Exact source behavior preserved |
|---|---|
| AL-17 | Button links zero only inline padding, keeping vertical link padding. |
| AL-13 | Wrapped-label SVG baseline uses `-0.2em`; explicit `wc-icon-before`/`wc-icon-after` classes apply the 8px gap. Keep matching class additions in incoming components. |
| WR-25 | When decorative Hub tiles hide, row dividers start at the text inset. |
| ST-18 | `.wc-wide-state` hides below 360px so the short Unsaved state stays in one row. |
| Source ST-13 | Phone action-bar notice bodies clamp to two lines and notice padding reduces to 10px. |
| AL-18 | Hub card head children have `max-width:100%`. |

The appended candidate WR-WC-25 rules retain `flex:0 0 auto` for phone dialog buttons **and** `align-self:center` for their swapped-label spans. The appended candidate ST-13 rule bounds the outer feedback container to `min(28dvh,12rem)` with scroll/overscroll containment. No later WR-10, ST-14 or candidate 34–45 code is included.

Both source and candidate ST-13 restrictions survive this requested resolution. The outer scroll cap does not undo the source's inner two-line clamp. Their combined geometry and access to the full outcome text require actual merged UI review; the earlier 5f source injection did not contain Claude's new clamp and cannot certify this combination. No clamp deletion or expansion is proposed as a conflict-resolution choice.

## deleted assisted-recovery.css

Keep `src/app/app/account-recovery/assisted-recovery.css` **deleted**. Exact 4aaa has no import of it anywhere in `src`. The new `src/components/assisted-recovery.tsx` uses `SettingsFrame`, `wc-control`, `wc-check` and other Wave C/kit classes; the old `.assisted-recovery .assisted-field` selector and its candidate TC-RC-ASSISTED-01 border repair no longer match the replacement DOM. Restoring the stylesheet would preserve dead selectors and duplicate old font declarations, not repair the new fields.

Keep the **exact 4aaa assisted component**. Versus de8 its actual addition is `className="wc-icon-after"` on the Issue recovery code arrow, paired with Claude's new CSS; its source trailing newline also differs. `src/components/account-recovery.tsx` (the request/lifecycle owner) is byte-identical between 4aaa and old ready de8. [Component comparison](assisted-source-vs-old-ready.patch) preserves the distinction.

This is the same approved obsolete-stylesheet disposition as the prior isolated ready target, with Claude's icon addition retained. Actual field contrast on `#assisted-employee`, `#assisted-attestation` and the issued-code input must still be measured in idle/hover/focus against the winning shared field rules. TC-WC-28 and retired legacy TC-RC-ASSISTED-01 are not closed merely by removing unused CSS.

WR-10 loading Back and ST-14 policy retry-label proposals remain in the separate historical crosswalk/proposals directory for Claude review. They are intentionally absent from this exact source-plus-33 resolution.
