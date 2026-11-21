# NEVORA design system (Direction B)

This file is an index, not a second source of truth. Values come from `src/app/b-tokens.css` (`--b-*`, Direction B, on
`:root`) and `src/components/kit/kit.css` (`--nv-*`, the shared kit). If a value here differs from those files, the CSS
file is right; update this file.

Light theme only. Dark rules were removed from the B layers in review B1.

## Brand colour palette

| Role | Token | Value | Use |
|---|---|---|---|
| Brand teal | `--b-teal` | #0B6E69 | Primary action, links, focus ring, information status |
| Teal tint | `--b-teal-50` | #E8F3F1 | Selected rows, icon circles, info fills |
| Band | `--b-band` | 160deg #0C726C → #0B6E69 → #08504C | Page title band on every B page |
| Band solid | `--b-band-solid` | #0C726C | Painted under the band so contrast tools read the real pair |
| On band | `--b-on-band` / `--b-on-band-2` | #FFFFFF / white .86 | Titles and figures / sub-lines on the solid band only |
| Ink | `--b-ink` | #111517 | Primary text |
| Ink 2 | `--b-ink2` | #3F464B | Secondary text |
| Grey | `--b-grey` | #6A7176 | Meta text on white |
| Grey on fill | `--b-grey-on-fill` | #5E666B | Meta text on tinted or grey fills |
| Field edge | `--b-field-edge` | #838A8F | Field and switch edges, row chevrons (3:1, WCAG 1.4.11) |
| Line | `--b-line` | #ECEEEF | Dividers |
| Canvas | `--b-canvas` | #F2F5F4 | Page background behind white cards |
| Coral | `--b-coral` | #FF6B5E | The bell's unread dot only |

Status colours have one meaning each. Words carry the meaning; colour is a 6px dot or a small mark, never the only cue.

| Meaning | Ink | Tint | Solid (rings, bars) | Edge |
|---|---|---|---|---|
| Stop (red) | `--b-red` #B42318 | `--b-red-50` | n/a | `--b-red-edge` |
| Wait or check (amber) | `--b-amber` #8A4B00 | `--b-amber-50` | `--b-amber-solid` #B8760F | `--b-amber-edge` |
| Done (green) | `--b-green` #1D6B45 | `--b-green-50` | `--b-green-solid` #239A6D | `--b-green-edge` |
| Information (teal) | `--b-teal` | `--b-teal-50` | `--b-teal` | `--b-teal-edge` |
| Quiet | `--b-ink2` | `--b-quiet` #F0F2F3 | n/a | `--b-quiet-edge` |

Elevation uses one shadow colour, rgb(16 40 38): `--b-elev-1` cards, `--b-elev-2` sheets and menus, `--b-elev-3`
dialogs and dragged items, `--b-elev-glow` the teal primary only.

## Typography

Font pairing: **Inter** for all interface text, **JetBrains Mono** (`--design-font-mono`, `src/app/typeface-theme.css`)
for codes, IDs, PINs and tabular technical values. Both are self-hosted. Use Inter's tabular figures
(`font-variant-numeric: tabular-nums`) for money, hours and times in columns.

Eight type roles in rem, so they follow the reader's text size (Apple HIG Dynamic Type, see `apple-hig.md`):

| Role | Size / line | Typical weight | Use |
|---|---|---|---|
| display | 30/36 | 600 | Band page title |
| figure | 24/30 | 600 | Key figures on glass tiles |
| title | 20/26 | 600 | Card and sheet titles |
| title-sm | 17/22 | 600 | Section headers, row titles |
| body | 15.5/22 | 400–500 | Default text |
| body-sm | 14.5/20 | 400–500 | Secondary row text |
| meta | 13.5/18 | 500 | Timestamps, sub-lines |
| caption | 12.5/16 | 500 | Smallest text role |

Use `font: 600 var(--b-type-title) var(--b-font…)` style shorthands. Counts are 12px/700. Nothing goes below 12px except
the 10.5px tab labels, which always sit under an icon. Hierarchy comes from size and weight steps, not from colour alone.

## Spacing, shape, targets

- Spacing scale (px): 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 (`--b-space-*`). Insets: phone gutter 14, card and row 18,
  wide card 22.
- Radius: card 22, field 14, menu 16, small 10, button 10 (8 at 36px), pill 999 for chips, segments, avatars, search.
- Targets: 44px minimum hit area (`--b-target`), 48px on touch tablets and footer actions (`--b-target-touch`).
- Button heights: 36 compact, 44 regular, 48 band, 52 full width. One teal primary per screen.
- Icons: Phosphor, bold weight in the shell, filled for the current tab. Sizes by role `--b-ic-*`: chip 12, inline 16,
  lead 18, control 20, state 22, tab 24, finish 28.
- Content widths on desktop: work pages up to 1080, reading pages 812, form fields 560.

## Component library

Reuse these before writing new markup. Direction B components live in `src/components/owner-b/b-kit.tsx` and siblings;
the older shared kit is `src/components/kit/kit.tsx`.

| Need | Direction B (`owner-b/`) | Shared kit (`kit/`) |
|---|---|---|
| Page frame and band | `BScreen`, `BHero`, `BLive` | `KitPage`, `Masthead`, `PageBand`, `KitContent` |
| Layout | `BStack`, `BCard`, `BList`, `BRow` | `KitStack`, `Card`, `CardBody`, `Rows`, `Row`, `Tile`, `StatGrid` |
| Actions | `BButton`, `BButtonLink`, `BInk`, `BSeg`, `BSegs`, `BFilters` | `Button`, `IconButton`, `KitLink`, `FilterPills`, `ActionBar` |
| Status and labels | `BChip`, `BStatusText`, `BCount`, `BNote`, `BCallout` | `Status`, `Progress`, `Freshness` |
| Values | `BWhen` | `Money`, `Duration`, `MetaParts` |
| People | `BAvatar`, `BFaces` | `Avatar` |
| Icons | `BIcon`, `BGlyph` (`b-glyphs.tsx`) | n/a |
| Loading | `BSpin`, `BBusyLabel`, `BLoadingScreen`, `BRouteLoading` (`b-loading.tsx`) | n/a |
| Empty, error, done | `BStateScreen`, `BState`, `BDoneMark`, `BRouteError`, `BOffline` | `Toast` |
| Leaving with unsaved work | n/a | `DiscardDialog`, `DiscardGuard`, `FormDiscardGuard` |
| Behaviour helpers | `b-arrival.tsx` | `PressFeedback`, `focus-on-arrival`, `overlay-exit`, `hold-height`, `keep-selected-visible` |

A new component needs: every state (default, hover inside `@media (hover: hover)`, press, focus-visible, disabled,
loading, error, empty), token-only values, a 44px target, a reduced-motion path, and a test beside it.
