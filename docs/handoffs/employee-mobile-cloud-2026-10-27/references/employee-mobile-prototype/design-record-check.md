# Employee mobile design record check

Recorded: 2026-10-26T18:34:40.262501+00:00. Scope: source-to-record agreement for the ordinary Employee adaptation of Jose’s chosen clean teal Owner style. This is not a new global visual system approval or a production Signature change.

## Result

PASS for the 12 bounded static checks in `../../.omo/evidence/employee-design-record/verification.json`. Created `../../work/employee-mobile/.impeccable/design.json` using the installed Impeccable document reference’s schemaVersion 2 extensions format. Existing DESIGN.md, source, frozen references and independent review reports were preserved.

The sidecar contains 23 color metadata entries keyed to the existing DESIGN.md frontmatter, observed motion and breakpoints, and eight CSS/HTML component samples: primary button, secondary button, text button, labeled native field, Employee navigation, status tones, list card and action row. Snippet declarations are extracted from current CSS, class-scoped with `ds-`, and use live CSS variables. Phosphor symbols are inlined from the actual sprite; snippets have no external assets or React runtime requirement. They show visual states, not application event handlers.

## Source agreement and Owner comparison

- All 23 color primitives match exactly across `src/tokens.css`, DESIGN.md and `.21st/design.json`; these are managed color declarations, not 23 unmanaged literals. Of those values, 22 occur in the frozen Owner stylesheet. The Employee dialog scrim `#162b2580` is the one value absent from that stylesheet.
- All five frozen-reference hashes match `references/manifest.json`. Comparison uses those frozen bytes, not concurrent live Owner/access files.
- The system family, page/section/title sizes and weights, teal action colors, white surfaces, pale canvas, 4/8/12/16/20/24/32 spacing scale, 28px section gap, card/control/small radii of 16/12/8px, 48px primary controls and 44px compact controls are inherited. Employee’s 22px shift time role is task-specific.
- Employee fields use `--control-border: #7a8882`, the frozen Owner chevron ink, instead of Owner’s lighter form border. Calculated sRGB contrast against white is **3.7027:1**, exceeding the 3:1 boundary target. This numerical result does not certify the whole UI.
- Employee reserves bottom-navigation space with CSS grid and measures enlarged text to choose five columns, 3+2 or two columns. Frozen Owner uses an absolutely positioned navigation bar with separately managed height. Both share teal selection and the teal-wash icon background.
- Employee uses native dialog sheets, a 92dvh maximum sheet height, explicit focus handling and no box-shadow declarations. Frozen Owner has an overlay/sheet system, sheet and button shadows and sheet-entry animation. The sidecar’s empty shadow list intentionally reflects Employee source.
- Employee icon buttons use 44px dimensions and 12px corners. Frozen Owner’s base icon button is 48px and circular, with compact variants. Employee disables buttons with opacity .55 and a not-allowed cursor; frozen Owner uses .65 and wait.
- Observed viewport thresholds are max-width359px (narrow insets) and min-width700px (review frame), not660px. The660px requested review capture is a test viewport, not a CSS breakpoint.

## Exact validation and evidence

Run from workspace root:

```sh
python3 .omo/evidence/employee-design-record/verify.py
```

| Scenario | Binary observable | Captured artifact |
| --- | --- | --- |
| Primitive/sidecar agreement | Three-way color equality and all23 sidecar canonical colors equal source; schemaVersion2, no legacy primitive arrays | `../../.omo/evidence/employee-design-record/verification.json` |
| Frozen visual authority | Every manifest expected SHA-256 equals actual reference bytes | Same JSON, `frozenReferences` |
| Source-derived component samples | Every documented selector/declaration equals the source after class scoping; no unresolved variables or external snippet assets | Same JSON, `snippetSourceEquality`; `../../.omo/evidence/employee-design-record/snippet-sources.json` |
| Artifact/style binding | HTML style block equals concatenated current token/layout/component CSS | Same JSON, `artifact_css_matches_current_source` |
| Visible field boundary | Calculated border/white contrast >=3 | Same JSON, `formBorderContrastOnWhite` |
| Module-size agreement | Every source module <250 nonblank/noncomment lines; maximum observed113 | Same JSON, `sourceLOC` |
| Installed-package and metadata claims | Local react and react-dom package manifests both19.3.0; catalog-installed metadata array empty | Same JSON, installed versions/checks |

The verification command exited0. Its captured output is `../../.omo/evidence/employee-design-record/verification.log`; its repeatable implementation is `../../.omo/evidence/employee-design-record/verify.py`. Extraction is recorded in `../../.omo/evidence/employee-design-record/record.py`.

HTML examined: `index.html`.
SHA-256: `234593a6901187d4d68f2f40e463875e88cbc01aad78bdc37bed09501ca04db7`.
The captured model source hash is `386a0aedfd67d374982c5c061efb14af796156a3abb1f8df22915e0fc912b59c`. This report binds design/style evidence to that captured artifact; parent-owned full browser QA supplies behavior evidence separately.

## Limits and handoff

This pass does not claim browser interaction, screen-reader, accessibility, device, production or full feature-parity certification. No formal Tastemaker grade is provided; no installed Tastemaker knowledge base was used.21st is design metadata, with no catalog component installation claimed. React is installed locally; these are distinct states.

DESIGN.md was intentionally preserved. Its23 color entries are machine-readable primitives; typography, spacing and radii remain described in prose and CSS rather than complete frontmatter groups. No invented primitive groups, synthesized tonal ramps, nonexistent frontmatter component references or new North Star were added to the sidecar. The sidecar requires the host CSS variables from `src/tokens.css`; its navigation sample does not execute App.tsx text measurement. This source extraction is not a rendered panel QA claim.

The shared workspace is not a Git checkout, so no branch or commit was created here. No app changes, API calls, notifications, customer data, production integration or deployment were performed. No user action is required for this bounded documentation handoff; parent verification remains responsible for final behavior evidence and any subsequent artifact changes.
