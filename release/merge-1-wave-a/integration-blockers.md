# Wave A rolling integration — blocked, verification in progress

Inputs: coordinator `a69dff2b8370c6c52d1d781c91159fc796577726`, Wave A `c05e0c7cd703fbf19e05e60bb4d488e1d9b19bb0`, backend `31ec6988446607651031c6412b2c9f4c8ccce402` (attempted, not merged). Wave A merge commit: `88a4e94`. Candidate-only lint cleanup: `9df0f47`. Coordinator refreshed through `f691dec` at merge `d5aa031`, then `e7671e6` at candidate `0e010464aeb5f532981ac6071c48e1527e9419db`; CSS remains exactly the latest coordinator blob.

Jose explicitly requested the Wave A merge. It is recorded as an integration with open gates, not as a successful exit round. Wave A's `ROUND.md` requests exit round 2; it does not say `status: zero`. The other chat branches have not been admitted without zero exit evidence.

## Blockers for source owners

| ID | Owner | Evidence | Required action |
| --- | --- | --- | --- |
| RC-WA-IS-01 (P0) | Wave A + coordinator | `npm run typecheck` fails TS2724 at `src/components/availability-team-list.tsx:7`; call at line 44. Wave A expects `useHoldHeight`; the coordinator replaced that API with the `HoldHeight` component. Both versions typecheck separately only if confirmed by their own checks; no such result is assumed here. | Wave A adapts its availability-list hold to the current shared-kit API, coordinated with Phase 3, and pushes a new inspected commit. Preserve the coordinator's synchronous hold behavior. No unauthorized candidate UI repair. |
| RC-BE-CONFLICT-01 | Backend + Wave A + coordinator | Retrying backend after coordinator `f691dec` conflicts in `src/app/app/schedule/coverage/page.test.tsx`: candidate “1 more needed” / “1 more person needed” / “Choose what to fill”; backend “1 needed” / “1 employees needed” / “Choose the requirement”. Full sides in `conflicts/coverage-test-{candidate,backend}.txt`. Merge aborted. | Source owners reconcile the expectations on their branches. No side chosen. |

## Resolution custody

Claude published the complete root-layout resolution in `docs/product/specs/codex-joint/RESOLVED-src-app-layout.tsx.txt`; it keeps both the async/error hook and text-scale script. This explicit resolution is usable when the rest of the backend merge becomes clean; currently the Coverage test conflict blocks that merge.

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

## Final validation on 0e01046

Locked install passes; lint passes with 0 warnings; TypeScript fails TS2724. Full Vitest: 7,280 passed, 7 failed, 801 skipped, 55 pending (8,143 total). Four failures are the missing hook; three are process-lifecycle assertions, kept as an independent validation blocker. Browser checker: 0/64, all HTTP 500 from the known compiler failure. The bounded probe measured 60 screens, with 32 HTTP 500s; all eight More checks and both intercepted one-POST form checks pass. Broader matrix/exit certification remains blocked. See validation.json and the five area reports. The latest backend head 1c8254a changes only published evidence; its merge-tree still conflicts in the same Coverage test and root layout (the latter has Claude’s supplied resolution). Preview close guards report automatic generated type-path changes; the complete bounded integrity comparison is retained in preview-integrity.json.
