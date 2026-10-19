# Alignment and geometry — Desktop round 5

**Verdict: not zero; incomplete.** No new alignment P0/P1/P2 was established in the limited measurements. This is not a zero exit.

## Earlier findings

| IDs | Recheck status |
|---|---|
| AL4-21/22/23/25/28/29 | Fixes present in source; responsive geometry recheck not completed. |
| AL4-30 | Coordinator-owned; the frozen source still has the double-scaling expression at `portal-premium.css:502`; no new large-text geometry measurement. |
| Other IDs | Historical results retained in `evidence/source-alignment.md`; no new closure. |

## Checked and correct

- Owner1440/100 Inbox: loading and ready band remains `(276,93)`,1120×192px. Content columns both start at y245; list x292,width 589.59; pane x897.59,width482.39; gap 16px. [Measured JSON](evidence/limited-proof.json).
- Request pages’ three whole labels fit one row at 1440/100: [viewport](evidence/shots/planning-controlled-1-ready.png). Other widths/text sizes were not judged.
- Owner and Employee checker cells report no document overflow or undersized mouse targets.

## Gaps

Every unmeasured earlier precision issue, other widths/text sizes/roles, WebKit, collapsed sidebar, phone baseline comparisons, and full per-page geometry.


Exact source: `claude/p4-desktop-240fe0` at `8012d9790e72987140f939c7d70e1df9612ea009`, detached `/workspace/inspect-desktop`. Read only; fictional owned preview only. No app source edits or app mutations. No production access.

The unchanged checker completed **35 unique cells**: Owner 21 + Employee 14, Chromium 1440×900/100%, axe enabled; **14 raw pass / 21 raw fail**. Owner 19 cells include the documented absent `/api/manager/inbox-count`404; legacy folded-request/Reports/Settings/manager-Updates body floors are retained as out-of-scope observations. Employee’s two failures are TC-P4-22/23. Raw JSON is unchanged. See [checker summary](evidence/checker-summary.json), [Owner raw](evidence/checks-QAOWNER-chromium-1440-100.json), [Employee raw](evidence/checks-AUDIT-E-chromium-1440-100.json), [source round](evidence/source-ROUND.md).

**Exit matrix incomplete.** Gates required pausing browser work; the resumed scope was limited to font crops, a sidebar reference, and controlled Inbox CLS attribution. No WebKit, other widths, collapsed sidebar, full role/state matrix or full manual five-area sweep was completed. No earlier finding is independently closed beyond the measurements stated here. Full matrix requirements are retained in [metadata](evidence/round-metadata.json).

All owned browser/checker/Next/PostgreSQL processes were stopped. Final closure verifies unchanged source and mirror, PostgreSQL stopped, and zero closure errors: [audit](evidence/closure-audit.json). Runtime substitutions are disclosed in [adapter manifest](evidence/runtime-adapter-manifest.json) and [source hashes](evidence/source-manifest.json).
