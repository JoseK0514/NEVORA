# Combined inspection — bars and stability

Candidate `0e010464aeb5f532981ac6071c48e1527e9419db`. Coordinator `e7671e65b5a54e171422b6dbca887c416a5b0e0c`, Wave A `c05e0c7cd703fbf19e05e60bb4d488e1d9b19bb0`; backend not merged. Evidence: [probe.json](probe.json), [forms.json](forms.json), cited images in `crops/`. Fictional data only; both form POSTs were intercepted and aborted.

## Verdict

Blocked/incomplete. No new stability finding is established by the bounded form checks; route-load CLS and all held-height transitions are not certified. RC-WA-IS-01 prevents the full sweep.

## Earlier findings

ST-WA-1 through ST-WA-6 require their full route/state rechecks. The callout and swap single-submit portions were sampled below; this does not close the entire earlier set.

## Findings

No additional stability defect filed.

## Checked and correct

- Unable to work: double tap intercepted one POST; before and pending submit rectangles both x=36, y=657, width=318, height=52. Zero measured button movement in that sample. [Pending](crops/callout-pending.png), [failure](crops/callout-failure.png).
- Swap: one intercepted POST; submit width stayed 358 and height stayed 52. The before measurement was offscreen and Playwright scrolled before the double tap, so its changed viewport y is not a CLS measurement. [Pending](crops/swap-pending.png), [failure](crops/swap-failure.png).
- Both show “Sending…” and then focus their uncertain-outcome notice after the request is aborted. No success is claimed.

## Gaps

The candidate fails TypeScript and the Availability route cannot compile. After that compilation, the development server serves the same compiler error on subsequent routes; those repeated failures and error-overlay axe results are consequences of RC-WA-IS-01, not additional page defects. The 60-screen probe has 28 successful HTTP 200 measurements and 32 HTTP 500 responses.

This is a partial combined inspection, not Wave A’s completed exit round. The complete eight-width × four-text-size × two-browser matrix, all alternate/error/empty/large-data states, live coverage/replacement and successful copy-receipt fixtures, detailed contrast and all layout-shift/focus scenarios remain unverified. The unchanged automated checker is run at 390/100% with axe on both engines; broader matrix and 1440 axe remain blocked. Real device/screen-reader and simulator keyboard checks are separate pending gates. No zero verdict is inferred from an unmeasured area.

## Preview integrity note

The strict runtime close guard reported a changed `next-env.d.ts`. Independent post-run hashing of all 1,507 captured files found unchanged source bytes and only the exact `.next/types` → `.next/dev/types` imports in the mirror, beyond the approved DB adapter. This matches the helper’s development-type derivation, but its strict guard did not pass because the starter used `pinDevTypeReferences: false`. Both owned PostgreSQL clusters stopped. See [preview-integrity.json](preview-integrity.json); no full mirror-certification claim is made.
