# Wave B round4 — Bars and stability

**Verdict:** No zero: incomplete. No new Wave B stability finding; 0 P0/P1/P2 established in this partial checkpoint. Prior IDs are not closed from source alone.

Source `9bd265ebb5d2bdfa98eb51f4b386018d5aeecbf7`, detached read-only worktree. Fictional owned PostgreSQL/Next development preview; DB adapter, bounded transport pool 12 and generated type imports are recorded in [source-manifest.json](source-manifest.json). No application edits, Claude-branch mutations or browser submissions reached a server. Bootstrap used the owned fixture executor; credentials remain outside reports.

The unchanged checker (`e1324bcdafee65f70142a35e3cc27edd205e03b2fd13618835b8eb74a802ff2d`) completed **45/48** cells: Owner, six base routes (all except Update detail), 320/390, 100/200%, Chromium/WebKit. Raw evidence: [checks-smoke.json](checks-smoke.json), [checks-smoke.log](checks-smoke.log). No axe pass yet. The coordinator then paused browser work for uncontended candidate gates. **This is incomplete exit evidence and never a zero certification.**

## Status of earlier findings

| ID | Status |
|---|---|
| ST-B08 | Three-slope placeholder formulas present at `premium-wave-b.css:524`; measured placeholder-to-ready comparison pending. |
| ST-B13 | Source waits for `.wb-insights-view` before restoration at `reports.tsx:111`; repeated slow-read restoration pending. |
| ST-B14 | Source in-page loading-band minimum at `premium-wave-b.css:632`; held-read measurement pending. |
| ST-B07 | Coordinator font fix is decided but absent from this source. Smoke records report CLS0.0244 at320/100% in Chromium. This run did not capture shift attribution, so it remains an untriaged observation pending source/merged-candidate comparison, not a proven duplicate or newly attributed finding. |

## New findings

None established before the CPU pause.

## Checked and correct

- 23/24 recorded CLS observations at100% are at or below0.01; the one source-font case is preserved separately below. No page/console errors in any of48 cells.

## Gaps

Loading-band frames, held reads, scroll restoration, pinned bars, hover/focus/pending changes and reduced-motion/print probes remain pending. Shell/merged-candidate comparison: exact-source report CLS0.0244 may relate to the known Inter issue, but no shift attribution was captured; do not call it fixed from this smoke alone.

UI/QA recommendation: **NO-GO for exit certification until the incomplete sweep and rechecks finish.**
