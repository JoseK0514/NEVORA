# Independent source recheck — R1 correction

Date: 2026-10-30.
Reviewed correction: `faca0f4fefe6fb950078fe3766486f111b648be9`.
Parent / original reviewed checkpoint: `67fbd50d3154e7e36e2abd9652ac9f847ed83d25`.
Original report: [independent-source-review.md](independent-source-review.md), preserved unchanged by this recheck.

**Verdict: R1 is corrected in source at the reviewed correction commit. No remaining concrete source defect was identified in this bounded correction.** This is an independent source recheck, not behavioral verification, independent UI/QA acceptance or release approval. The original finding remains part of the review record.

Scope: inspected the immutable controller/test diff from the original checkpoint, the affected surrounding controller paths and the three recorded follow-up static-check artifacts. Only `controller.ts` and its notebook controller test file changed application/test source in this follow-up.

## Correction assessment

| Required behavior | Source evidence at the corrected commit | Assessment |
| --- | --- | --- |
| Replace A's automatic question when selecting B | `src/components/owner-advisor/controller.ts:347` recognizes the current tracked automatic question; lines 348–349 replace it and its provenance with B's objective. Submission at line 373 uses B's ID and the resulting question. | Corrected in source |
| Clear automatic text on explicit General selection | The same branch supplies an empty question and null provenance when no task is selected. | Corrected in source |
| Preserve manually edited question text | `editQuestion` clears automatic provenance at line 323; task selection therefore preserves a nonempty manual question, even if its text happens to equal an earlier task objective. | Corrected in source |
| Refresh automatic text after the selected task changes | Lines 152–160 find the currently selected open task in the fresh notebook and replace the question only when it still matches tracked automatic text. Manual text is preserved. | Corrected in source |
| Retire private automatic-question state | `retire` clears provenance at line 84 alongside the existing generation/abort/view reset. Accepted answers clear it at line 260 before clearing the question. | Corrected in source |
| Preserve unavailable/closed-task protection | The existing validation at lines 369–371 continues to prevent silent fallback to a general request. Invalid selection also returns before changing provenance. | Preserved in source |

Refresh still passes the existing generation, cancellation, content-version and authority checks before updating question provenance. The correction adds only ephemeral state to the existing controller; it introduces no new reader/cache, persistence, authority or business mutation path.

Three controller regression cases were authored for automatic task switching/general clearing, manual draft preservation, and refreshed objectives/manual preservation. They were read and remain **NOT RUN**. The recorded follow-up TypeScript, changed-file ESLint and whitespace artifacts each report exit code 0; those checks were not rerun by the reviewer.

No tests, app/browser, SQL/PostgreSQL, migration, CI, network, inference or dependency command was executed during this recheck. No implementation file, original report, ref or commit was edited; only this separate report was written.

The original review's held functional, database, privacy-lifecycle, browser/accessibility and model-quality acceptance gaps remain open. Source closure of R1 does not lift Jose's test hold or establish production readiness. No additional source correction is requested from this recheck.
