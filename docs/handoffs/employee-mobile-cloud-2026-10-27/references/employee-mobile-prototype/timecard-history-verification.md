# Employee Timecard history verification

HTML SHA-256: `f38470e0657f18c7221db1a2877b537558857e57838863841028ffc83eb3973a`.

Implemented in the isolated Employee mobile prototype. Open Hours → Timecards → Last week to review decisions, or choose Oct12–18 for a finalized snapshot. The approved teal visual foundation, shared controls, typography, spacing and Light/Dark roles remain intact.

## Result

- The shipped journey now supplies own period history and derives Draft, Approved, Finalized, Reopened and Needs review. Default Last7 remains Draft; Lastweek demonstrates Reopened. Earlier exact periods show Finalized and Approved. Custom inclusive1–31-date ranges remain supported. Two fictional earlier own records let the Approved period reconcile; a31-day range containing those dates intentionally includes them.
- Decisions use the existing native progressive disclosures, newest first. Effective time, original punches, separate breaks and observation time are immutable. Finalized rows open preserved snapshot facts, never the live editable entry. A frozen total uses its captured observation time.
- Complete own read and coherent exact-period history succeed or fail together. Employee/Lead own scope, proof, generation,45-second expiry, hidden/blur/offline/pagehide and retained sheet checks are modeled. Deliberate refresh cannot restore foreign identity, invalid history or lost proof. Sign-out clears state and the existing epoch fence blocks old handlers after restart.
- Correction review/send recheck current own context, original target, Pending conflicts and both original/proposed overlap with every latest finalized period. A same-day late finalization yields a valid finalized refusal. Only an atomic root-memory append plus matching original result shows the Pending sample receipt. Original punches and effective totals stay unchanged by Pending/Declined proposals. Employees cannot approve, finalize, reopen or export management cards.

## Checks actually run

**549 grouped browser checks per engine PASS** in Chromium, WebKit and Firefox:508 prior groups plus41 Timecard groups. **63 pure Timecard groups PASS**; preceding models rerun. The separate snapshot component harness passes10 groups perengine at its own compiled-harness hash. Independent QA executed141/141 browser scenarios,17/17 model cases and3/3 native focus probes. No product blockers remain in that bounded audit. All185 independent artifact sizes/hashes are verified.

The two new feature regressions fail on the frozen cab9d28… baseline and pass on the final artifact. The legacy31-day total assertion was updated to include the two intentionally added earlier sample entries; no duration/permission assertion was weakened. The prior WebKit Hours layout test was independently reproduced: native Tab can leave the document, emitting blur and correctly pausing the private read. Its existing geometry assertions now deliberately refresh after returning focus. Logs preserve the failed run, event reproduction and passing rerun.

Strict TypeScript, esbuild and byte-identical saved build pass. Served/saved bytes match. There are98 source modules, largest213 nonblank/noncomment lines;8 existing files changed and5 responsibility modules were added. Shared UI/tokens/layout/Appearance, existing projections, punches, correction fixtures, published shifts and other domain models are unchanged. Four design metadata hashes match. Twelve exact read-only source files match development46e2027.

The13-file21st review reports0 findings/0 fixes. Metadata search led to reuse of project primitives; no component install or paid generation. A fresh independent reviewer inspected all15 original Timecard PNGs and returned **APPROVE**, no blockers. Parent used one of the two permitted batched inspection rounds. Impeccable reviewer/documenter substitutions are disclosed. Final functional totals supersede the documenter's explicitly pending-at-write-time note.

All120 public PNGs were freshly regenerated or copied from actual final-run captures and hash/provenance bound. Six actual fictional PDF downloads were parsed/hashed again. Historical closure reports keep their own hashes; they are not relabeled as fresh independent reviews.

[UI review](timecard-history-ui-review.md) · [QA](timecard-history-qa.md) · [Design record](timecard-history-design-record.md) · [Source contract](timecard-history-source-contract.md) · [Closure](timecard-history-closure.json) · [Current checks](checks.json).

## Remaining work and environment

Only EM-A07 is newly resolved at local prototype scope. Prior EM-A01/02/03/05/06 and local EM-R01 are carried closed. EM-A04,08,09 and live integration remain open. No full-parity, production-security, physical-device or screen-reader certification is claimed.

The authoritative application checkout stayed clean, detached at46e2027 and read-only. This projectless prototype has no Git branch/commit, PR or deployment. Review the Hours → Timecards flow next; no other user action is required for this local slice.
