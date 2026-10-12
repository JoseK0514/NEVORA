# NEVORA Edit Location redesign

Implemented locally on October 12, 2026 for `/app/settings/locations/[locationId]`.

## Result and scope

Edit Location now groups the two name fields and availability in one focused editor. Desktop places the stable Clocker link and Scheduling Rules alongside it. Mobile stacks the editor first and gives Save changes a full-width 50px action. The design uses the approved orange portal palette, locally bundled Inter, neutral surfaces, 18px panels, 17px buttons, and regular Phosphor icons.

The saved Clocker availability stays separate from an unsaved active-state choice. Field-adjacent guidance explains that deactivation preserves history and employee eligibility while making the Clocker and new assignments unavailable. The Clocker key remains immutable and has no editable or submitted field. Copying its link reports a confirmed copy or an explicit fallback.

The form captures the existing `id`, `name`, `shortName`, and checkbox contract, retains the 160/48 character limits, and calls the existing `updateLocationAction`. A synchronous ref prevents overlapping submissions. A React transition disables the editor and Cancel during saving. Confirmed success focuses feedback and advances the saved draft. Errors preserve entries. A thrown request or empty response says Save not confirmed and offers Check locations. Further edits clear stale success. JavaScript-dependent saving has explicit noscript guidance.

No action, data-access, authorization, shared configuration field, create-location page, schema, or scheduling policy was changed. Owner checks, session mutation proof, authoritative input validation, and transaction behavior remain in their existing server path. No database credentials, telemetry, customer mutations, or external messaging were used in verification.

The page-specific stylesheet scopes its palette and shell compatibility aliases to `.app-shell:has(.edit-location-page)`. It does not change the portal palette on other routes. GSAP animates the supporting aside by 8px over 0.32 seconds; inputs and actions remain stationary. The animation runs only with no reduced-motion preference and cleans up through `useGSAP` and `matchMedia`. CSS transitions are disabled under reduced motion.

## Reference lock

The approved `DESIGN.MD` was found through the **Find redesigned NEVORA pages** chat at `/Users/josek0514/Documents/Codex/2026-10-11/d/work/reset-access/checkout/DESIGN.MD`. Its portal uses #ED724C, #D8613C, #FAFAFA, #E5E7EB, #111827, #4B5563, #D1D5DB, white elevated panels, and #9F3821 for small links. Its blue/cyan variant is scoped to authentication.

Mobbin research preceded implementation. Actual returned screenshots were inspected:

- [DoorDash Merchant store address editor](https://mobbin.com/screens/98a6d511-d2a4-4fb7-b216-a65b3d15a0e9): focused editor with adjacent context and clearly grouped save/cancel controls.
- [Ro mobile address editor](https://mobbin.com/screens/6e191ba2-ca5a-411d-8f91-5c3a9aff950f): readable field groups and a prominent mobile action.
- [Swiggy location details](https://mobbin.com/screens/6e85373c-2a46-4195-99ca-77057bb0bd4a): clear mobile sections and full-width saving.

Address, map, phone, and location-photo features were not introduced because NEVORA's existing location contract contains none of them.

The `21st` MCP `search_picker` presented these options:

- [Input Form by uiable](https://21st.dev/@uiable/components/input-form): labeled field hierarchy and clear actions.
- [Input by Origin UI](https://21st.dev/@originui/components/input): field/action composition.
- [Button by Origin UI](https://21st.dev/@originui/components/button): polished action grouping.
- [Reshaped Tabs](https://21st.dev/@reshaped/components/reshaped-tabs) and [Origin UI Tabs](https://21st.dev/@originui/components/tabs): alternatives considered; this short form did not need tabs.

No paid component retrieval or copied component implementation was used. The gpt-taste deterministic reference seed 1432 selected Artistic Asymmetry, Satoshi, marquee/inline imagery/horizontal accordion, and text reveal/card stacking. Those marketing defaults were adapted under the explicit NEVORA reference: Inter, a compact editor, no added hero, marquee, carousel, imagery, or scroll-pinned controls. The source uses its existing React/Next boundary and official current React form/ref guidance consulted through Context7.

## Checks actually run

- 24 tests passed across the new edit-page tests, settings actions, location data, ConfigurationForm, and foundation pages. The new route tests cover Owner authorization before data reads, immutable Clocker contract, inactive state, missing location, and data outage versus not-found.
- Source `npm run typecheck` passed before Next generated route types. Changed-source ESLint and `git diff --check` passed.
- 38 recorded checks passed in the Codex in-app browser against the actual page/form/shell, using fictional location data and mocked framework/authorization adapters. Cases include 320/390/768/1024/1440px layouts, keyboard traversal and Space toggle, native required validation, maximum-length names, pending controls, duplicate clicks, success, server error, thrown response, empty response, inactive reactivation, further edits, copy feedback, preserved link destinations, and no final console warnings/errors.
- The duplicate-click fixture record contains exactly one mutation with the existing form contract, and its saved state retains the Clocker key. This is an in-memory test fixture, not proof of authenticated database persistence.
- Enabled action text contrast was measured from rendered styles at 6.008:1. Mobile native input text is 16px; inputs are 52px; mobile actions are 50px; copy and availability targets are 44px.

## Existing build failure and limits

`npm run build -- --webpack` compiled the redesign successfully, then failed on `.next/types/app/api/auth/recovery/route.ts(14,13)` because `src/app/api/auth/recovery/route.ts` exports `recoveryMessage`, which Next rejects as an extra route export. An untouched isolated checkout of the same development commit reproduced the same failure. After that build, source typecheck also reports that generated route-type error. No assertion, source type, lint rule, or build gate was weakened. The recovery API remains outside this task's scope.

The build also reported an ignored home-directory lockfile. The package metadata operation reported five high-severity dependency audit findings; no force upgrade was performed. These need separate dependency review before release.

Physical iOS/Android devices, Safari, OS reduced-motion emulation, authenticated persistence, and cross-page navigation were not exercised. The preview preserves actual link destinations, but those pages are outside its isolated server. No independent release audit or production verification is claimed.

## Source, handoff, and release

Repository: `https://github.com/JoseK0514/Fuel-Scheduler-.git`.

Base: remote development `b58496b84b21690f7be22474f7570da2d81af6c3`, verified with `git ls-remote` during this task. The desktop worktree tool returned Not a git repository for this projectless chat; an isolated local clone was used instead. Other active clones and worktrees were preserved.

Branch: `codex/nevora-edit-location-20261012`. Local edits are uncommitted, unpushed, unmerged, and undeployed.

Checkout: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-32/work/checkout`.

Deliverables and browser records: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-32/outputs`. Reproduce the fictional preview with `node work/preview-server.mjs` from the task directory; it listens only on `127.0.0.1:3232` and loads no database credentials. Application package scripts were read before execution; build/start do not run database migrations. Exact pinned icon/motion dependency metadata is recorded in the lockfile; verification reused existing local modules matching those pinned versions.

Product/experience position: the requested compact editing flow is ready for local visual review. Engineering position: retain the existing server/data boundary and integrate the bounded page component/style/dependency/font patch. Security position: server Owner authorization and mutation proofs are retained. Governance recommendation: GO WITH CONDITIONS for integration, with the existing full-build failure a release BLOCKER. No policy exception or production authorization is claimed. This Edit Location chat owns the local implementation and evidence. The next gate is visual review and integration into the chosen development assembly, followed by authenticated disposable-data persistence checks and a clean application build. No user action is required to open the local preview.
