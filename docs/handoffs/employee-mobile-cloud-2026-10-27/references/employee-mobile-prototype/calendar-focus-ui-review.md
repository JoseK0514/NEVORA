ship

## persistence

Recommendation: **APPROVE**, bounded to EM-A01 Calendar title/status reflow and EM-A02 shared sheet focus return. Blockers: **none in this bounded finish review**. This is a fresh substitute review by the clone/design-system fidelity reviewer because `impeccable_finish_reviewer` was unavailable; it is not a new full audit or a production release approval.

Reviewed deliverable: `outputs/employee-mobile/index.html`, SHA256 `d28b942b0b8e32c164e1e5464a3c62b9eda0d64f7fa5152c1b27bdd52b3f77d7`. Verified archived HTML SHA256 `68aad106fa42dd4bcdf7dafb2e521561e15868e4cf607d810906244c7f9ff0ab`. Recursive source-byte comparison against `work/employee-mobile/evidence/calendar-focus-pass/before/src` found exactly two changed source files: `src/Calendar.css` and `src/App.tsx`. Both complete diffs were inspected. No source or implementation files were edited by this reviewer.

The settled direction is `work/employee-mobile/.impeccable/surfaces/calendar-focus.md`; the handoff plan is `outputs/employee-mobile/calendar-focus-plan.md`. The existing `work/employee-mobile/AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `.21st/design.json`, package scripts, tokens, component source, and Impeccable craft floor were inspected. This is an ordinary code-led refinement: new comps, catalog installation, and a new visual world are not required. The root workspace is not a Git repository, so no branch or commit state is asserted. No deployment was performed.

## fidelity

**Live structure:** `work/employee-mobile/src/Calendar.tsx:38` renders a real section, SVG icon, h2 and shared Status; its actions reuse Button and its supporting areas reuse Section. `src/ui.tsx:3`, `:7`, `:13`, and `:22` define these reused primitives. No screenshot, raster background, or image substitutes for the reviewed controls or copy.

**Tokens and layout:** `src/Calendar.css:3` retains token-based spacing and surface color; line 5 retains the title type token while adding `flex: 1 1 8ch` and `min-inline-size: min(8ch,100%)`. This is a content-relative layout constraint, not a new arbitrary pixel size or visual token. At 200% text the badge moves beneath the complete heading. At 320px/100%, some longer status combinations use a three-line title, but the complete words, status, and calendar icon remain readable and separated. At 390/430px/100%, the compact horizontal hierarchy remains intact. Existing Light/Dark colors, corner radii, icon family, spacing, and type roles persist.

**Direct visual inspection:** I opened all **61 original PNGs** enumerated in `work/employee-mobile/evidence/calendar-focus-pass/captures.json`, not only contact boards. They comprise 56 Calendar captures: four lifecycle labels × Light/Dark × 320/390/430/884px at 100%, plus 320/390/430px at 200%; and five Home/Schedule/Time-off/Availability/Recorded-entry return scenes. Every Calendar capture shows its full link heading and status without collision. The 884px captures are 430px app crops from an actual 884×853 viewport; other test viewports have height 844. Enlarged-text images are interior scroll segments, not full-page coverage. These are valid for the bounded collision review; clipped preceding content or body below the scroll boundary is not evidence of a failed capture.

I compared the original defect image `work/employee-mobile/evidence/full-audit-20261026/chromium/calendar-inner-text200.png`: its status visibly paints over the title. The current 320px/200% equivalents separate both. The unknown fixture's Unconfirmed label is reached after explicit Create sample link; it is not mislabeled initial state. The capture harness confirms this setup.

**Focus:** `src/App.tsx:108`, `:115`, and `:192` capture the nearest actual button/link/summary activation, focus it before modal state opens, then clear the transient reference next task. `src/App.tsx:40–59` retains native dialog opening/closing and keyboard containment. The unchanged session/epoch guard still precedes opening. Return-scene screenshots preserve composition, but do not alone prove active-element identity; that evidence comes from the inspected test assertions and results below.

**Evidence inspected:**

- `work/employee-mobile/evidence/calendar-focus-pass/captures.json` and every original in its `records` list. Independently checked all 61 SHA256 matches, PNG chunk CRCs and decompressed image streams; all 61 carry the current HTML hash in provenance metadata. Originals were successfully rendered for visual inspection.
- `work/employee-mobile/calendar-focus-next.cjs`: fixture setup, real viewport sizes, heading-region scroll, text-range overlap checks, exact active-element assertions, pointer/keyboard/touch paths, replacement, Appearance, Calendar cancel, icon target, subsequent opener, denied scope, and sign-out checks.
- `work/employee-mobile/evidence/calendar-focus-pass/green/{chromium,webkit,firefox}/results.json`: each records 20/20 checks, zero failures, zero page errors, zero unexpected network requests, and the current HTML hash. These are inspected executor results; I did not rerun a browser.
- `work/employee-mobile/evidence/calendar-focus-pass/red/webkit/results.json`: baseline hash matches archived HTML; CF05/06 fail for measured overlap; CF09–14/18/19 fail focus assertions, including BODY instead of the opener. These are substantive baseline failures, not harness timeouts.
- `work/employee-mobile/evidence/calendar-focus-pass/21st-review.json`: two files reviewed, zero findings. `design-hook-evidence.json`: existing automatic hook extraction records both changed files clean. No second detector was run.

## ceiling

This approves the finish of these two corrections in the local Employee prototype. It does not close the other full-audit findings, redesign existing screens, certify the entire design system, or authorize additional Employee actions. Existing enlarged page-title word fragmentation and large navigation footprint at 200% are unchanged context, outside these two closure items.

The parent reports completion of the prior 419 regression groups per engine; I have not independently audited that broad run and do not certify its count here. My behavioral assessment is supported by the bounded 20-group results per engine and source review. The independent QA closure is a separate review. No physical-device, screen-reader, real calendar, production authorization/security, or production deployment certification is made. No browser context was opened and no repair, mutation, or detector run was performed.

## material_fixes

- **CRITICAL:** none found in the reviewed changes.
- **HIGH:** none found in the reviewed changes. No raster replacement, bypass of shared components, new hardcoded styling system, or visible title/status collision remains in the inspected matrix.
- **MEDIUM:** none requiring a bounded correction.
- **LOW:** no new actionable finish issue identified within EM-A01/EM-A02.

No material fix or recapture is required for this bounded approval. Other full-audit items remain open under their original records.

## keep

Keep the text-relative title minimum, natural badge wrapping, shared status semantics, approved Light/Dark palette, system type, regular Phosphor icons, and native dialog lifecycle. Preserve exact-opener behavior without expanding Employee capabilities or changing calendar lifecycle models. Retain the immutable capture manifest and hash association with this verdict; any further source/build change requires fresh evidence before reusing this approval.
