# Nuvora UI contract

> The file path is retained for compatibility with existing plans. The product identity is now **NUVORA**, the current module is **Workforce**, Fuel Coffee Drive is the customer/workspace, and VELANI LLC is the parent company.

**Reference:** Phase 0, 2026-10-02, plus the Nuvora brand-foundation pass. Preserve the approved Apple-style layouts, spacing, typography, control geometry, responsive behavior, and semantic states. Branding changes do not authorize a redesign.

Nuvora uses a restrained midnight/indigo identity: `#20232D` structural midnight, `#4F46C8` primary indigo, `#4038A8` hover/pressed indigo, `#EEEEFC` soft selection, `#F6F6F8` canvas, `#FFFFFF` surface, `#18191F` primary text, and `#676A73` secondary text. Fuel-specific brown/orange is no longer the permanent software identity. Fuel Coffee Drive remains visible only as workspace context. The Velani icon may be used as the Nuvora mark; `Powered by VELANI LLC` stays subtle in login/footer/legal contexts.

Reuse the actual surface being extended. A feature does not authorize a new theme, new sidebar, schedule matrix, icon family, or uniform page layout. Use raw CSS and existing tokens in `src/app/globals.css`; scope selectors to the affected portal/component. No broad submit override, broad `!important` patch, Tailwind, decorative chart/card, or unrelated cleanup.

## Color roles

| Role | Existing token / pairing | Use |
| --- | --- | --- |
| Main text | `--color-brand-primary: #18191f` | Headings, body, metrics; preserve charcoal metrics |
| Secondary text | `--muted: #676a73` | Supporting labels; measure against its actual background |
| Surfaces | `--color-bg-surface: #fff`, `--color-bg-main: #f6f6f8` | Neutral controls and cards across the Nuvora shell |
| Nuvora identity | `--nuvora-midnight: #20232d`, `--nuvora-indigo: #4f46c8`, `--nuvora-indigo-hover: #4038a8`, `--nuvora-indigo-soft: #eeeefc` | Structural rail, primary actions, active states, focus, and restrained product accents |
| Employee action | Scoped `--color-brand-accent` using Nuvora indigo with white text | Existing important actions; use the approved darker indigo on hover/pressed |
| Manager / Clocker action | Existing geometry with Nuvora primary pairing | Preserve surface-specific hierarchy while replacing old Fuel/blue brand actions with Nuvora indigo where brand-primary behavior is intended |
| Success | `--color-state-success: #1d6f42` / `--color-state-success-bg: #eaf5ea` | Approved, available, completed |
| Attention | `--color-state-warning: #a05200` / `--color-state-warning-bg: #fff4e5` | Pending, outstanding, exception |
| Danger | `--color-state-danger: #b42318` / `--color-state-danger-bg: #fdecec` | Genuine withdrawal/destructive action or error; not form dismissal |
| Inactive | Muted text on local neutral background | Off, cancelled, unavailable; use explicit text |

Keep status meaning in text as well as color. Status labels are compact, noninteractive capsules, with no hover/pressed treatment or focus target. In Shift Requests, action targets use equal 120×44px desktop capsules and three equal responsive columns, with one 12px/600 label style and balanced wrapping; status capsules use natural width, 11px text and a 24px minimum, centered horizontally in their grid column and vertically in that same 44px action band. Wrap longer labels without shrinking them. Never recolor a whole card to communicate a small status.

## Controls and feedback

- **Primary:** only the important action in context; a submit attribute alone does not select the variant. Use the approved Nuvora action pairing while preserving existing geometry and hierarchy.
- **Secondary / form Cancel:** neutral surface and charcoal text. Form dismissal remains neutral. Withdrawing a submitted request retains its genuine danger treatment.
- **Danger:** soft red surface and red text. Employee danger press remains opaque; use the existing hover surface rather than fading text.
- **Selected:** existing quiet local tint and `aria-pressed`/selected semantics. Employee availability keeps green availability states. Preserve Manager segmented controls.
- **Hover / pressed:** use the component's existing colors. Keep Employee primary/secondary feedback; retain Clocker press scale. Manager time-off submit, blue action families and Clocker action/Clear presses stay opaque so their small labels retain contrast. The final audit removes the inherited 0.86 hover/press fade from Manager marketplace, quick/review, profile, new-shift primary and settings-save actions; their approved foreground/background colors remain unchanged.
- **Keyboard:** Employee uses a 2px local accent outline with 3px offset (caramel on its dark rail). Keep visible native focus on Manager and Clocker. Do not suppress it. Test focus inside menus and near viewport edges.
- **Disabled / submitting:** native disabled semantics, existing subdued treatment, stable target size and explicit pending label where the component supplies one. A disabled control is not actionable and contrast exemptions must not be reported as a readable active pairing. Current Manager time-off and Clocker demo have no submitting state; do not invent one during a styling phase.
- **Success / error:** existing small local message surface with explicit outcome text. Preserve input values and associated validation messages. Do not hide failures to obtain a clean screen.
- **Empty / unavailable / loading:** use each page's existing explanatory state and useful existing action; distinguish no records from disconnected data. Never fill a missing live state with invented operational numbers.

Measure composited foreground/background, including ancestor opacity, in normal, hover, pressed and focus states. Require at least 4.5:1 for active small text, 3:1 for qualifying large text and essential non-text controls. Before adopting **any new action-color pairing**, show it on representative existing controls and obtain Jose's review. Phase 0 introduces no new pairing. Detailed measurements and known exceptions belong in the phase evidence report.

## Geometry and typography

- Preserve the Apple/system font stack and actual hierarchy: Employee page titles 32px/600 with tight tracking, section titles 17px/600, row emphasis 13–14px/600, supporting copy 12–13px, quiet labels 10–11px. Retain Manager/Clocker's current hierarchy instead of applying Employee sizes globally. Do not shrink text to accommodate content.
- Reuse spacing tokens: 8, 12, 20, 32px; preserve existing 16/24px component rhythms. White surfaces use the existing thin border, 12px radius and `--shadow-premium`. Preserve page-specific widths (general Employee 880px, availability 840px, detail/form 680px where already set), not a universal new card width.
- Reuse `NavIcon`: 24-unit viewBox, round caps/joins, 1.85 stroke, default 18px; Employee navigation renders at 20px on its established optical grid. Use the existing icon in empty states and actions. Icon-only controls need accessible names.
- Standard portal action families share a 44px minimum height, 22px capsule radius, 6px vertical / 16px horizontal padding, 12px/600 system labels with a 15px line-height, and an 8px icon gap. Center labels and icons with flex alignment. Use scoped existing classes; preserve each variant’s colors. Manager Time Off, Schedule, approvals and Availability now meet the same touch minimum. Segmented controls keep their existing 7px/9px shape and selected treatment, with 44px targets.
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


Button alignment follow-up (base `bb4850ed57efc9a22c4f286efb03cd6165366d78`): current review at `http://127.0.0.1:4186/alignment/review.html`; before/after evidence in the sibling `fuel-button-alignment/` artifact directory. Action label sizes/centering and informational status-column alignment follow the rules above. The follow-up is included in the separate local `style: normalize Fuel action controls` checkpoint together with the final consistency audit below. Human visual approval remains pending.


## Final Phase 0 action consistency audit

Peer groups use equal tracks, matching height/radius/typography and an 8px gap: approvals, trade responses, availability Reset/Save, Time Off Cancel/Submit, swap/callout footers, new employee/shift forms and template actions. Widths belong to their context; do not assign a universal button width. Preserve full-width approval dividers and wrapping labels. Time Off controls retain their position while hovered, pressed, disabled or submitting.

Intentional dimensions and shapes:

- Clocker actions remain 46px high / 23px radius, with equal Start/End Break and Clock Out peers; circular PIN keys and Clear/Delete utilities remain 74px. This established kiosk family is unchanged.
- Login retains its established 48px full-width Sign In action, 13px type and 12px radius; activation uses the same authentication family with a 44px minimum. Authentication layout and inline account-navigation links are preserved.
- Week arrows use 44px square/circular targets; they do not inherit text-action widths.
- The shift picker retains its 64px trigger and 76px options for two lines of shift context; Schedule More rows retain their 54px minimum and left-aligned title/detail hierarchy.
- Mobile navigation and More links retain their existing larger targets and icon grids. Scrollable Dashboard tabs and Schedule shift feeds remain scrollable; no table or navigation redesign.
- Status badges remain compact, natural-width information with no click/focus behavior. They are not action peers.

Evidence: `fuel-ui-phase-0/controls/` in the external Phase 0 artifact directory. Review: `http://127.0.0.1:4186/controls/review.html`. The before snapshot includes the intentional post-`bb4850e` Shift Requests changes; final screenshots show the eight requested action groups plus the 320px Manager Schedule menu. Fictional-data previews and intercepted form actions do not prove live authentication, persistence or punch processing. No Phase 1 work, push, merge or deployment is included.
