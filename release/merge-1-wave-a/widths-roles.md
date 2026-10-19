# Combined inspection — widths, roles and consistency

Candidate `0e010464aeb5f532981ac6071c48e1527e9419db`. Coordinator `e7671e65b5a54e171422b6dbca887c416a5b0e0c`, Wave A `c05e0c7cd703fbf19e05e60bb4d488e1d9b19bb0`; backend not merged. Evidence: [probe.json](probe.json), [forms.json](forms.json), cited images in `crops/`. Fictional data only; both form POSTs were intercepted and aborted.

## Verdict

Blocked/incomplete. The healthy phone samples and selected 200% rechecks show no page overflow; this does not establish a zero across the required matrix. RC-WA-IS-01 blocks continued valid role/page measurements.

## Earlier findings

WR-WA-1 through WR-WA-3 need the full width/text/browser rechecks. Only bounded layout samples were measured here.

## Findings

No additional widths/roles defect filed. The compiler P0 is counted in interaction-states.

## Checked and correct

- All four roles reach their own Home and Inbox/Requests hub before the compiler failure, in both engines. All eight More sheets have working keyboard opening and focus return.
- Manager Add shift and Add employee document widths equal 320, 844 and 1440 in the sampled 200% text cases. Add shift main/summary remain visible in one column; Add employee’s narrow reading column is intentional per its prior report.
- At 390, healthy Swap, Unable to work, Add shift and Add employee use the same card radius (20px), phone edge (16px), card gap (16px) and main button height (52px).

## Gaps

The candidate fails TypeScript and the Availability route cannot compile. After that compilation, the development server serves the same compiler error on subsequent routes; those repeated failures and error-overlay axe results are consequences of RC-WA-IS-01, not additional page defects. The 60-screen probe has 28 successful HTTP 200 measurements and 32 HTTP 500 responses.

This is a partial combined inspection, not Wave A’s completed exit round. The complete eight-width × four-text-size × two-browser matrix, all alternate/error/empty/large-data states, live coverage/replacement and successful copy-receipt fixtures, detailed contrast and all layout-shift/focus scenarios remain unverified. The unchanged automated checker is run at 390/100% with axe on both engines; broader matrix and 1440 axe remain blocked. Real device/screen-reader and simulator keyboard checks are separate pending gates. No zero verdict is inferred from an unmeasured area.

## Preview integrity note

The strict runtime close guard reported a changed `next-env.d.ts`. Independent post-run hashing of all 1,507 captured files found unchanged source bytes and only the exact `.next/types` → `.next/dev/types` imports in the mirror, beyond the approved DB adapter. This matches the helper’s development-type derivation, but its strict guard did not pass because the starter used `pinDevTypeReferences: false`. Both owned PostgreSQL clusters stopped. See [preview-integrity.json](preview-integrity.json); no full mirror-certification claim is made.
