# Independent Employee/Lead mobile passkeys UI review

**UI recommendation: GO WITH CONDITIONS for the bounded local mobile implementation.** No open material UI finding. This is not release, physical-device, native OS credential-store, or assistive-technology certification.

Candidate: `64063a2ac10f946f1268f325cd0de99555d87257`, branch `codex/employee-mobile-local-resume-20261027`, base `592d4212`. Final application differs from reviewed `b93a155b` only by the scoped confirmation-focus rule. Reviewer independently owns findings/closure, inspected source and actual artifacts, and made no implementation/test/config edits or runtime starts.

Authority: repository AGENTS.md and independent UI oversight skill; approved Employee mobile teal README and incumbent Profile/Calendar. DESIGN.MD remains desktop authority outside the scoped mobile override.

## Final verified evidence

Final scenario invocation: `node scripts/payroll-postgres.mjs vitest.employee-mobile-passkeys.config.mts src/test/integration/employee-mobile-passkeys.integration.ts`, with explicit `NEVORA_EMPLOYEE_PASSKEYS_EVIDENCE` pointing to `run-09` and owned local PostgreSQL/Playwright runtime selection. Root executed the scenario; reviewer directly inspected its source, output, exit artifact and rendered screenshots. Exact issued argv/assigned-environment/candidate custody is recorded and independently read in `run-09/invocation.json`; it explicitly does not claim a full inherited-environment snapshot.

`run-09/result.json`:36 checkpoints,150 nonempty screenshots,90 computed contrast measurements, zero unexpected captured console/page errors. `run-09/stdout.log`:1 test file/1 test passed, no unhandled Errors summary. `run-09/exit-code.txt`: actual child exit0. All150 listed screenshot files were independently checked as existing/nonempty. Key UI/test files in the owned Next snapshot hash-match the frozen repository candidate (`source-custody.json`).

All artifact paths below are relative to `outputs/employee-mobile-passkeys/`. `E` means each of `chromium`, `webkit`, `firefox`; it describes the exact three filenames, not a missing artifact wildcard.

| Review / exact scenario | Binary observable and result | Captured artifacts |
|---|---|---|
| UI-1: light/dark320/390/430 saved state and help | No horizontal overflow; visible targets >=44px; scoped teal/system typography/regular Phosphor, coherent header/card hierarchy. Direct visual samples agree with incumbent Profile/Calendar. VERIFIED. | `run-09/E-light-320.png`, `E-light-390.png`, `E-light-430.png`, `E-dark-320.png`, `E-dark-390.png`, `E-dark-430.png`; matrix assertions/result |
| UI-2:200% root text, focus/scroll Add, Remove and help at each width/theme | Each control remains within viewport, >=44px, no internal clipping, bottom above measured nav top. VERIFIED in three-engine assertions and directly inspected samples. | `run-09/E-light-320-text200-add.png`, `E-dark-320-text200-remove.png`, `E-light-320-text200-help.png` and corresponding390/430/theme captures |
| UI-2: keyboard Remove→review→Keep; both cancellation paths | Active element becomes named review group; computed outline is visible; Keep returns exact Remove focus; native-cancel and Cancel setup return exact Add focus with no server credential. VERIFIED. | `run-09/E-remove-review.png`, `result.json`; exact assertions in runtime source |
| UI-2: last-key review actions at200%,320px, both themes | Keep/Remove fit and can each be focused/scrolled above nav. Consequences and actions remain readable. VERIFIED. | `run-09/E-keep-light-text200.png`, `E-remove-light-text200.png`, `E-keep-dark-text200.png`, `E-remove-dark-text200.png` |
| UI-1/2: intro, Add, Remove, help, Keep, destructive action and consequences contrast | All90 measured ratios >=4.5; minimum5.42085. Destructive Remove6.05610 light/7.99886 dark. VERIFIED for measured subjects, not a complete WCAG audit. | `run-09/result.json` contrasts; destructive200% screenshots |
| UI-2/3: loading/empty/options/device/verifying/paused/read error | Actual UI shows progress/recovery; private metadata absent while paused/error. VERIFIED. | `run-09/E-loading.png`, `E-empty.png`, `E-options.png`, `E-device-prompt.png`, `E-verifying.png`, `E-paused.png`, `E-read-error.png` |
| UI-2/3: unsupported, committed removal with lost reply, successful removal, denied | Unsupported retains saved metadata/Remove; unknown offers refresh without invented success; fresh read confirms absence; denial clears commands. VERIFIED. | `run-09/E-unsupported-saved.png`, `E-unknown-removal.png`, `E-removing.png`, `E-removed.png`, `E-denied.png`; canonical assertions/result |
| UI-3: consequences, naming and privacy claims | Current name/added/last-used metadata; no universal Face ID claim; last key retains password sign-in; removal does not delete device copy/sign out. No management controls or amber warning baggage. VERIFIED in visible copy/source. | `run-09/E-remove-review.png`, saved/help and unknown screenshots |
| Responsive/desktop boundary | Same owner remains connected across mobile→1440px→mobile; one native fixture ceremony; incumbent desktop heading/dialog/pending presentation retained. VERIFIED bounded evidence only. | `run-09/E-desktop-pending.png`, `E-coarse-landscape.png`, result; shared desktop extraction diff |

## Author-owned finding and closure

**UI-PK-1 / UI-2, medium — CLOSED.** Run07 Firefox keyboard removal review focused the group but displayed no visible focus ring (`run-07/firefox-remove-review.png`). The new computed-outline assertion reproduced RED in run08 (`failure.json`, stdout assertion at integration line63). The implementer added only `.em-passkeys-confirmation:focus` with existing shared3px focus color/offset values. Final run09 directly inspected Firefox screenshot now shows the ring, and all three engines pass active-element/visible-outline assertions plus the complete clean relevant scenario. Chromium/WebKit review screenshots retain their rings. Closure is this independent reviewer's decision.

Earlier evidence gaps are closed by final run09: named-group focus, remaining engines, transient/unknown/success states, enlarged action reachability and repositioned verifying/unsupported captures. Earlier failed runs are preserved. Run07's `result.json` alone was insufficient: its stdout had one unhandled error and it remains a FAILED historical gate. See `UI_REVIEW_HISTORY.md`.

## Conditions and exact limits

- Acceptance is limited to the tested owned local Next/PostgreSQL and controlled fictional native-create fixture. Canonical cryptographic verification is real; physical OS WebAuthn sheets, device credential stores, real devices and assistive technology were not exercised. These require separate validation before corresponding claims.
- Keyboard evidence covers the explicit focus/Space/Keep/cancel paths and enlarged focused controls. It is not a screen-reader or exhaustive keyboard/contrast conformance audit. Browser engine emulation does not certify mobile OS browsers or browser-chrome safe areas.
- Shared desktop extraction and pending resize presentation were reviewed; full manager/owner/desktop workflow visual certification is outside this mobile review.
- No deployment/release authorization. Calendar QA-CAL-1 remains unrelated OPEN RISK; this passkey run does not close it or the remaining Employee mobile work.

Evidence custody: repository `.omo/evidence/passkeys-independent-ui/run09-inspection-manifest.json` contains exact paths, nonempty sizes and SHA256 hashes; `source-custody.json` matches reviewed/runtime source. This report is mirrored under that evidence directory. No user action is needed to close a material UI finding; the separately scoped device/AT/release gates remain.
