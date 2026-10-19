# Wave C · round 3 · widths, roles and consistency

**Not zero: 0 verified P0, 1 verified P1, 0 verified P2 so far.** This is an interim report on `b109ec3fea10418fb9f5c9da2af0a1e561dc2678`. The first automated batch covers Branding at all eight widths, all four text sizes, Chromium and WebKit (64 cells). The rest of the matrix, axe batches, remaining re-checks and state coverage are still in progress. This is not an exit verdict.

## Status of earlier findings

| ID | Status | Measurement |
|---|---|---|
| WR-21 | **Not fixed · P1** | At 390×844, 100% text, the color picker remains a white 64×48 box in Chromium and WebKit, although its value is `#077572`. Both native-input crops contain **0 pixels** of that color. Chromium at 200% is also white (64×96). |

## Findings, worst first

| ID | Screen · role · width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| WR-21 (existing) | Branding · Owner QAOWNER · 390, 100% and 200% · Chromium; 390, 100% · WebKit | `input#brand-picker.wc-colour` | The selected color is invisible: white well, value `#077572`, **0 teal pixels** in each 100% crop. A browser-only `height:3rem` override restores **1,528 teal pixels**, while the outer box remains exactly **64×48** and padding remains **8px 4px**. | `crops/WR-21-chromium-390-context.png`, `crops/WR-21-webkit-390-context.png`; controlled browser proof `crops/WR-21-height-only-browser-proof-390.png` | `src/app/app/premium-wave-c.css:349` sets `height:3rem`, but the more specific shared rule at `src/app/app/portal-premium.css:882` wins with `height:auto`; the color input’s inner swatch collapses. | Make the color input’s **definite `height:3rem`** outrank that shared rule, e.g. a scoped `height:3rem !important` on `input.wc-colour` (or an inline height). Keep width **64px**. This was verified only as a temporary browser style; no source was changed. | **P1** |

## Checked and correct

- Color well outer geometry is 64×48 at 100%, 64×96 at 200%; the defect is its missing color fill.
- Hex field shows `#077572`; the temporary height change alters neither the value nor the outer well position.
- Branding’s 64-cell automated batch reports no page overflow or undersized targets. Its nonzero flags are the already assigned desktop sidebar text and one first-load timeout; that timeout is awaiting its single retry.

## Gaps

- WR-11, WR-13, WR-22, WR-23 and WR-24 have not yet been re-checked. Their earlier closure has not been assumed.
- Remaining routes and roles, axe at 390/1440, submission states and the rest of the five-area round are pending.
- The shared sidebar labels (12px) and platform credit (10px) are recorded for the shell owner and excluded from Wave C’s count.
- Native keyboard checks and Jose’s physical-device pass remain on the Mac.

Open verified P0–P2 in widths and roles so far: **1**. Round incomplete.
