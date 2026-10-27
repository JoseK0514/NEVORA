# Employee Profile — theme remediation visual delta

**Recommendation: APPROVE for the visual delta on `2e4104ce89f1abbb2d3bafd5b87341eba9753c47`.** Profile UI findings 001/002/003 remain closed. This is not closure of QA001 or overall batch approval: QA owns the independently reproduced functional System-theme finding and the fresh combined run.

Reviewer: `/root/profile_local_ui_review`. Previous reports and ledgers remain immutable.

## Findings by severity

- CRITICAL: none identified in this visual delta.
- HIGH: none identified in this visual delta.
- MEDIUM: none identified in this visual delta.
- LOW: none newly identified. Prior canvas fix remains visually intact in the sampled current WebKit held-signout screenshot.

## Verified evidence

I personally viewed all three new `chromium/webkit/firefox-profile-system-light.png` images. Each shows the native Appearance select set to System while the page renders the established light palette: pale canvas, white surfaces, dark text and restrained teal actions/focus rings. No mixed dark cards, new palette, displaced arrow or new component hierarchy appeared in these captures. This verifies the captured appearance, not every timing condition of the functional theme owner.

The current Firefox 320px/200% Profile viewport retains readable wrapped deletion text and clearance before the enlarged navigation. The current WebKit held-native-signout screen retains aligned status/button inset and uninterrupted semantic dark canvas to navigation. Exact five-image paths and SHA256 values are in `PERSONALLY_INSPECTED_PIXELS_THEME_DELTA.json`.

I inspected the entire three-file delta from `4bf72579` to `2e4104ce`. Profile component and CSS are unchanged. `src/lib/theme.ts:16–21` applies the existing theme owner immediately and schedules one animation-frame application that reads the then-current choice. Its added VM regressions cover coalesced media state and latest explicit/storage preference precedence. The Profile integration change at `src/test/integration/employee-mobile-profile.integration.ts:91` adds the System-light screenshot after the existing actual light assertion; it does not remove or weaken that assertion. No rasterized UI, new palette, replacement control, or one-off visual styling was introduced.

HEAD and manifest resolve to the candidate above; git status was clean. Current hashes for theme.ts, Profile component/CSS and the Profile integration test match `local-theme-green/owned-next-k25skj/source-manifest.json`. Ownership records report closed=true, sourceVerified=true and mirrorVerified=true. Existing results contain 42 checkpoints, 111 listed captures, 54 contrast samples (minimum 5.028921154815613) and ten diagnostics with no unexpected non-warning entry. These are inspected execution records, not tests run by this reviewer.

## Remaining boundaries

QA001 remains subject to its author’s independent functional closure and the new combined runtime result. I did not independently run the reported native 50-cycle reproduction or VM tests, operate a browser, or certify native-event timing from still images. Previous reports’ physical-device/assistive-technology, hosted/release, no-JavaScript usability, other-reviewer conditions and later capability-batch limits remain in force. No new visual blocker is identified; do not translate this visual approval into a claim that the whole batch is complete.
