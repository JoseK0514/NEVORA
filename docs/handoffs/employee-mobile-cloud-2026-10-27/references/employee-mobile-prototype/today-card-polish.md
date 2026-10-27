# Hours: Today-card refinement

Changed only the Employee prototype Hours card. The dedicated Today/date header uses existing teal-wash and teal-press tokens. Status and Clocker guidance remain on white below it. No new icons, colors, actions, permissions, phone punching, or features were added.

Current artifact SHA-256: `d945a7cdc9aeec179732690d4c4f426cc51bed4adbfe000eefb6162451566fa4`. Saved and served bytes match.

## Verification

- TypeScript strict compile and React/esbuild build pass.
- Existing38 scenarios pass in Chromium, WebKit and Firefox on this artifact.
- Focused9 checks pass in each engine: semantic Today/date/status structure; read-only card;320/390/430/884px layouts;200% text at320/390px with guidance reachable by scrolling; empty state; no runtime errors.
- Eight delivered images and14 flow captures refreshed; raster origin and SHA-256 verified.
- Rendered320/390px phone layouts and enlarged-text captures inspected. The user’s IAB Hours screen was also checked.
- Today/date contrast: 7.93:1. Body colors and typography reuse existing tokens.
- Impeccable’s changed-CSS hook found0deterministic issues. No new independent visual/gate review was commissioned for this narrow refinement.

The first focused Firefox measurement compared inline time text with clientWidth, which is0for that inline element in Firefox. The corrected test checks its rendered rectangle and scroll width; the same no-clipping assertion remains. No UI change or reduced product assertion was used to make it pass.

## Scope and remaining work

The [desktop parity inventory](desktop-parity-audit.md) still applies. This refinement adds no feature coverage. This is fictional local sample data; production integration and server authorization are unchanged. No Git branch, commit, PR or deployment exists for this projectless prototype.

Impeccable context flags the existing older PRODUCT.md schema and DESIGN.md/sidecar drift. Its `init` and `document` commands own those record refreshes; they were not run as a side effect of polishing this card.

[Hours screenshot](hours.png) · [Prototype](index.html?page=hours) · [Detailed checks](checks.json)
