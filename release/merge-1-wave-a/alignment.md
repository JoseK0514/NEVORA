# Combined inspection — alignment and geometry

Candidate `0e010464aeb5f532981ac6071c48e1527e9419db`. Coordinator `e7671e65b5a54e171422b6dbca887c416a5b0e0c`, Wave A `c05e0c7cd703fbf19e05e60bb4d488e1d9b19bb0`; backend not merged. Evidence: [probe.json](probe.json), [forms.json](forms.json), cited images in `crops/`. Fictional data only; both form POSTs were intercepted and aborted.

## Verdict

Blocked/incomplete; no new alignment finding established in the measured samples. This is not a zero verdict. The confirmed candidate-wide P0 is counted once in interaction-states.

## Earlier findings

| Earlier ID | Recheck |
| --- | --- |
| AL-WA-1 | Sampled at 200% text, Add shift main/side both remain 288px wide at 320, 812px at 844×390 and 1088px at 1440. No zero-width column in those samples. Complete matrix still required. |
| AL-WA-8 | The prior Wave A alignment report explicitly documents a centered 720px card column at 1440 as intentional. Add employee retains that width; do not count its different desktop left edge as a new defect. |
| Other AL-WA IDs | Not closed by this partial merge inspection. |

## Findings

No additional measured alignment defect filed.

## Checked and correct

- At 390, Add shift cards start at x=16, end at x=374, are 358px wide, have radius 20px and no border. The first three cards have 16px vertical gaps. See [Add shift](crops/chromium-AUDIT-M-21.png).
- Swap and Unable to work retain the same 16px phone edges and 16px card gaps; their primary buttons measure 52px high with radius 12px.
- Add employee at 320/200% has 288px cards at x=16 with document width 320. See [large text sample](crops/chromium-AUDIT-M-27-320-200.png).

## Gaps

The candidate fails TypeScript and the Availability route cannot compile. After that compilation, the development server serves the same compiler error on subsequent routes; those repeated failures and error-overlay axe results are consequences of RC-WA-IS-01, not additional page defects. The 60-screen probe has 28 successful HTTP 200 measurements and 32 HTTP 500 responses.

This is a partial combined inspection, not Wave A’s completed exit round. The complete eight-width × four-text-size × two-browser matrix, all alternate/error/empty/large-data states, live coverage/replacement and successful copy-receipt fixtures, detailed contrast and all layout-shift/focus scenarios remain unverified. The unchanged automated checker is run at 390/100% with axe on both engines; broader matrix and 1440 axe remain blocked. Real device/screen-reader and simulator keyboard checks are separate pending gates. No zero verdict is inferred from an unmeasured area.

## Preview integrity note

The strict runtime close guard reported a changed `next-env.d.ts`. Independent post-run hashing of all 1,507 captured files found unchanged source bytes and only the exact `.next/types` → `.next/dev/types` imports in the mirror, beyond the approved DB adapter. This matches the helper’s development-type derivation, but its strict guard did not pass because the starter used `pinDevTypeReferences: false`. Both owned PostgreSQL clusters stopped. See [preview-integrity.json](preview-integrity.json); no full mirror-certification claim is made.
