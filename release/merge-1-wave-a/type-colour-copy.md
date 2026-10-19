# Combined inspection — type, colour and copy

Candidate `0e010464aeb5f532981ac6071c48e1527e9419db`. Coordinator `e7671e65b5a54e171422b6dbca887c416a5b0e0c`, Wave A `c05e0c7cd703fbf19e05e60bb4d488e1d9b19bb0`; backend not merged. Evidence: [probe.json](probe.json), [forms.json](forms.json), cited images in `crops/`. Fictional data only; both form POSTs were intercepted and aborted.

## Verdict

Blocked/incomplete; no new type/colour/copy finding established in the healthy samples. Contrast and all text-size/date-wrap combinations remain unverified, so this is not a zero verdict.

## Earlier findings

TC-WA-1 through TC-WA-14 remain subject to the complete exit recheck. The integration did not select an older swap-summary implementation or older coordinator CSS.

## Findings

No additional type/colour/copy defect filed.

## Checked and correct

- Employee Swap displays “Choose a shift”, “You give”, two fictional choices and “Send swap request”; a shift with no designated lead does not display the old negative lead label. The Lead sample displays “Shift lead” for an actual lead shift.
- Swap and Unable to work use the same 17px action type and 52px buttons in the 390 samples. Their dates/times contain the coordinator’s nonbreaking separators; this confirms the text representation, not every line-wrap configuration.
- Both intercepted forms retain the same “Outcome uncertain” failure pattern and a retry message, matching Wave A’s existing handoff. Payroll/legal wording was not changed or counted.

## Gaps

The candidate fails TypeScript and the Availability route cannot compile. After that compilation, the development server serves the same compiler error on subsequent routes; those repeated failures and error-overlay axe results are consequences of RC-WA-IS-01, not additional page defects. The 60-screen probe has 28 successful HTTP 200 measurements and 32 HTTP 500 responses.

This is a partial combined inspection, not Wave A’s completed exit round. The complete eight-width × four-text-size × two-browser matrix, all alternate/error/empty/large-data states, live coverage/replacement and successful copy-receipt fixtures, detailed contrast and all layout-shift/focus scenarios remain unverified. The unchanged automated checker is run at 390/100% with axe on both engines; broader matrix and 1440 axe remain blocked. Real device/screen-reader and simulator keyboard checks are separate pending gates. No zero verdict is inferred from an unmeasured area.

## Preview integrity note

The strict runtime close guard reported a changed `next-env.d.ts`. Independent post-run hashing of all 1,507 captured files found unchanged source bytes and only the exact `.next/types` → `.next/dev/types` imports in the mirror, beyond the approved DB adapter. This matches the helper’s development-type derivation, but its strict guard did not pass because the starter used `pinDevTypeReferences: false`. Both owned PostgreSQL clusters stopped. See [preview-integrity.json](preview-integrity.json); no full mirror-certification claim is made.
