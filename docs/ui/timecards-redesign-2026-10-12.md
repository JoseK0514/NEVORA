# NEVORA Timecards redesign

Implemented in the isolated branch `codex/nevora-timecards-redesign-20261012` from `ba5ed01716745ae4abad29fe63693a3be7f6cbfd` (the clean consolidated timecards successor). The existing `DESIGN.MD` portal rules govern colors, typography, controls, navigation, and motion.

## Result

- A compact date-range panel and protected period overview.
- Expandable batch review that opens after selection and retains explicit confirmation, per-card outcomes, and original-command recovery.
- Clear employee identity, state, recorded time, separate break time, and issue guidance.
- Native entry and history disclosures, visible keyboard focus, and responsive controls.
- A restrained GSAP heading entrance that respects reduced motion and finishes when the document is hidden.

Server authorization, projection, API contracts, command identity, deadline handling, and mutation logic were retained. The added overview is gated by the same current-actor snapshot; its regression assertion verifies that counts disappear immediately when the actor changes.

## Evidence and handoff

The durable review package is at `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-16/outputs/README.md`. It contains research references, component options, patch location, browser evidence, exact checks, and preview limitations.

Validation: 44 targeted timecards tests passed, targeted ESLint passed, TypeScript passed, production build passed, and whitespace check passed. Browser checks used the actual redesigned components and AppShell with fictional transport, including manager/employee views, seven viewport widths, keyboard entry/history disclosures, individual approval/finalization/reopening, batch approval/finalization, and loading/error/empty states. Production authentication and database behavior were not exercised by this UI fixture.

No commit, push, merge, or deployment was performed. Integration into the shared development line remains a separate step.
