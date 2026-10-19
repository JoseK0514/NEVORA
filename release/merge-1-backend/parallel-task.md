# Backend-first rolling candidate: validation in progress

This track follows the rolling instruction: recreate from the coordinator, then merge backend before admitting any UI chat without a verified zero exit. A separate explicit Jose request authorizes the Wave A-first integration recorded in `release/merge-1-wave-a/`; that history and its blockers are preserved without treating it as a zero exit.

- Source `/workspace/nevora-release-candidate`, branch `codex/release-candidate` in this workspace.
- Base `634795d50e0f82ef6229a94703cea599d5c2d1a9`.
- Backend input `31ec6988446607651031c6412b2c9f4c8ccce402`; merge `29ebdc5160c86b37c93e99dce5f5459450e28896`.
- Coordinator's `RESOLVED-src-app-layout.tsx.txt` copied byte for byte after its comment block. No independently chosen layout. CSS equals the coordinator blob at merge time.
- Separate authorized confirmation cleanup `2fafc1aa84f43a120d2f8fff4c3855ebf4b15dcf`. No counter value is captured; both leave events and cleanup call the same increment function. No new behavior or mirrored test introduced.
- npm ci passes (410 locked packages). TypeScript passes. Full lint: 1 error at `exchange/swap/page.tsx:51` (known Wave A fix), 0 warnings; the authorized confirmation warning is absent.
- Full default Vitest, unchanged timeouts, maxWorkers=2, running on exact `2fafc1a`; subprocess reaper only prevents leaked test descendants. Browser checks running on an owned loopback fictional database. No green combined or release verdict yet.
- Coordinator later advanced through `e7671e6`, including shared UI and a round-4 handoff. That update is queued after this frozen verification cycle; this older SHA will not inherit its new stylesheet or inspection result. The Phase 3 handoff pins the commit adding ROUND.md (`f691dec`), not an arbitrary later head.
- Old rehearsal records remain under `release/bootstrap/rehearsal/`. Superseded unpublished bootstrap `a08814c` is retained locally; its default test run was stopped and its preview setup failed, so none is claimed as candidate evidence.

## Preview tooling and gaps

The first original bootstrap timed out waiting for its fictional Update composition form. It shut its database down. A scratch-only adapted bootstrap skips that publication fixture and pins the existing development type-reference substitution; application source is untouched. The resulting source manifest identifies the candidate. Updates-ready state and source-exact unadapted bootstrap success are not claimed. Chromium and WebKit actually launched/rendered after missing Debian libraries were extracted to a user-owned runtime; only their system-library precheck needed skipping. No host service or external URL was exposed.

A first inspection-preview attempt used an out-of-root node_modules symlink; Turbopack rejected it. The source checkouts now have real dependency directories. A later Wave A attempt incorrectly used backend fixture tooling that expected backend-only migration 0033 on a Claude snapshot; it stopped before readiness. These are harness gaps, not UI findings. Branch inspections must use the coordinator tooling snapshot, with fixtures compatible with their exact source commits.

## Publication custody

At the last fetch, remote `codex/release-candidate` remained `bec0ed4e64be7a4db3351973e1dc9993eeb90e8b`. Recreating that rehearsal is explicitly authorized, but this track will not overwrite a different concurrent candidate. On any lease mismatch: fetch, preserve that published head and reconcile according to its actual authorized inputs; never force through a race. Reports from both tasks remain on `codex/inspections`.

Profile initial wiring and dead Settings CSS removal still wait for their respective verified merges. No deployment, tunnel, production change or phone access was performed. Device access remains a proposal in STATUS.md pending Jose.
