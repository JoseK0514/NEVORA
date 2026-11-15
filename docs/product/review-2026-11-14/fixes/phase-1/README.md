# Phase 1: one design system (Nov 15, 2026)

Phase 1 of the Nov 11 plan, built on top of [fix round 1](../README.md). The Direction B stylesheets now read one token set, and every icon draws bold. It sits in the working tree of `claude-codex-collab-nevora` on `ce4de4bc`, together with round 1. **Nothing is committed.**

This is a migration. No screen changed layout, hierarchy or meaning.

## What changed

131 files: 17 stylesheets, 110 components (icon weight only), tests.

| Part | Report | Result |
|---|---|---|
| Tokens | [a-foundation-tokens.md](a-foundation-tokens.md) | Eight type roles in rem with separate size and line-height tokens; a third elevation step; the spacing, radius and motion tokens from round 1 are now read. A test pins every name and value. |
| Owner and Manager desktop and tablet | [b-owner-desktop.md](b-owner-desktop.md) | 409 values moved onto tokens in `owner-b-desktop.css`. |
| Employee and Lead | [c-employee.md](c-employee.md) | Seven stylesheets migrated. |
| Kit, sign-in, kiosk, billing, staff import | [d-kit-signin-kiosk.md](d-kit-signin-kiosk.md) | Sign-in now reads the shared band, pill and focus tokens. The kiosk keeps its large type and keys; colour, radius, shadow and motion read tokens. |
| Icons | [e-icons.md](e-icons.md) | 324 icons moved to bold. None draws regular. A guard test fails if one does. |

## The numbers

Across the Direction B stylesheets:

| Measure | Before | After |
|---|---|---|
| Reads of a `--b-*` token | 1,074 | 3,407 |
| Colour literals | 554 | 321 |
| Icons drawing regular weight | 317 | 0 |
| Distinct corner radii, Owner desktop | 18 | 9 |
| Distinct corner radii, Employee | 23 | 13 |
| Distinct corner radii, kit, sign-in and kiosk | 22 | 13 |
| Spacing on the scale, Owner desktop | 68% | 81% |
| Spacing on the scale, Employee | 43% | 65% |
| Spacing on the scale, kit, sign-in and kiosk | 50% | 58% |

Type: 13px and 15px text folded into the 13.5 and 15.5 roles, and the 19 and 21px line-heights folded where they sat next to a role size. Sizes are in rem now, so a larger default text size in the browser takes effect (inspection finding RA-8).

## How it was checked

| Check | Result |
|---|---|
| Type check, whole project | Clean |
| Unit tests (`vitest run --dir src`, 904 files) | 13,100 pass, 1 fails: the manuals guard, as in round 1 |
| Structure | Each engineer compared selectors, at-rules, layers and `!important` flags before and after: identical, apart from four added `tabular-nums` declarations |
| Browser, real sign-in on fictional local data | Owner (28 routes at 1440 and 390), tablet, Manager, Employee (320, 390, 1440), signed-out pages in both languages, kiosk. No page errors, no horizontal overflow |
| Before and after, 111 full pages | 84 kept their exact height. The rest moved by 1 to 14px, except Schedule (+32px, different fixture data between runs) and Employee Pay at 320px (23px shorter: two chips now fit on one row) |
| Before and after, first screen of each page | Median 0.9% of pixels changed |
| Kiosk end to end | Clock in, breaks, clock out and lockout pass |

One unrelated process test (`phase-e-fork-birth`) failed once while the machine was busy and passed on its own and in the final run.

Screenshots: [after/](after/). Round 1 screenshots for comparison: [../after/](../after/).

## What you will notice

- Icons are heavier on Updates, Insights, Notifications and the older forms. Small bold icons inside 32px circles are the place to look for crowding ([e-icons.md](e-icons.md) lists the files).
- Row titles are half a pixel larger with a 22px line, so a ten-row list is about 10px taller on phones.
- Sidebar links have 14px corners (were 12). Menu items and small controls have 10px (were 8).
- A few chips are 2px narrower or wider.
- The sign-in button's glow is slightly tighter.

## Left for a decision or a later pass

| Item | Why |
|---|---|
| 6px and 10px spacing (about 200 uses) | **Decided Nov 15, 2026: Jose keeps them.** They are half-steps between scale values and stay as literals. Do not snap them to the scale. |
| 12px, 14px and 16px text | You kept these on Nov 11. They remain literals. |
| Third elevation step (`--b-elev-3`) | A proposed value. Nothing uses it yet. |
| Nine duotone icons | Kept as deliberate; turning them bold is one line each. |
| Icons in the preview pages (`/ui-preview`) | 30 left alone; those pages are not part of the product. |
| White button shadow on the band, switch thumbs, a few one-off shadows | No matching token. Listed in the reports. |
| `#0B3B38` and `#08504C` (40 uses) | Dark teals with no token. Worth adding two tokens. |
| The disabled weekly-confirmation button on Employee Schedule | Still uses opacity; fixing it needs a new layered rule. |
| Legacy stylesheets under the Direction B layer (corporate, Quiet, Wave) | Not migrated. They go when each page moves to the Direction B kit. |
| One button, one row and one state component in markup | The legacy classes now look right through the foundation sheet. Replacing the markup (48 `q-btn`, 39 `c-btn`, 40 `q-row` and so on) belongs with that page-by-page move. |
| A lint and count budget in CI | Not built. The token test and the icon guard are the only guards so far. |

Phase 2 (one desktop frame, three content widths) is built: see [../phase-2/README.md](../phase-2/README.md).

## Release sequence

Unchanged. Review and commit on `claude-codex-collab-nevora`, integrate and verify with the backend on development, then promote the exact verified release to main after Jose approves.
