# NEVORA Add Location redesign

Implemented locally on October 12, 2026. This deliverable covers `/app/settings/locations/new`.

## Preview and images

- [Local preview with fictional data](http://127.0.0.1:3231/app/settings/locations/new)
- [Desktop](desktop.jpg), [mobile](mobile.jpg), [tablet](tablet.jpg)
- [Mobile expanded Clocker fields](mobile-expanded.jpg), [mobile success](mobile-success.jpg), [mobile validation error](mobile-error.jpg), [unconfirmed save](mobile-unconfirmed.jpg)
- [Recorded browser checks](browser-verification.json)
- [Complete binary patch](nevora-add-location.patch)
- [Change bundle](nevora-add-location-changes.zip)
- [Approved design reference used](DESIGN.MD)

The preview bundles the actual page, form, shell, icons, fonts and styles. Authorization and Next.js framework adapters are mocked, and creation responses come from an in-memory loopback fixture. It makes no database calls. Links to other NEVORA pages retain their actual destinations, but those destinations are outside this isolated preview. Creation in the application remains wired to the existing `createLocationAction`.

## What changed

The page uses the approved orange portal palette, Inter, charcoal navigation, neutral surfaces, 18px cards and polished 17px action controls. A two-column desktop layout places the form beside a live location-name preview and concise setup guidance. Mobile prioritizes the same form, then shows a compact preview and the setup guidance below it.

Location name and short name stay required with the existing 160/48 character limits. The optional Clocker key is behind a native keyboard-accessible disclosure with a plus/minus indicator. Its lowercase URL-safe pattern and 64-character limit remain. Help text explains automatic generation and that the key cannot be changed later. Invalid input inside a closed disclosure reopens it before browser validation focuses the input.

Saving disables the fields and actions; a synchronous ref guard prevents overlapping submissions. Validation errors preserve entries and focus feedback. A lost response or empty result says “Save not confirmed” and advises checking Locations before retrying. A confirmed success disables the completed draft, offers Scheduling Rules and Employee Eligibility links, and provides View Locations and Add Another Location actions. Add Another resets the fields and restores input focus.

The existing Owner authorization guard, server mutation proof, validation, database logic, location creation action and edit-location component are retained. No address, map, scheduling policy, employee assignment or database schema was invented for the creation flow. No telemetry or external messaging was introduced.

## Source and integration state

Repository: `https://github.com/JoseK0514/Fuel-Scheduler-.git`.

Base: remote `development`, commit `b58496b84b21690f7be22474f7570da2d81af6c3`, verified with `git ls-remote` during this task. The newer single-company candidate `191fbc3` was inspected but is not the public development branch used as this implementation base.

Isolated checkout: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-31/work/checkout`.

Branch: `codex/nevora-add-location-20261012`. Changes are uncommitted, unpushed, unmerged and undeployed. The desktop worktree tool was attempted but could not attach a projectless chat; a local clone was used to preserve all other active checkouts.

Changed application files:

- `src/app/app/settings/locations/new/page.tsx`
- `src/app/app/settings/locations/new/new-location.css`
- `src/app/app/settings/locations/new/page.test.tsx`
- `src/components/new-location-form.tsx`
- `public/fonts/typeface/inter/variable.ttf` and its `OFL.txt`
- `docs/ui/2026-10-12-add-location.md`

Styles and compatibility tokens are scoped to `.app-shell:has(.add-location-page)`, so other routes do not acquire this palette when navigating away. The existing shared theme can be integrated separately without changing these page contracts. The bundled Inter font is copied from the approved theme assets with its SIL Open Font License. The small storefront drawing reuses the existing navigation icon's visual language and is decorative SVG; it makes no assumption about the location's industry.

Build-generated edits to `tsconfig.json` and `next-env.d.ts` were removed from the change bundle. Dependency manifests and lockfiles were not changed. The patch contains the font as a Git binary patch. Review and apply it with `git apply --check` and `git apply --binary` in the chosen integration checkout. Reconcile the page file with any concurrent Locations redesign before integrating; this task did not change the shared location fields or neighboring pages.

## Verification actually run

Baseline: the original location/settings/action/data tests passed, 17 tests.

Final targeted run passed, 20 tests across:

```text
src/app/app/settings/locations/new/page.test.tsx
src/app/app/settings/actions.test.ts
src/app/app/settings/foundation-pages.test.tsx
src/lib/data/locations.test.ts
```

The new page tests cover Owner-only rendering, denial before mutation, required fields and limits, optional Clocker constraints, correct setup guidance and continued edit-location behavior. Existing action/data tests exercise trusted mutation authority and location transaction/validation behavior with mocks.

Whole-project ESLint passed. Changed-source ESLint passed after the final code change. TypeScript passed. The optimized Next.js 16.3.6 build passed after the final form change and includes the dynamic Add Location route. `git diff --check` passed.

41 recorded checks passed in the Codex in-app browser, using the loopback fixture. They include native validation and focus; keyboard disclosure; reopening an invalid hidden Clocker field; live preview; disabled pending controls; confirmed success; Add Another reset/focus; preserved validation errors; network and empty-result feedback; mobile keyboard submission with a custom key; visible focus; retained mobile Settings navigation; and layout/title checks at 320, 375, 390, 768, 1024 and 1440 pixels. The fixture request log after a desktop double click contained exactly one request with `name`, `shortName` and an empty optional key.

Measured primary-button contrast: 6.01:1. Helper text on white: 7.56:1. Mobile inputs render at 16px and action targets are at least 44px. Maximum-length unbroken names did not cause horizontal overflow. The reduced-motion media rule was observed in the loaded stylesheet; the OS preference was not changed.

The preview initially needed a Next Image adapter correction (`process is not defined` in the standalone bundle). That fixture-only error was fixed before the UI scenarios; it was not a production build failure.

## Limits and remaining integration checks

Authenticated database-backed creation, persistence and cross-page navigation were not exercised end to end. Native iOS/Android keyboard behavior and Safari were not tested. The browser fixture does not certify server authorization or database persistence; the authorization/action/data evidence comes from the targeted tests and unchanged source contracts. Independent audit closure and production readiness are not claimed.

`npm ci --ignore-scripts` installed the exact lockfile and reported six high-severity dependency audit findings. Those dependencies are inherited from development and were not upgraded in this bounded redesign. Next.js also reported an unrelated home-directory lockfile outside the repository; the build still passed. Neither finding was suppressed.

Product/experience position: GO for the requested bounded creation-flow redesign. Engineering position: preserve the action/data boundary and integrate the small isolated route change. Security position: Owner checks and mutation proofs remain enforced by the existing server path. Governance recommendation: GO WITH CONDITIONS for integration; release impact CONDITION. No policy exception or production authorization is claimed.

Owner of this local implementation: this Add Locations chat. Next gate: visual review and integration into the selected NEVORA development assembly, followed by a disposable authenticated creation/persistence check and the assembly's release review. No user action is required to use the local preview; deployment requires a separate explicit request.

## Research and design decisions

The requested Mobbin research came first. [Square](https://mobbin.com/screens/93ba7bf7-faa4-4c51-878d-3a15cbea5c64) provided compact business details and field-adjacent validation; [Swiggy](https://mobbin.com/screens/6e85373c-2a46-4195-99ca-77057bb0bd4a) provided grouped mobile location details and a clear save action. Their address features were not added because NEVORA's creation contract has no address field.

The `21st` MCP search presented [Account Settings Fieldset](https://21st.dev/@cnippet-dev/components/v-fieldset-7), [Input Form](https://21st.dev/@uiable/components/input-form) and [Animated Tabs](https://21st.dev/@ibelick/components/animated-tabs). The fieldset hierarchy was the useful reference. No paid component code retrieval, copied component code or new library was needed.

The approved reference was found through the “Find redesigned NEVORA pages” chat and the consolidated design copy at `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-21/work/profile-checkout/DESIGN.MD`. It specifies orange for the portal and scopes blue/cyan to authentication. It also specifies Inter, existing compact workforce structure and motion, and prohibits forcing marketing dimensions or scroll pinning onto operational screens.

The requested gpt-taste and mobbin-design skills contributed hierarchy, whitespace, contrast and restraint. The recorded deterministic reference RNG used normalized request length 1294: Artistic Asymmetry, Cabinet Grotesk; inline images/marquee/carousel; text reveal/card stacking. Those marketing suggestions were adapted under the explicit NEVORA design constraints: no cinematic hero, marquee, carousel, pinned section, new GSAP dependency or alternate font. Existing 140ms interaction transitions and a reduced-motion override fit this form's purpose.

Current official React documentation was consulted through Context7 for form handling, FormData and intentional DOM focus. Relevant existing Superpowers, browser smoke and NEVORA product/engineering/security/delivery/experience/governance instructions were read and applied to this bounded local change.
