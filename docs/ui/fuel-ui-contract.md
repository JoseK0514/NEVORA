# Fuel UI contract

**Reference:** Phase 0, 2026-10-02. Selected visual base: `5e983a6bf6d7b22d3b2f47f96f98d2236060d33e` on `codex/employee-portal-polish-v2`. This records the established interface and narrow refinements; Jose's final Phase 0 visual approval remains pending. Automated checks do not supply human approval.

Preserve Apple-style restraint and Fuel identity. Reuse the actual surface being extended: Employee espresso/ivory, existing Manager treatment, and the existing Clocker. A feature does not authorize a theme, new sidebar, schedule matrix, icon family, or uniform page layout. Use raw CSS and existing tokens in `src/app/globals.css`; scope selectors to the affected portal/component. No broad root replacement, global submit override, broad `!important` patch, Tailwind, decorative chart/card, or unrelated cleanup.

## Color roles

| Role | Existing token / pairing | Use |
| --- | --- | --- |
| Main text | `--color-brand-primary: #1d1d1f` | Headings, body, metrics; preserve charcoal metrics |
| Secondary text | `--muted: #6e6e73` | Supporting labels; measure against its actual background |
| Surfaces | `--color-bg-surface: #fff`, `--color-bg-main` | Neutral controls and cards; Employee main uses its scoped warm canvas mix |
| Fuel identity | `--fuel-coffee-dark: #2b1a12`, `--fuel-coffee: #573a2c`, `--fuel-ivory: #fffdf9`, `--fuel-canvas: #f7f1e8`, `--fuel-orange: #c77c3c`, `--caramel: #c58b55` | Established rail, canvas, and small brand accents; no orange overload |
| Employee action | Scoped `--color-brand-accent`, orange 68% mixed with espresso, white text | Existing important actions; coffee/white hover. Do not substitute raw brand orange for small white labels |
| Manager / Clocker action | Existing local treatment; time-off submit and Clocker primary use `#0071e3` / white | Preserve established surface-specific pairing; Manager schedule also has its existing coffee primary |
| Success | `--color-state-success: #1d6f42` / `--color-state-success-bg: #eaf5ea` | Approved, available, completed |
| Attention | `--color-state-warning: #a05200` / `--color-state-warning-bg: #fff4e5` | Pending, outstanding, exception |
| Danger | `--color-state-danger: #b42318` / `--color-state-danger-bg: #fdecec` | Genuine withdrawal/destructive action or error; not form dismissal |
| Inactive | Muted text on local neutral background | Off, cancelled, unavailable; use explicit text |

Keep status meaning in text as well as color. Status labels are compact, noninteractive capsules, with no hover/pressed treatment or focus target. In Shift Requests, action targets keep their 44px height and aligned grid; status capsules use natural width, 11px text and a 24px minimum, centered in that same 44px action band. Wrap longer labels without shrinking them. Never recolor a whole card to communicate a small status.

## Controls and feedback

- **Primary:** only the important action in context; a submit attribute alone does not select the variant. Preserve existing Fuel or local Manager/Clocker pairing.
- **Secondary / form Cancel:** neutral surface and charcoal text. Form dismissal remains neutral. Withdrawing a submitted request retains its genuine danger treatment.
- **Danger:** soft red surface and red text. Employee danger press remains opaque; use the existing hover surface rather than fading text.
- **Selected:** existing quiet local tint and `aria-pressed`/selected semantics. Employee availability keeps green availability states. Preserve Manager segmented controls.
- **Hover / pressed:** use the component's existing colors. Keep Employee primary/secondary feedback; retain Clocker press scale. Manager time-off submit and Clocker action/Clear presses stay opaque so their small labels retain contrast.
- **Keyboard:** Employee uses a 2px local accent outline with 3px offset (caramel on its dark rail). Keep visible native focus on Manager and Clocker. Do not suppress it. Test focus inside menus and near viewport edges.
- **Disabled / submitting:** native disabled semantics, existing subdued treatment, stable target size and explicit pending label where the component supplies one. A disabled control is not actionable and contrast exemptions must not be reported as a readable active pairing. Current Manager time-off and Clocker demo have no submitting state; do not invent one during a styling phase.
- **Success / error:** existing small local message surface with explicit outcome text. Preserve input values and associated validation messages. Do not hide failures to obtain a clean screen.
- **Empty / unavailable / loading:** use each page's existing explanatory state and useful existing action; distinguish no records from disconnected data. Never fill a missing live state with invented operational numbers.

Measure composited foreground/background, including ancestor opacity, in normal, hover, pressed and focus states. Require at least 4.5:1 for active small text, 3:1 for qualifying large text and essential non-text controls. Before adopting **any new action-color pairing**, show it on representative existing controls and obtain Jose's review. Phase 0 introduces no new pairing. Detailed measurements and known exceptions belong in the phase evidence report.

## Geometry and typography

- Preserve the Apple/system font stack and actual hierarchy: Employee page titles 32px/600 with tight tracking, section titles 17px/600, row emphasis 13–14px/600, supporting copy 12–13px, quiet labels 10–11px. Retain Manager/Clocker's current hierarchy instead of applying Employee sizes globally. Do not shrink text to accommodate content.
- Reuse spacing tokens: 8, 12, 20, 32px; preserve existing 16/24px component rhythms. White surfaces use the existing thin border, 12px radius and `--shadow-premium`. Preserve page-specific widths (general Employee 880px, availability 840px, detail/form 680px where already set), not a universal new card width.
- Reuse `NavIcon`: 24-unit viewBox, round caps/joins, 1.85 stroke, default 18px; Employee navigation renders at 20px on its established optical grid. Use the existing icon in empty states and actions. Icon-only controls need accessible names.
- Employee action targets are generally at least 44px tall; Clocker keypad 74px and actions at least 46px. Existing Manager time-off capsules are 40px and segmented controls 36px: preserved baseline exceptions, not a target for new touch controls. New touch controls should provide at least 44×44px usable area.
- Preserve text wrapping, tabular time/metric numerals, equal action targets and consistent alignment. No clipped long names, location labels or pending button labels.

## Responsive and review requirements

Preserve Employee desktop rail, mobile header, bottom navigation and More disclosure; keep all navigation destinations and roles. Account for `env(safe-area-inset-bottom)` in navigation/content clearance. Manager Schedule’s mobile More popover anchors to its control’s right edge so it stays within the viewport. Adapt using existing breakpoints and page-specific patterns; bounds must fit even when overflow is hidden. Keep mobile inputs at the existing readable sizes; prefer 16px for new touch text inputs. Check actual rectangles and text ranges, not only document width.

Respect reduced motion: Employee's existing reduced-motion treatment remains; Clocker keypad/actions disable transitions and press scaling under the preference. Do not introduce entrance animation or large hover movement.

Every UI phase captures the selected base **before edits**, compares protected screens, and renders real components at 320, 375, 390, 430, 768, 1024 and 1440 CSS-pixel widths. Clocker also requires 1024×768 and 768×1024. Check long content, keyboard/focus, loading/disabled, empty/error/success, contrast, clipping, overlap and mobile safe areas. Use Chromium and WebKit where available. Label fixture evidence separately from authenticated/database evidence. Stop for human review after the bounded phase.

## Reference routes and evidence

| Portal | Reference routes |
| --- | --- |
| Employee / Lead | `/app`, `/app/schedule`, `/app/my-time`, `/app/availability`, `/app/requests`, `/app/requests?tab=my`, `/app/exchange?tab=requests`, `/app/exchange/swap?sourceShiftId=shift-own` |
| Manager | `/app`, `/app/schedule`, `/app/requests`, `/app/exchange?tab=requests` with a Manager/Owner session |
| Clocker | `/clocker/2`, `/clocker/110` |

Phase 0 artifacts: `/Users/josek0514/.codex/visualizations/2026/10/02/01a0f8c7-f196-7d22-8896-8d3c96547bd9/fuel-ui-phase-0/`. `baseline-screenshots.json` indexes 30 pre-edit captures; `before-*.png` / `after-*.png`, audit JSON, browser scripts/results and `review.html` hold review evidence. Baseline fixture: `http://127.0.0.1:4185/app`; Phase 0 fixture: `http://127.0.0.1:4186/review.html`. Fixture-only `manager`, `lead`, `empty`, `long`, `locked`, `states` query flags do not belong to the application API. These previews use actual source components with fictional data and stubbed actions, not live authentication or database workflows.

See [implementation and verification record](../superpowers/plans/2026-10-02-fuel-ui-phase-0.md) and [automation delivery charter](../architecture/fuel-automation-charter.md).
