# Apple Human Interface Guidelines: NEVORA rulebook

Retrieved 2026-11-21 from Apple's HIG (DocC JSON for the pages below). Re-check the source when a rule matters to a
decision; Apple revises these pages (Accessibility was last changed June 9, 2025; Motion September 9, 2025).

- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/typography
- https://developer.apple.com/design/human-interface-guidelines/color
- https://developer.apple.com/design/human-interface-guidelines/motion

NEVORA is a web app and PWA (Capacitor shell planned), so Apple's pt maps to CSS px. HIG sets floors and principles;
DESIGN.MD sets the brand. Each rule below has its NEVORA application.

## Layout

| HIG rule | NEVORA application |
|---|---|
| Order content by importance, top and leading side first | Band title and key figures first; the primary action in the first card or the footer, never buried |
| Align to make scanning easy; indentation signals subordination | Shared insets (14/18/22); don't indent unless the item is a child |
| Group related items with space, containers or separators | One card per group; gap inside a group smaller than gap between groups |
| Progressive disclosure keeps layouts clean | CaretDown disclosures, sheets and detail pages instead of long forms |
| Differentiate controls from content | Controls are buttons, chips, segments; content is text in cards |
| Respect safe areas | `env(safe-area-inset-*)` on the tab bar, band top, sheets and the Clocker |
| Lay out by available space (size classes), not device type or orientation | Breakpoints by width (320/390 phone, 768–1023 tablet rail, 1024+ desktop), never user-agent checks |
| Keep functionality the same as space changes; only how much is visible changes | Tab bar on phones becomes the rail or sidebar; no feature exists on one width only |
| Prepare for text-size changes: stack side-by-side views, let rows grow | Rows grow in height; figure tiles stack; no fixed-height text containers |
| Test the largest and smallest layouts first | Check 320px and 200% text before the 390px happy path |

## Accessibility

| HIG rule | Value | NEVORA application |
|---|---|---|
| Default and minimum control size (iOS, iPadOS) | 44×44 default, 28×28 minimum | NEVORA floor is 44 (`--b-target`), 48 on touch tablets and footers. Never use the 28 minimum |
| Spacing between controls | ~12 pt around bezeled controls, ~24 pt around unbezeled ones | Adjacent buttons at least 8px apart with 44px hit areas; icon-only controls get room |
| Text contrast (WCAG AA, used by Accessibility Inspector) | 4.5:1 up to 17pt; 3:1 at 18pt+ or bold | Check against white, canvas, tints and the band. Non-text UI 3:1 (WCAG 1.4.11) |
| Support larger text | Enlarge to at least 200% | Type roles in rem; layout survives 200% |
| Default and minimum text size (iOS) | 17 pt default, 11 pt minimum | NEVORA floor is 12px (10.5px tab labels under an icon are the one exception). See the note under Typography |
| Convey information with more than colour | n/a | Status chips carry words; colour is a 6px dot |
| Offer alternatives to gestures | n/a | Every swipe or drag has a button |
| Keyboard alone works; don't override system shortcuts | n/a | Full keyboard path, visible focus ring, no hijacked browser shortcuts |
| Minimise time-boxed UI; prefer dismissing with an explicit action | n/a | Toasts that carry an action or error don't auto-dismiss; informational toasts stay long enough to read and pause on hover or focus |
| Confirm actions that are hard to recover from | n/a | `DiscardDialog` for unsaved work; destructive actions confirm and name the consequence |
| Be cautious with fast-moving and blinking animation; honour Reduce Motion | n/a | See `motion-gsap.md` |

Under Reduce Motion, HIG says to reduce automatic and repetitive animation, including zooming, scaling and peripheral
motion; tighten springs; replace x, y and z transitions with fades; avoid animating depth and blur.

## Typography

HIG iOS Dynamic Type, Large (default) size:

| Style | Size/leading (pt) | Weight | Closest NEVORA role |
|---|---|---|---|
| Large Title | 34/41 | Regular (Bold emphasised) | display 30/36 |
| Title 1 | 28/34 | Regular | display 30/36 |
| Title 2 | 22/28 | Regular | figure 24/30 |
| Title 3 | 20/25 | Regular | title 20/26 |
| Headline | 17/22 | Semibold | title-sm 17/22 |
| Body | 17/22 | Regular | body 15.5/22 |
| Callout | 16/21 | Regular | body 15.5/22 |
| Subhead | 15/20 | Regular | body-sm 14.5/20 |
| Footnote | 13/18 | Regular | meta 13.5/18 |
| Caption 1 | 12/16 | Regular | caption 12.5/16 |
| Caption 2 | 11/13 | Regular | (none; NEVORA floor is 12) |

Rules applied:

- Avoid light weights (Ultralight, Thin, Light). NEVORA uses 400–700.
- Convey hierarchy with weight, size and colour, and keep it when text size changes.
- Minimise the number of typefaces: Inter for interface, JetBrains Mono for codes only.
- Custom fonts must support the same accessibility behaviours as system fonts: rem sizing, no fixed line boxes, no
  truncation of meaningful text at large sizes.
- Increase meaningful icon size with text size where icons carry information.
- At large text sizes, stack inline items (glyphs, timestamps) under the text rather than truncate.

**Open question for Jose:** Direction B's body role is 15.5px, below HIG's 17pt default body (it is above the 11pt
minimum, so it passes the floor). The older kit (`kit.css`) uses 17px body on phones. Don't change it without a design
decision; note it in audits of reading-heavy screens.

## Colour

- Don't use one colour for different meanings. Teal is interactive and information; it is never decorative body text.
- Don't rely on colour alone (see Accessibility).
- Test colours in bright and dim conditions; check contrast in every surface the colour sits on.
- Consider cultural meaning: red stops, amber waits, green is done. Pair each with words.
- Keep resting-state legibility where content scrolls under controls (the sticky band strip and tab bar).
- NEVORA is light only, so HIG's dark-appearance checks don't apply until DESIGN.MD adds a dark theme. Do support
  `prefers-contrast: more` and Windows forced colours where a component relies on a tint for its shape (hence the
  `--b-*-edge` hairlines).

## Motion

- Add motion purposefully; never for its own sake.
- Make motion optional: never the only way to communicate information.
- Feedback motion follows the gesture and the person's expectation (a sheet that came up goes down).
- Keep feedback animation brief and precise.
- Avoid adding motion to interactions that happen often.
- Let people cancel motion; never make them wait for an animation to finish before acting.
