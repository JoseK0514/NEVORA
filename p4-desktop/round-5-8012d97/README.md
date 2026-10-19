# Desktop exit round 5 — final limited report

**Not zero: 0 P0, 2 P1, 1 P2; exit matrix incomplete.** UI/QA recommendation: **NO-GO for closing Desktop’s exit gate** from this round. Local fictional evidence does not certify hosted/production readiness.

| Finding | Owner/action | Evidence |
|---|---|---|
| TC-P4-22 · P1 | Desktop Availability field-label floor; candidate-only correction for Claude’s review. Frozen branch remains unfixed. | [Type report](type-colour-copy.md),11px labels versus 14px floor. |
| TC-P4-23 · P2 | Desktop personal My pay text floor; candidate-only correction for Claude’s review. No pay/legal text changes. | [Type report](type-colour-copy.md),13px filenames and 12px payday line. |
| ST-P4-13 · P1 | **Desktop source owner must fix before merge.** The offending desktop selection effect is absent from the current candidate; do not import an unzero branch to fix it. | [Stability report](stability.md), controlled CLS 0.06383 versus 0 when the exact late group-open call is suppressed in the browser. |

The frozen Desktop sidebar’s group/nav/footer text measures 14px. It is a reference for inherited candidate shell finding RC-CB-TC-01, not an additional Desktop finding.

The first temp startup failed on the dependency symlink, a second helper startup lacked an older branch’s fixture import, and a successful temp runtime was closed and moved to disk when /tmp pressure was identified. None was filed as an app defect. The final disk runtime closed cleanly.


Exact source: `claude/p4-desktop-240fe0` at `8012d9790e72987140f939c7d70e1df9612ea009`, detached `/workspace/inspect-desktop`. Read only; fictional owned preview only. No app source edits or app mutations. No production access.

The unchanged checker completed **35 unique cells**: Owner 21 + Employee 14, Chromium 1440×900/100%, axe enabled; **14 raw pass / 21 raw fail**. Owner 19 cells include the documented absent `/api/manager/inbox-count`404; legacy folded-request/Reports/Settings/manager-Updates body floors are retained as out-of-scope observations. Employee’s two failures are TC-P4-22/23. Raw JSON is unchanged. See [checker summary](evidence/checker-summary.json), [Owner raw](evidence/checks-QAOWNER-chromium-1440-100.json), [Employee raw](evidence/checks-AUDIT-E-chromium-1440-100.json), [source round](evidence/source-ROUND.md).

**Exit matrix incomplete.** Gates required pausing browser work; the resumed scope was limited to font crops, a sidebar reference, and controlled Inbox CLS attribution. No WebKit, other widths, collapsed sidebar, full role/state matrix or full manual five-area sweep was completed. No earlier finding is independently closed beyond the measurements stated here. Full matrix requirements are retained in [metadata](evidence/round-metadata.json).

All owned browser/checker/Next/PostgreSQL processes were stopped. Final closure verifies unchanged source and mirror, PostgreSQL stopped, and zero closure errors: [audit](evidence/closure-audit.json). Runtime substitutions are disclosed in [adapter manifest](evidence/runtime-adapter-manifest.json) and [source hashes](evidence/source-manifest.json).
