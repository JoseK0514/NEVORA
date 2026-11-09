# Clocker device management redesign

This local candidate changes `/app/settings/clocker` and its device manager. It is based on remote development `b58496b84b21690f7be22474f7570da2d81af6c3`, branch `codex/nevora-clocker-devices-20261012`. It is uncommitted, unpushed, unmerged and undeployed.

The route follows the recovered NEVORA DESIGN.MD: orange portal accents, Inter, mono setup codes, Phosphor 2.1.10, neutral surfaces, compact spacing, and restrained reduced-motion-aware interactions. It adds device search/status filters, real-state summaries, actionable setup prompts, an optional setup guide, and focused desktop/mobile layouts. Existing server authority, origin validation, optimistic versions, secret-free DTOs, registration, rename, rotation/reconnection, revocation and expiry behavior remain intact.

Run the focused suite:

```sh
npm test -- src/components/clocker-device-manager.test.tsx src/app/app/settings/clocker/page.test.tsx src/app/app/settings/clocker/actions.test.ts src/app/app/settings/page.test.ts
npm run typecheck
npm run lint
npm run build
```

The native browser command is the existing `scripts/phase-c-clocker-postgres.mjs --ui` runner with an explicit trusted local `NEVORA_TEST_PG_BIN` and external `PHASE_C_EVIDENCE_DIR`. It creates its own disposable loopback cluster and scratch Next runtime, never reusing the application database or credentials. Do not point it at production.

Durable artifacts and exact evidence are in [the task handoff](/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-38/outputs/README.md), [preview checks](/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-38/outputs/browser-verification.json), and [native checks](/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-38/outputs/native-qa-complete/report.json).

The local preview uses fictional data. Native verification proves real local server actions/persistence with a substituted PostgreSQL transport; it does not certify hosted Neon or physical iOS/Android hardware. The initial Location accessible-name regression was fixed and its existing browser check passed. No existing assertions were removed or weakened.

Integration must reconcile the route theme and pinned Phosphor/font assets with concurrent redesign candidates. Styling is scoped to this page; shared setup CSS and neighboring Clocker screens are untouched. The production release decision remains with Jose.

The two final Inter warnings were reviewed against the recovered DESIGN.MD, which explicitly requires Inter. `.impeccable/config.json` records a value-specific `overused-font=Inter` exception only for this route stylesheet. A subsequent detector run returned no findings for that stylesheet. Typography was preserved; no whole rule or file was ignored.
