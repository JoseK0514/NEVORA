# Employee mobile: Hours, timecards and corrections

This pass implements the connected local Employee flow in [the interactive prototype](index.html). It preserves the approved teal foundation and only the Employee's own fictional records. Application source was inspected read-only at development `46e202786863279302026ee03a0e225c359fa55c`.

Final HTML SHA-256: `7e67de96a175839837b25fa7cdea8ffb983db6bc0f0716b462799bd76852e72b`.

## Implemented behavior

- Recorded time keeps the Today status and separates original punches, approved effective adjustments, breaks and after-break duration. Active punches remain in the location Clocker.
- Timecards provides presets and custom periods of1–31 inclusive days, with AST midnight clipping. Gross recorded time includes breaks; break totals appear separately. Open intervals stop at the explicit sample observation time.
- Corrections supports completed clock boundaries, existing closed-break boundaries, missing entries and replacing an approved missing-time adjustment. Date/time ordering, future time, reason, overlap, retained-break and effective-parent rules have local validation. Stale/finalized fixtures withhold submission.
- Review/edit and Pending receipts explain manager review. Pending/Declined proposals leave effective time unchanged; approved adjustments retain original punches. Submitted time corrections have no Employee cancellation action. Pending time-off withdrawal remains separate.
- Uncertain-result recovery retains the original proposal and identifier across in-app navigation, shows its immutable contents and retries the same intent once. Local duplicate submissions are deduplicated by identifier.
- Optional historical timecard snapshots preserve actor, note, revision, observed time and original/effective boundaries. Native read-only disclosures expose no mutation or current-entry action. The root sample has no management decisions; the populated branch was tested in a separate immutable-fixture component harness.

## Checks actually run

| Check | Result and evidence |
| --- | --- |
| Strict TypeScript | PASS; `work/employee-mobile/evidence/hours-pass/typecheck.log` |
| esbuild and saved-byte reproduction | PASS; `npm run build` and `node build.mjs --check` from the Employee source directory |
| Existing integrated suites |114 cases perengine PASS: baseline38, Home clock14, Today9, Account10, Requests17, Availability15, native Select11 |
| New integrated suites |35 cases perengine PASS: Timecards18, Corrections9, Hours accessibility8 |
| Total integrated UI coverage |149 cases perengine, Chromium/WebKit/Firefox; no failures or captured runtime errors; all30 result files name the final HTML hash |
| Historical snapshot component |10 cases perengine PASS in all3 engines; separate harness SHA `c28944008aea9206041510ad77ed334ac2dd862a275c3a076c477bda455e0425`; `.omo/evidence/employee-timecards/history-{engine}.json` |
| Period projection |6 pure checks PASS, including immutable historical observed-time clipping; `.omo/evidence/employee-timecards/projection.json` |
| 21st local review |37 source files;23 informational hardcoded-color advisories, all in canonical tokens;0 fixed. No external generation or catalog code installed |
| Independent design-system/UI review |APPROVE for the bounded prototype; [report and exact-hash recheck](hours-ui-review.md) |
| Artifact integrity |Saved HTML equals served bytes; five frozen references, current source inventory and19 output raster hashes checked by `verify-next.py`; [machine-readable results](checks.json) |

The browser cases cover320/390/430px mobile widths and the660px review viewport,200% text reflow including internal text-column fit, keyboard/dialog focus, touch targets, loading/error/empty/partial recovery, proposal review/retry and absence of manager controls. Historical read-only snapshots use a distinct component fixture rather than fabricated management activity in the root app.

The independent review found and rechecked enlarged status-row collisions, Hours selector clipping, an unfocused skip-link peek and missing immutable proposal details during uncertain retry. Regression checks reproduce those conditions. Assertions were strengthened, not suppressed. The available preserved-source diff and reviewer captures are retained under `work/employee-mobile/evidence/hours-review/`.

Default arithmetic reconciles to19h15 gross recorded time and1h break time. Last week is16h53 gross. Oct22's original9:00AM start remains visible beside the approved9:05AM effective start:7h55 gross and7h25 after its30-minute break. The approved missing hour on Oct21 is an adjustment, not a device punch. These are explicit fictional sample values, not payroll calculations.

## Limits and handoff

This is an in-memory React prototype. Document refresh clears sample changes and retry state. No live API, server authorization, durable write, real management snapshot, payroll calculation, native-device picker/software keyboard or screen-reader certification was exercised. There is no standalone lint or security scanner configured; neither is reported as passing.

The projectless workspace has no Git repository, branch, commit or PR. The real application checkout remains clean and detached at the source revision above. No production source, database, credentials, real notifications or deployment changed.

Remaining work is tracked in the [desktop parity ledger](desktop-parity-audit.md): notifications/communications, Profile/account, gated Pay and live integration. No user action is required to finish this local pass. Review Hours → Timecards or Corrections in the open preview; the next implementation slice is notifications and permitted communications.

[Timecards](timecards.png) · [Correction history](corrections.png) · [Missing-time review](missing-time-review.png) · [Original/effective entry](effective-entry.png) · [Break-correction review](break-correction-review.png)
