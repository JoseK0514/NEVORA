# Coordinator compatibility refresh — validation in progress

Local candidate **`25dca8de105a9abd2a94bcd459ca3688eecfcb15`** merges coordinator `8c4264cf1d8522f63a462184cfb660c10edbd64b` into published `0e010464aeb5f532981ac6071c48e1527e9419db`. The merge is clean. It restores the `useHoldHeight` API expected by the already-integrated Wave A availability list while preserving the coordinator's newer `HoldHeight` component. No candidate-only UI repair was authored here. `portal-premium.css` still equals the latest coordinator blob `ecf0761a040924f1613ce1237c6168dbba035c07` exactly.

## Current gates

- `npm ci`: pass, 410 locked packages.
- `npx tsc --noEmit -p .`: pass. The earlier missing-export error on `0e01046` is absent on this SHA; this is technical revalidation, not independent audit closure.
- Full `npm run lint`: pass, 0 errors and 0 warnings. The separately committed confirmation cleanup `9df0f47` remains intact; the unpublished backend-first alternative `2fafc1a` was not overlaid on it.
- Full Vitest completed with **one worker and unchanged timeouts**: **7,282 passed / 5 failed / 801 skipped / 55 pending** (8,143 total). One process-observation rejection-reason assertion and four 5-second tenancy timeouts failed; all five are retained in evidence/failed-tests.json. No missing-hook failure remains. This is the unpublished coordinator-only intermediate, not the backend-integrated or published candidate.
- Browser/combined revalidation of Availability plus Home, Inbox and More for all roles is next. Broader source-chat exits remain open; no zero verdict.

## Historical backend retry: aborted before the owner prescription was read

Input branches: `codex/release-candidate` at `25dca8d` versus `codex/premium-backend` at `1c8254ae3016673e897f38004094a0784f3b18a3` (application inputs unchanged from `31ec698`). Git conflicts in `src/app/app/schedule/coverage/page.test.tsx` and `src/app/layout.tsx`. The coordinator has already supplied the exact root-layout resolution in its `RESOLVED-src-app-layout.tsx.txt`; the Coverage test remains unchosen, so the entire backend retry was aborted. The candidate remains clean at `25dca8d`.

Both Coverage sides are in `conflicts/coverage-candidate.txt` and `conflicts/coverage-backend.txt`: candidate expects “1 more needed”, “1 more person needed”, “Choose what to fill”; backend expects “1 needed”, “1 employees needed”, “Choose the requirement”. Owner: backend / Wave A / coordinator. This task will not select a screen wording or change an assertion to make the merge pass.

## Other branch custody

- Another authorized release task replaced the old rehearsal with `0e01046` while the separate backend-first build was being tested. That newer published candidate was preserved. Its exact old tip and histories remain under `release/bootstrap/rehearsal/`, including a verified Git bundle.
- Backend-first snapshot `2fafc1a` remains local on `codex/rolling-backend-first-2fafc1a`; its tests and 144-cell diagnostics are historical evidence, not this candidate's gates. Its exact-lease push was rejected and did not overwrite the concurrent publication.
- Wave A has pushed `7679133`, but it has no completed new zero exit. It is not merged here merely because it fixes earlier findings. Profile and Wave C are also not merged, so the initial-profile read and dead-CSS edits remain gated.
- All source branches remain read only. Reports preserve the other inspection session's open findings and pinned round targets. No main/Claude branch merge, deploy, tunnel, notification delivery or phone-access change occurred. Device access remains the proposal in STATUS.md awaiting Jose.

## Later source-owner resolution and verification role

Wave A `7679133` ROUND.md explicitly says to take Wave A's Coverage test. Its blob `18e3861` is byte-identical to this candidate's existing test, so it gives a prescribed resolution without importing the new Wave A UI commit. Together with the coordinator's root-layout file this clears both recorded choices. The later local backend verification snapshot is `bf6c030`, tree `4553beec8ab73db129d9d3d1c74d99636148ddcc`, in `release/merge-3-backend/`.

Another active release task prepares publication at its own `98b037b`. To avoid a second writer and repeated branch races, this task is verifying the integration and preserving snapshots; it has not overwritten the published `0e01046`. The optional role clarification has no reply; verification is the stated default, not new permission for deployment or exposure. Later coordinator commits are tracked by the publisher and are not silently included in these frozen results.
