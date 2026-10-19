# Combined inspection — interaction and states

Candidate `0e010464aeb5f532981ac6071c48e1527e9419db`. Coordinator `e7671e65b5a54e171422b6dbca887c416a5b0e0c`, Wave A `c05e0c7cd703fbf19e05e60bb4d488e1d9b19bb0`; backend not merged. Evidence: [probe.json](probe.json), [forms.json](forms.json), cited images in `crops/`. Fictional data only; both form POSTs were intercepted and aborted.

## Verdict

Not zero: **one confirmed P0**, owned jointly by Wave A and the coordinator/shared kit. Additional severity counts remain unknown where compilation prevents inspection.

## Earlier findings

The swap-summary conflict is gone. Both intercepted single-submit samples and all eight role/engine More checks pass as detailed below. The remaining IS-WA IDs and successful-send states are not closed by this partial inspection.

## Findings

| ID | Screen / role / width / browser / text | Element / measurement | Crop | Cause | Specific source fix | Severity / owner |
| --- | --- | --- | --- | --- | --- | --- |
| RC-WA-IS-01 | Availability / Manager; subsequent app routes / all roles / 390 / Chromium and WebKit / 100% | `/app/availability` returns HTTP 500; browser reports missing `useHoldHeight` export. In the ordered 60-screen probe, that compilation failure accounts for 32 HTTP 500 results. TypeScript also fails TS2724 and four render assertions fail for the same missing function. | [crops/chromium-AUDIT-M-29.png](crops/chromium-AUDIT-M-29.png) | `src/components/availability-team-list.tsx:7`, call at line 44; latest shared `src/components/kit/hold-height.tsx` exports `HoldHeight` only. | Wave A should adapt the list to the current `HoldHeight` wrapper with `holding={filter !== "all"}`, preserving its full-list hold and the coordinator’s synchronous hold behavior, or agree a compatible shared API with the coordinator. Fix and re-inspect on the source branch. This is outside the three permitted candidate UI edits. | P0 / Wave A + coordinator |

## Checked and correct

- More tested before compiling Availability: Employee, Lead, Manager and Owner, in Chromium and WebKit at 390. All eight opened from Enter with focus inside, closed using Close, closed using Escape and returned focus to the trigger in both cases. The measured menu actions were at least 44px tall.
- Double tap Swap and Unable to work: exactly one intercepted POST each; no mutation reached the server. Both show “Sending…” and focus a paragraph containing the uncertain-outcome notice after abort. See [forms.json](forms.json).
- Employee and Lead opening Inbox redirect to their Requests hub in the healthy shell phase; this is an expected role behavior.

## Gaps

The candidate fails TypeScript and the Availability route cannot compile. After that compilation, the development server serves the same compiler error on subsequent routes; those repeated failures and error-overlay axe results are consequences of RC-WA-IS-01, not additional page defects. The 60-screen probe has 28 successful HTTP 200 measurements and 32 HTTP 500 responses.

This is a partial combined inspection, not Wave A’s completed exit round. The complete eight-width × four-text-size × two-browser matrix, all alternate/error/empty/large-data states, live coverage/replacement and successful copy-receipt fixtures, detailed contrast and all layout-shift/focus scenarios remain unverified. The unchanged automated checker is run at 390/100% with axe on both engines; broader matrix and 1440 axe remain blocked. Real device/screen-reader and simulator keyboard checks are separate pending gates. No zero verdict is inferred from an unmeasured area.

## Preview integrity note

The strict runtime close guard reported a changed `next-env.d.ts`. Independent post-run hashing of all 1,507 captured files found unchanged source bytes and only the exact `.next/types` → `.next/dev/types` imports in the mirror, beyond the approved DB adapter. This matches the helper’s development-type derivation, but its strict guard did not pass because the starter used `pinDevTypeReferences: false`. Both owned PostgreSQL clusters stopped. See [preview-integrity.json](preview-integrity.json); no full mirror-certification claim is made.
