# Widths, roles and consistency — Desktop round 5

**Verdict: not zero; incomplete.** No new widths/roles-area P0/P1/P2 was established; the required exit matrix was not completed.

## Earlier findings

WR4-06/14/17/18 fixes are present in source; responsive measured closure is pending. WR4-16 is coordinator-owned; WR4-02 awaits Profile integration. Other historical statuses: `evidence/source-widths-roles.md`.

## Checked and correct

- Owner 21 + Employee 14 routes at 1440/100 Chromium: no document overflow, undersized mouse target or axe violation.
- Both named font-floor issues reproduced in cropped1440 views; sidebar source reference is14px.
- All ten fictional brief accounts logged in. Owner’s first cold login exceeded the helper timeout; its one repeat succeeded. No login defect was filed. Other role-page pairs were not inspected.

## Gaps

All other widths, WebKit, collapsed sidebar,125/150% text, full200% route checks, other roles, phone regression baselines, large data and full state/consistency sweep. Requested200% font crops cover only the two named findings.


Exact source: `claude/p4-desktop-240fe0` at `8012d9790e72987140f939c7d70e1df9612ea009`, detached `/workspace/inspect-desktop`. Read only; fictional owned preview only. No app source edits or app mutations. No production access.

The unchanged checker completed **35 unique cells**: Owner 21 + Employee 14, Chromium 1440×900/100%, axe enabled; **14 raw pass / 21 raw fail**. Owner 19 cells include the documented absent `/api/manager/inbox-count`404; legacy folded-request/Reports/Settings/manager-Updates body floors are retained as out-of-scope observations. Employee’s two failures are TC-P4-22/23. Raw JSON is unchanged. See [checker summary](evidence/checker-summary.json), [Owner raw](evidence/checks-QAOWNER-chromium-1440-100.json), [Employee raw](evidence/checks-AUDIT-E-chromium-1440-100.json), [source round](evidence/source-ROUND.md).

**Exit matrix incomplete.** Gates required pausing browser work; the resumed scope was limited to font crops, a sidebar reference, and controlled Inbox CLS attribution. No WebKit, other widths, collapsed sidebar, full role/state matrix or full manual five-area sweep was completed. No earlier finding is independently closed beyond the measurements stated here. Full matrix requirements are retained in [metadata](evidence/round-metadata.json).

All owned browser/checker/Next/PostgreSQL processes were stopped. Final closure verifies unchanged source and mirror, PostgreSQL stopped, and zero closure errors: [audit](evidence/closure-audit.json). Runtime substitutions are disclosed in [adapter manifest](evidence/runtime-adapter-manifest.json) and [source hashes](evidence/source-manifest.json).
