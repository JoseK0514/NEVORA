# Pinned Owner design foundation

Mode: **Operate**. Audience: small-business owners, including people with limited technical confidence. Calm, capable corporate workforce software. Reference quality: ADP/Gusto/Homebase, adapted to Nevora’s facts and identity. This is not a new brand exercise.

## Tokens inherited from approved mobile/desktop

| Role | Value / rule |
| --- | --- |
| Canvas / surface | #f4f7f6 / #ffffff |
| Main / supporting ink | #172622 / #5f6d68 |
| Primary / pressed / selected wash | #0b6e69 / #07534f / #eaf4f1 |
| Dividers / focus | #e3e9e6 / #087fca |
| Typeface | Platform system sans, matching approved mobile prototype |
| Type roles | 32px page, 24px panel, 19px section, 16px body/control, 14px supporting |
| Controls | 48px primary/form, minimum 44px compact action/disclosure/calendar target |
| Geometry | 12px control radius, 16px distinct panel radius, small 6px auxiliary radius |
| Spacing roles | 4 / 8 / 12 / 16 / 20 / 24 / 32px; 16px field rhythm, 24px section/action clearance |
| Icons | Existing regular Phosphor sprite/helper; consistent weight and alignment |
| Motion | Immediate pressed feedback, purpose only, reduced-motion support; no decorative animation system |

Use existing CSS variables. The correct form size token is `--control-height`, not undefined `--control`. Do not add per-page substitute colors, font families or one-off button dimensions. Different jobs may use different layout density; the grammar remains shared.

## Composition and discovery

Stable desktop sidebar and quiet top bar; bounded readable workspace. Five roots: Home, Schedule, Inbox, Team, More. Occasional admin/finance tools live in an organized searchable index and contextual links. One clear primary next action per decision. Do not place every feature on Home or hide a supported feature for visual simplicity.

Home prioritizes current exceptions then upcoming work. A metric must name its unit/source/period; planned staffing is not live attendance or payroll. Schedule uses actual week/day context. Complex task flows use full task pages; focused details/forms can use the established panel where appropriate. No random modal for a whole workflow.

At narrow desktop/tablet the sidebar collapses into a labelled menu. At phone fallback widths content stacks meaningfully; separately owned mobile remains the primary phone design. Meaning/readability beats fitting everything above the fold. Test 1456/1280/1024/768/390/320 and enlarged 320px/32px-root text; those are not physical-device or actual-zoom certification.

## Explicit refinements Jose already asked for

- Template name→Save template: 16px field/action separation; form→library 24px.
- All selects: native semantics, 18px regular caret, 16px trailing inset and reserved text padding. Complete selected meaning stays available when labels clip. Carets must not touch the edge.
- Desktop date alternative: shared single-month anchored/clamped/flipped popover, teal selection, outlined Today, regular Phosphor, 44px date targets, keyboard movement/Escape and exact parent-editor focus return. Native date value/validation remains authoritative. Do not replace it with a generic browser popup or a second unrelated calendar.
- Notes→published-impact notice: 16px; notice→consent/actions and request notice→decision actions: 24px. Save shift actions retain 16px clearance in draft/error/published states.
- Time-off details split date, duration and leave type into labelled values rather than crowding “1 day · unpaid time off.”
- Yellow warning slabs, amber calendar-warning tiles and tiny “Draft” chips were replaced by shared restrained neutral operational notices/status treatments. Use text/icon/meaning, not alarm decoration or color alone. The attention/error palette remains for genuine semantic need, not every draft or preparation message.
- Button sizes, icon alignment, borders, focus and padding agree across pages. No generic emoji icon substitutions, pill overload, gradients/glass, oversized hero metrics, dashboard card wallpaper or fabricated decorative charts.

## Forms, recovery and content

Native fields, labels, fieldsets, checkbox labels and details/summary. Progressive disclosures contain evidence/advanced fields; do not omit real supported fields. Keep helper text subordinate but readable. New fields/actions must inherit shared spacing and sizing.

Loading, healthy empty, partial, failed, offline, paused, stale, revoked, disabled, pending, unknown and confirmed outcomes mean different things. A missing/unverified amount is not zero. A queue/receipt is not delivery. An old date is not evidence payment happened.

Back/deep links carry exact person/date/week/location/run/year/filter and safe origin; preserve search/scroll/focus and deliberate draft handling. Current-source recovery retains allowed entered values but invalidates old command/ack authority. Changed actor/session clears private drafts. Unknown operations reconcile the original identity.

Consequential actions name actual scope/consequence before consent. Source history remains immutable. No fake success, unsupported Undo, inferred wage/tax facts, guessed provider compatibility or fabricated certainty.

## How named skills were interpreted

- 21st: reuse inspected primitives/patterns and existing context. No paid hosted generation/new package just for a local extension.
- Impeccable: ordinary extension of the established world, Operate mode, craft floor, bounded review and documentation comparison. No new concept tournament or comp/image-generation round is needed for another source-defined Owner task.
- Mobbin: real product references informed hierarchy/grouping. Do not copy their blue/pill identity or imply competitor usability was certified.
- GPT Taste/Tastemaker: coherent hierarchy, readable text, purposeful grouping and consistency. Marketing AIDA/hero/GSAP directions do not govern the operational workspace. Missing Tastemaker knowledge-base files mean no fabricated numeric/formal score.
- UI UX Pro Max: use concrete layout/contrast/target guidance. Its previously suggested purple/orange marketing palette was rejected in favor of the approved product contract.
- Apple Design: predictable native behavior, agency, readable system type, immediate feedback and accessibility.
- No AI Slop/OMO: plain task copy, no filler/unverified claims, scoped knowledge/evidence and no broad cleanup of other people’s work. Missing optional eval tools do not justify inventing their results.
- React UI Patterns: component responsibility/state discipline; the prototype stays in its existing vanilla stack. Real React integration is separate.

The frozen incumbent authority is `work/owner-desktop/DESIGN.md`/`PRODUCT.md` and baseline source, with shared-root/mobile context read-only. Local DESIGN’s prose narrative stops at G07; G08–G10 briefs/verified reports carry later surface detail. This is documented convention drift, not permission to rewrite the system/sidecar unasked.
