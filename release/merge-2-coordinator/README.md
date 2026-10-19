# Coordinator compatibility refresh — validation in progress

Local candidate **`25dca8de105a9abd2a94bcd459ca3688eecfcb15`** merges coordinator `8c4264cf1d8522f63a462184cfb660c10edbd64b` into published `0e010464aeb5f532981ac6071c48e1527e9419db`. The merge is clean. It restores the `useHoldHeight` API expected by the already-integrated Wave A availability list while preserving the coordinator's newer `HoldHeight` component. No candidate-only UI repair was authored here. `portal-premium.css` still equals the latest coordinator blob `ecf0761a040924f1613ce1237c6168dbba035c07` exactly.

## Current gates

- `npm ci`: pass, 410 locked packages.
- `npx tsc --noEmit -p .`: pass. The earlier missing-export error on `0e01046` is absent on this SHA; this is technical revalidation, not independent audit closure.
- Full `npm run lint`: pass, 0 errors and 0 warnings. The separately committed confirmation cleanup `9df0f47` remains intact; the unpublished backend-first alternative `2fafc1a` was not overlaid on it.
- Full Vitest is running with **one worker and unchanged timeouts**, after closing browser previews. This rerun follows the earlier failed two-worker runs. Its result will be reported on this exact source.
- Browser/combined revalidation of Availability plus Home, Inbox and More for all roles is next. Broader source-chat exits remain open; no zero verdict.

## Backend retry: aborted without a choice

Input branches: `codex/release-candidate` at `25dca8d` versus `codex/premium-backend` at `1c8254ae3016673e897f38004094a0784f3b18a3` (application inputs unchanged from `31ec698`). Git conflicts in `src/app/app/schedule/coverage/page.test.tsx` and `src/app/layout.tsx`. The coordinator has already supplied the exact root-layout resolution in its `RESOLVED-src-app-layout.tsx.txt`; the Coverage test remains unchosen, so the entire backend retry was aborted. The candidate remains clean at `25dca8d`.

Both Coverage sides are in `conflicts/coverage-candidate.txt` and `conflicts/coverage-backend.txt`: candidate expects “1 more needed”, “1 more person needed”, “Choose what to fill”; backend expects “1 needed”, “1 employees needed”, “Choose the requirement”. Owner: backend / Wave A / coordinator. This task will not select a screen wording or change an assertion to make the merge pass.

## Other branch custody

- Another authorized release task replaced the old rehearsal with `0e01046` while the separate backend-first build was being tested. That newer published candidate was preserved. Its exact old tip and histories remain under `release/bootstrap/rehearsal/`, including a verified Git bundle.
- Backend-first snapshot `2fafc1a` remains local on `codex/rolling-backend-first-2fafc1a`; its tests and 144-cell diagnostics are historical evidence, not this candidate's gates. Its exact-lease push was rejected and did not overwrite the concurrent publication.
- Wave A has pushed `7679133`, but it has no completed new zero exit. It is not merged here merely because it fixes earlier findings. Profile and Wave C are also not merged, so the initial-profile read and dead-CSS edits remain gated.
- All source branches remain read only. Reports preserve the other inspection session's open findings and pinned round targets. No main/Claude branch merge, deploy, tunnel, notification delivery or phone-access change occurred. Device access remains the proposal in STATUS.md awaiting Jose.
