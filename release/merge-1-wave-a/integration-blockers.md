# Wave A rolling integration — blocked, verification in progress

Inputs: coordinator `a69dff2b8370c6c52d1d781c91159fc796577726`, Wave A `c05e0c7cd703fbf19e05e60bb4d488e1d9b19bb0`, backend `31ec6988446607651031c6412b2c9f4c8ccce402` (attempted, not merged). Wave A merge commit: `88a4e94`. Candidate-only lint cleanup: `9df0f47`.

Jose explicitly requested the Wave A merge. It is recorded as an integration with open gates, not as a successful exit round. Wave A's `ROUND.md` requests exit round 2; it does not say `status: zero`. The other chat branches have not been admitted without zero exit evidence.

## Blockers for source owners

| ID | Owner | Evidence | Required action |
| --- | --- | --- | --- |
| RC-WA-IS-01 (P0) | Wave A + coordinator | `npm run typecheck` fails TS2724 at `src/components/availability-team-list.tsx:7`; call at line 44. Wave A expects `useHoldHeight`; the coordinator replaced that API with the `HoldHeight` component. Both versions typecheck separately only if confirmed by their own checks; no such result is assumed here. | Wave A adapts its availability-list hold to the current shared-kit API, coordinated with Phase 3, and pushes a new inspected commit. Preserve the coordinator's synchronous hold behavior. No unauthorized candidate UI repair. |
| RC-BE-CONFLICT-01 | Backend + coordinator | `git merge --no-commit --no-ff origin/codex/premium-backend` conflicts in `src/app/layout.tsx`. Retried from `a69dff2`; merge aborted. Complete sides in `conflicts/`. | Coordinator resolves the async layout / development error-hook seam on its branch or gives the backend chat a resolution. |

## Resolution custody

- Swap summary and test come from Wave A; no conflict remained.
- `src/app/app/portal-premium.css` exactly equals the latest fetched coordinator version (`a69dff2`), including when other branches carry older copies.
- No `INBOX_COUNT_ENDPOINT_READY` work: the flag is retired.
- The approved manual document is `docs/product/specs/codex-joint/DEVICE-CHECKLIST-REVIEWED.md` from `a69dff2` (blob `8dbc2ccec4e0200d66175840395e32992121ca95`). Device results remain pending; access awaits Jose's separate approval.
- Earlier rehearsal evidence remains in `release/bootstrap/rehearsal/`. The replaced remote rehearsal head is `bec0ed4e64be7a4db3351973e1dc9993eeb90e8b`.

## Authorized post-merge items

Lint cleanup `9df0f47` captures the stable numeric generation ref object inside the effect and uses the same object for event invalidation and cleanup. It retains the increment behavior and does not snapshot the counter value. Full lint/tests/checks are being rerun. No additional test mirrors this mechanical alias change.

Profile initial data waits for the Profile and backend merges. Dead `.settings-hub*` CSS removal waits for Wave C and the required class-use search. No UI edits beyond the explicitly listed lint cleanup were made.

## Release impact

BLOCKER / NO-GO pending the missing backend integration, source fix, complete browser/combined evidence and remaining zero exit rounds. No deployment, preview publication or tunnel. Local loopback previews use owned disposable PostgreSQL and fictional data only; outbound delivery remains disabled.
