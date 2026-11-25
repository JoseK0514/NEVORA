# Kit: a saving button stays Solid teal; buttons don't move under reduced motion (Nov 25, 2026)

Work on `claude-codex-collab-nevora-kit-final`, after merging `origin/claude-codex-collab-nevora` at `93dba5e3` (`17a28ddc`).

| Commit | What |
|---|---|
| `9927049d` | A busy (saving) button keeps its Solid teal look: the disabled grey rules skip it |
| `952cb906` | Under reduced motion a button transitions colour only (no scale, no transform) |
| `0941ee61` | The shared disabled pair (b-foundation, Phase 9, `!important`) also skips a button showing its busy label |
| `8ea78771` | A busy button stays fully opaque (the older portal sheet fades disabled buttons to .55) |

The last two were found by the captures below: after `9927049d` the Settings save was still grey, then pale.

## What "busy" means
- **On the button:** `aria-busy="true"` (BButton `busy`, the Clocker locations save, `recovery-submit.tsx`).
- **Or its busy label is showing:** BBusyLabel's `.b-busy__on` without `data-b-off`, or Settings' `ButtonLabel`
  `.wc-swap[data-state="pending"]`.

The second marker is needed because several forms set `disabled={pending}` on the button and put `aria-busy` on the
form, not the button (Edit location, New location, Clocker tablets, Settings forms).

## What changed
- **Fix 1, busy buttons:** every rule that greys a disabled `.b-btn`, `.c-btn`, `.q-btn`, `.q-bs` or `.wc-btn` now skips
  a busy one:
  - kit `owner-b.css`;
  - `b-foundation.css` (the shared disabled pair and the older-class rule);
  - `corp.css`, `owner-b-desktop.css`;
  - Clocker's text button;
  - the Employee time off and availability submit buttons.

  A busy button keeps its fill, ink, the teal shadow, its width, opacity 1, and a progress cursor. A button that really
  is disabled still goes grey.
- **Fix 2, reduced motion:** under `prefers-reduced-motion: reduce`, `.b-btn`, `.c-btn`, `.q-btn`, `.q-bs`, `.wc-btn` and
  `.nv-btn` transition `background-color, color` only. The shared list named `scale`, and `corp.css` adds `transform`.
  No pseudo-element is named, and the reduced-motion guard test passes.

## Captures
Production builds of `93dba5e3` (before) and the fixed tree (after). Owner, fictional data, 390 and 1440. Shots are in
`shots/`, named `owner-<target>-<width>-<before|after>.webp`.

**Method:** each form was made dirty (a box ticked or a field typed into). The button was then put into the component's
own busy render in the page: `disabled` where the component disables it, `aria-busy` where it sets it, and the busy
words shown. It wasn't reached by holding a real save request.

| Target | Button | Before (busy) | After (busy) |
|---|---|---|---|
| Edit location (Settings → Locations, a Settings save), 1440 | `.c-btn`, `disabled` while pending, `ButtonLabel` "Saving…" | grey `#F0F2F3`, grey ink, 120px | **Solid teal `#0B6E69`, white, opacity 1, 120px**, progress cursor |
| Clocker locations sheet (`/app/employees/<id>?edit=clocker`), 390 and 1440 | `.b-btn--teal .clk-save`, `aria-busy`, stays enabled | teal (the component already avoided `disabled` to stay teal) | teal, the same width (324px / 774px), progress cursor |
| Add shift (`/app/schedule/new`), 390 and 1440 | `.c-shift__save` / `.c-shift__submit` | no busy state: a plain form post, the button is never disabled while it saves | unchanged |

**Truly disabled stays grey:** the Clocker sheet's save before anything changes is grey `#F0F2F3`, both before and after.

**Gap:** Edit location at 390. Its save footer appears only once the form is dirty, and my field selector didn't make
the 390 form dirty, so there's no 390 busy capture of that button (`owner-busy-location-390-*` is the page without it).

## Reduced-motion check
Every capture context runs with `reducedMotion: 'reduce'`. Computed `transition-property` on the buttons:
- **Before:** `scale, background-color, color` on `.b-btn` and `.c-btn`.
- **After:** `background-color, color`.

## Checks
- **Test:** `src/app/app/kit-busy-motion.test.ts` covers every busy exclusion, the busy opacity and cursor, and the
  reduced-motion rule. `b-reduced-motion.test.ts` still passes.
- **`tsc --noEmit`:** clean.
- **`oxlint`:** 0 errors.
- **`src/components` + `src/app`:** 4995 of 4995 pass.
