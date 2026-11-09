# Workspace settings redesign evidence

Owner: this workspace-settings implementation chat. Date: October 12, 2026, America/Puerto_Rico.

The `/app/settings/workspace` redesign preserves the existing two-field configuration contract and Owner-only access. It adds grouped identity/timezone fields, an understandable protected-timezone state, a keyboard-operable explanation disclosure, read-only workweek context, Phosphor icons, local Inter, route-scoped DESIGN.MD tokens, and equal mobile/desktop control sizing. Save Workspace, Cancel and Back retain their existing behavior. Related navigation uses the existing Locations route.

Baseline: `191fbc38e68d70c2dfe0809dffbdb63eb962b1b7`, the single-company development candidate identified in the redesign inventory. Branch: `codex/nevora-workspace-settings-20261012`. Other active worktrees and the shared development checkout were preserved.

Verification: 28 focused tests; 2,134 full default tests; ESLint; TypeScript; Next.js build; and 34 Chromium/WebKit checks with real native login, server actions and fictional owned PostgreSQL. The final browser run had zero runtime errors and zero external HTTP requests. Viewports ranged from 320 to 1440px. Server-side name/timezone validation, pending duplicate prevention, network-failure draft retention, operational-record timezone locking, protected name edits, keyboard controls, reduced motion and non-Owner denial were observed.

The restricted full-suite run's socket-dependent cleanup failure was reproduced on the unchanged baseline and resolved by running the complete suite with local sockets enabled. WebKit's universal-interception save artifact was reproduced on the unchanged baseline. Normal baseline and redesigned saves were error-free; the final harness retained all assertions and used interception only for intentional failure injection.

Full source custody, reference research, screenshots, reports, logs, commit identity and release limits are recorded in `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-29/outputs/README.md` and its linked evidence.

No database migration, policy change, external delivery, production mutation, push, merge or deployment occurred. Local completion supports review and integration; it does not close an independent release audit. Reviewers should use the source manifest and candidate commit and reconcile against the chosen current development line before integration.

Design-hook triage: Inter is explicitly specified in the approved DESIGN.MD portal typography. `.impeccable/config.json` records only the `overused-font=inter` exception and its evidence. No broad rule/file ignore was added. The targeted stylesheet detector returned no findings. This changes detector configuration only; the UI remains the previously verified source.
