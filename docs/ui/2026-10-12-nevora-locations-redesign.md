# Locations redesign

Scope: `/app/settings/locations`, owned by this chat. Add Location and Edit Location remain native existing routes. No database, authorization, mutation, Clocker-key, or readiness rules change.

Baseline: `e39803a69e50361f6a0dcc696ee294ccaad243b8`, the existing central carry-forward source used by the NEVORA redesigns. Verified descendant of local `origin/development` at `b58496b84b21690f7be22474f7570da2d81af6c3`. Isolated local checkout, branch `codex/nevora-locations-redesign-20261012`. No shared checkout edits.

Design authority: checked-in `DESIGN.MD`, especially Applying this reference to NEVORA. Keep the existing shell, locally bundled Inter/JetBrains Mono, coral `#ED724C`, charcoal labels, `#FAFAFA` canvas, white panels, 18px cards, semantic status colors and Phosphor icons. Its compact workforce direction takes precedence over gpt-taste's marketing spacing, stock photos, font substitution, pinning and unrelated AIDA sections. Finite GSAP heading/icon entrances preserve immediately visible content and dynamically revert for reduced motion.

Seeded exploration: seed 1568; Artistic Asymmetry; Geist; inline typography imagery, feedback carousel, horizontal accordions; card stacking and image scale/fade. Adapted to a compact asymmetric header, existing Inter, task disclosures, icon tiles and finite scale/reveal motion under the explicit design authority. No fabricated media, maps, addresses or testimonials.

## Research and options

- [Shopify locations](https://mobbin.com/screens/e27564de-ddbd-4708-838c-10cbed81217f): location/status grouping and mobile filters.
- [talabat addresses](https://mobbin.com/screens/cdbc9aaa-6aa8-4ae2-9791-f1a5d3d2601a): short-name hierarchy and clear detail navigation.
- [Waymo favourites](https://mobbin.com/screens/e8f39f87-242e-427a-89bf-86bc87a6d198): readable mobile list and recognizable place icons.
- [DoorDash Merchant store](https://mobbin.com/screens/98a6d511-d2a4-4fb7-b216-a65b3d15a0e9): explicit editing action; its address/map workflow is outside NEVORA's data model.
- [21st Preferences Card](https://21st.dev/@ssychui/components/preferences-card), recommended: icon/title/hint grouping and detail affordance.
- [21st Location Card](https://21st.dev/@lavikatiyar/components/location-card), alternative: responsive grouping, with unsuitable stock imagery omitted.
- [21st Empty State](https://21st.dev/@serafimcloud/components/empty-state): explanatory empty state and one task action.

21st metadata search used the named `21st` MCP server. No paid source retrieval or hosted AI generation. References inspire the existing implementation; no marketplace code was imported.

GSAP cleanup and responsive motion were checked against [React usage](https://gsap.com/resources/React/) and [matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/).

## Acceptance and controls

Preserve Owner authorization before reads; include inactive locations and positions; derive readiness with the existing evaluator; show all issue messages; retain permanent Clocker URLs and inactive warnings; retain Add, Edit, Scheduling Rules and Employee Eligibility. Native GET search and status links work without JavaScript and preserve each other's values. Counts derive from loaded data. Do not convert a read failure into an empty directory.

Verify desktop/mobile geometry, long names/keys, 44px controls, keyboard/focus, disclosures, action menu, search/filter/reset, ready/setup/inactive, true empty state, loading, error/retry and reduced motion in the actual local Next application. Only fictional disposable PostgreSQL data may be used; external requests are blocked during browser checks.

Governance: presentation and local read-only filtering; existing server controls preserved. No production release or independent certification is authorized by this task. Final evidence and commit will be recorded in the outputs handoff.

## Retry regression

The owned-browser test reproduced a server-read failure by temporarily renaming the fictional positions table, then restored it and clicked Try again. `reset()` only cleared the boundary and replayed the rejected server result, so recovery failed. The installed Next 16.3.8 `ErrorInfo` contract includes `retry`, which re-fetches server content. The error action now uses that callback, following the [Next error boundary reference](https://nextjs.org/docs/app/api-reference/file-conventions/error). The same real IO scenario is retained as the browser regression, with its failing result in `outputs/retry-before-fix.json` of this chat.

## Progressive search regression

A route-level `loading.tsx` Suspense fallback kept the server directory hidden in Chromium with JavaScript disabled. It was removed in favor of Search's pending button and live status. The native GET navigation remains the source of truth; JavaScript only adds pending feedback. The no-JavaScript search, disclosure and navigation browser regression is retained. Its original failure is recorded in this chat's `outputs/no-javascript-before-fix.json`. Initial navigation uses the browser's native loading feedback.
