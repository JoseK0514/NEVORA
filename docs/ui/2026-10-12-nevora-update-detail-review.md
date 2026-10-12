# NEVORA Update Detail / Acknowledgement

## Scope and source

The Update Detail view at `/app/updates/[id]` now uses the approved NEVORA typography, coral identity, white surfaces, and mobile shell. Implementation is isolated on `codex/nevora-update-detail-20261012`, based on `e39803a69e50361f6a0dcc696ee294ccaad243b8` from `codex/central-cfr-carry-forward-20261011`.

Source: `2026-10-11/coo-2/work/central-cfr-green-successor`. The inspected single-company successor at `8950786c898fcb137ff6bbb8c58bf3508f4146f3` does not contain the Updates feature. This change applies to the consolidated source that actually contains the route, communications contracts, and approved `DESIGN.MD`. Moving it to a successor without that feature requires separate integration of the existing communications module.

## Design decisions

- Content precedes the review action. The full escaped plain-text message, sender, publication time, edited version, and expiry remain visible.
- Required acknowledgement retains an explicit review checkbox and version-specific receipt. Acknowledgement means receipt, not agreement or attendance. Informational updates retain Mark read.
- Manager recipient status uses a native disclosure to reduce initial density. Edit and Withdraw remain available under their existing permissions.
- Loading, unavailable, withdrawn, access-changed, paused, version-conflict, and unknown-result states give a clear next step. Private content is removed when the resource cannot be trusted.
- The page uses existing Inter/JetBrains Mono, coral and semantic tokens, Phosphor icons, 48-pixel action targets, visible keyboard focus, and a single-column mobile layout. CSS is scoped to `.communication-detail-view`.
- Success feedback animates only the receipt icon for 200 milliseconds through the existing GSAP dependency. Reduced-motion preference disables that animation and control transitions.

The user-requested gpt-taste and mobbin-design skills informed hierarchy and motion. Their generic marketing patterns were adapted to a functional employee update page; the approved application design takes precedence.

## Research

Mobbin research used these references for the reading hierarchy and focused action:

- [Ro message detail](https://mobbin.com/screens/3a5bdd3c-4e3c-41f3-a261-06c93b3ed47e): clear sender context and complete message.
- [Gumloop update panel](https://mobbin.com/screens/94219d6e-2f30-4058-a5d0-8f46aef85491): focused content and action hierarchy.

The `21st` MCP component searches returned these options, shown to the user:

- [OriginUI Button](https://21st.dev/@originui/components/button): compact button treatment.
- [Loading Button](https://21st.dev/@ddoemonn/components/loading-button): stable action label and pending state.
- [shadcn Accordion](https://21st.dev/@shadcn/components/accordion): disclosure pattern for recipient status.

The patterns were adapted using existing dependencies and native HTML. No external component source or new package was installed.

## Files and behavior boundaries

Product changes are limited to `src/components/communication-detail.tsx`, new `src/components/communication-detail.css`, and `src/components/communication-detail.test.tsx`. This document records the handoff.

The existing request hook, resource lifecycle, operation IDs, authority proofs, content hashes, revision checks, and server authorization remain in place. No API, database, notification, or delivery behavior was changed. Back navigation now explicitly returns to All updates.

## Validation

- Before change: four focused Vitest files, 23 tests passed.
- After change: `vitest run src/components/communication-detail.test.tsx src/lib/communications/recovery.test.ts src/lib/communications/policy.test.ts src/lib/communications/validation.test.ts`: four files, 28 tests passed.
- Targeted ESLint on the modified TSX files passed.
- `tsc --noEmit` passed.
- `npm run build` passed with Next.js 16.3.8. The build also ran TypeScript checks and generated the application routes.
- `git diff --check` passed.
- Browser verification used the actual `CommunicationDetailView` and `AppShell`, with fictional data and local action callbacks. All 36 recorded checks passed. The console contained no warnings or errors.
- Required and long-content layouts were checked at widths 320, 375, 390, 430, 768, 1024, and 1440. No document overflow or out-of-bounds content was observed; all measured action buttons were at least 44 pixels tall.
- Keyboard Space toggled review and the native recipient disclosure. Tab reached the acknowledgement action with a visible focus outline, clear of the mobile shell.
- Rendered active text in the required state met WCAG AA contrast. The active coral action measured 6.01:1; the warning status measured 5.22:1. The disabled acknowledgement was also observed using a neutral surface after correcting a shared-theme specificity conflict.

This is component/browser fixture verification, not authenticated database persistence or production verification. The fixture substitutes Next navigation/image and sign-out/device adapters and labels its sample data. No real acknowledgement, order, message, customer record, or notification was created. Verification was performed in the Codex In-app Browser; a separate physical-device or second-engine run was not performed. LSP was unavailable; ESLint, TypeScript, and the build provided code diagnostics without suppression.

## Review and integration

The output package includes an interactive local preview, desktop/mobile screenshots, QA JSON, a patch, and changed source files. The branch remains uncommitted and has not been pushed, merged, or deployed. Review the page in the preview's State selector before integrating into the consolidated development line. For rollback before commit, restore only these task-owned files or reverse the supplied patch; do not reset unrelated work.
