# Bars and stability — Desktop round 5

**Verdict: not zero: 0 P0, 1 P1, 0 P2 in this area; exit matrix incomplete.** Planning Inbox visibly rearranges after its ready list appears.

## Finding

| ID | Screen · role · width | Element | Measured defect | Screenshot | Cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| ST-P4-13 | `/app/inbox?filter=planning` · QAOWNER · Chromium 1440×900 ·100% | Default selected `TARGET_MISSING` group (`.premium-group details`) | After the ready list paints, “13 people with no weekly hour target” opens **64→1436px (+1372px)**. Deadline/timecard rows initially at y465/569/673 move below the viewport. Original checker CLS **0.1465**; font-ready held-read runs **0.06393/0.06388**; a final source run **0.06383**. Suppressing only that late open call in the browser yields **CLS 0** (attribution control, not a fix). Threshold0.01. | [Ready viewport](evidence/shots/planning-controlled-1-ready.png), [loading viewport](evidence/shots/planning-controlled-1-loading.png), [control](evidence/shots/cls-suppression-control-2-suppressed.png). Exact shift sources/stack: `evidence/limited-proof.json`, `evidence/cls-suppression-control.json`. | `src/components/manager-inbox.tsx:261-264`: `InboxSurface.useEffect` calls `setAttribute('open','')` after paint. Intercepted stack identifies `commitHookPassiveMountEffects`. | Open the selected group before its first painted ready frame: minimum candidate for the owning branch is this effect as `useLayoutEffect` (already imported), or declarative initial `open`. Recheck CLS≤0.01, selected row visibility and later user toggling. **No fix was applied or certified.** Current candidate lacks this desktop effect; owning Desktop source must fix before merge. | P1 |

## Earlier findings

ST-P4-03/05/09/10/11/12 fixes are present in source; controlled rechecks for those IDs were not completed. ST-P4-06 remains the documented decision. ST-P4-08 is coordinator-owned. Historical results: `evidence/source-stability.md`.

## Checked and correct

- The planning Inbox band is 192px in both loading and ready states, with identical 1120px width. The reproduced shift comes from the selected group, not band growth.
- Font readiness was awaited before releasing the protected read in controlled runs.
- The source effect opens exactly one group; browser-only suppression leaves it closed and removes the measured shift. No server data changed.

## Gaps

Before-paint fix has not been tested. MutationObserver “atomic open” experiments did not beat the passive effect and are retained as unsuccessful controls (`evidence/cls-attribution.json`); do not treat them as validation. Polling, pending button size, route placeholders, scroll holds, sticky behavior and all other matrix cells remain incomplete.


Exact source: `claude/p4-desktop-240fe0` at `8012d9790e72987140f939c7d70e1df9612ea009`, detached `/workspace/inspect-desktop`. Read only; fictional owned preview only. No app source edits or app mutations. No production access.

The unchanged checker completed **35 unique cells**: Owner 21 + Employee 14, Chromium 1440×900/100%, axe enabled; **14 raw pass / 21 raw fail**. Owner 19 cells include the documented absent `/api/manager/inbox-count`404; legacy folded-request/Reports/Settings/manager-Updates body floors are retained as out-of-scope observations. Employee’s two failures are TC-P4-22/23. Raw JSON is unchanged. See [checker summary](evidence/checker-summary.json), [Owner raw](evidence/checks-QAOWNER-chromium-1440-100.json), [Employee raw](evidence/checks-AUDIT-E-chromium-1440-100.json), [source round](evidence/source-ROUND.md).

**Exit matrix incomplete.** Gates required pausing browser work; the resumed scope was limited to font crops, a sidebar reference, and controlled Inbox CLS attribution. No WebKit, other widths, collapsed sidebar, full role/state matrix or full manual five-area sweep was completed. No earlier finding is independently closed beyond the measurements stated here. Full matrix requirements are retained in [metadata](evidence/round-metadata.json).

All owned browser/checker/Next/PostgreSQL processes were stopped. Final closure verifies unchanged source and mirror, PostgreSQL stopped, and zero closure errors: [audit](evidence/closure-audit.json). Runtime substitutions are disclosed in [adapter manifest](evidence/runtime-adapter-manifest.json) and [source hashes](evidence/source-manifest.json).
