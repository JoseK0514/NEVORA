# Current candidate follow-ups for Claude

**Published codex/release-candidate: a21650de50374683d52e32b883d7f419d7344f22.** It starts from rolling integration15a0fcd7, adds four small finding commits, then merges Claude’s c8752f2b CI/test corrections. Exact33 b68f250 and all four ready refs remain unchanged. [Source, findings, hashes and validation limits](source-and-findings.json).

| Commit | Finding | Candidate change |
|---|---|---|
|0caadb35|AL-WA-10 P1|Move nv-content/wa-narrow onto an outer wrapper so Review replacement retains standard gutters and card width.|
|2ddb833f|TC-WA-16 P2 continuation|Change button foreground/background together; preserve transform press motion and the established palette.|
|e7ee28a2|ST-RC-PAYROLL-SAVE-01 P2|Reuse the established PendingLabel so Company Save reserves its idle and pending label height.|
|08159520|TC-WA-3 retained P2|Attach the time separator to the preceding time, allowing a break before the duration in all four existing time summaries.|

Each row has its own format-patch here. The new lineage excludes the old twelve follow-up application commits, including the unresolved compiler guard; none were bulk applied. Their old history, plus original gutter/contrast repairs, remains preserved at codex/paused-followups-14c9ccc (14c9cccac9c2171f206046e6f2be8397c8c922ce). Current0ca/2ddb are clean ports of the same findings onto15. Published33 remains immutable.

**Verification so far:** 29existing focused tests pass (Coverage8, Configuration2, Swap3, Kit16); changed TSX lint and diff check pass. The initial focused run retained one Coverage assertion that expected adjacent raw HTML text across the now separate spans; it is preserved. The assertion now compares the same visible duration text across markup, and all29 pass. No timeout, privacy guard, business command or UI wording was changed. Fresh whole-source gates are running; repaired-source browsers are queued. These findings are not independently closed.

Claude’s CI-only correction1fa7a260 is integrated through c8752f2b: full history for validate, current Attendance loading/paused/offline labels, Home cold-load expectations matching the existing P3-ST-25 hidden recordedSlot, and the rendered curly all-set apostrophe. This was the source owner’s published contract update; this task did not remove assertions to create a pass. A fresh hosted run is still required. Application src trees at08159520 and a21650de are identical.

No main merge, deployment or phone exposure. Full five-area exits continue under their pinned sources; none has a zero verdict.
