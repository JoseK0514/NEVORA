# November 16 — scheduling WebKit verification repair

Owner: Codex. Scope: SCRUM-205 scheduling/action browser verification only.
Claude retains UI ownership; Rondo and the other chat's checkout are untouched.
Development remains the operating/acceptance release at production standards.
No development/main push or production deployment is implied by this evidence.

## Independently reproduced cause

Candidate 03 (`1e7a9257808372bc4cf6922ad21aab66a93820c7`) completed all
38 scheduling safety checks, then failed the final zero-runtime-error assertion.
The retained error was a WebKit native failure for Next's development
`/__nextjs_original-stack-frames` endpoint.

The instrumented rerun, `browser-matrix8-trace`, reproduced the same failure on
`4292aabb9` (full identity in Git). The sanitized trace shows the previous
schedule RSC GET received HTTP 200 but had not finished. The test's next hard
navigation aborted it; a source-document frame update and the native framework
diagnostic followed. The test used `waitForLoadState('networkidle')` as a new
response-completion barrier, although that lifecycle event had already occurred
for the current document. The old wait could therefore return while a newer
RSC response was still streaming.

The scheduling row/token/draft/replay assertions passed in that failing run.
This cause concerns sequencing between browser fixture cases, not a newly
observed lost-update failure in the writer. It does not certify hosted behavior.

## Small correction and preserved controls

The matrix now tracks the owned Manager/schedule RSC GET requests and waits for
their real completion before starting the next hard-navigation fixture case.
It does not wait for unrelated Manager API polling or change action retries.
All original stale edit/delete, reassignment, generation, lost-response,
authorization/privacy, revision and notification assertions remain.

A real-browser held-response control in each engine proves that the old idle
wait returns with a router read still pending, while the new barrier prevents
the next document request until that read is released and completed. The safe
trace contains static resource categories, numeric request IDs, status and
method metadata only; it retains no request headers/bodies, credentials, URL
queries, worker details or provider data. Existing runtime/window-error checks
remain fatal; no diagnostic allowlist or release gate was broadened.

## Executed evidence

Evidence root:
`/Users/josek0514/.codex/worktrees/nevora-readiness-integration-evidence-20261116`.

- `browser-matrix8-trace`: reproduced failure; 38 safety checks completed, one
  retained runtime error. This is failed evidence.
- `browser-matrix9-drain`: 40 checks passed, zero unexpected errors in Chromium
  and WebKit. A TypeScript-only declaration placement was subsequently corrected
  and the diagnostic control's timer cleanup made explicit.
- `browser-matrix10-qualified`: 40 checks passed, zero unexpected errors, on
  clean `70c2c8f5ba14554019b2f16866c055bf63e94c72`; both held-response controls
  passed. All owned browsers/application/database were closed by the runner.
- Full typecheck and focused ESLint passed after the type correction.
- `rsc-root-fix-controls.log`: 23 observer/diagnostic controls passed, including
  fatal real errors and bounded stalled-control cleanup.

The compact matrix receipt and full-report hash are in
`readiness-development-evidence-20261116/browser-matrix10-receipt.json`.
Implementation: `fc48be070f7b8e964aad295b7ac3710009319582` plus the type,
timer and evidence follow-up `70c2c8f5ba14554019b2f16866c055bf63e94c72`.

## Next release gate

Rebuild/verify all six source-qualified manuals, then qualify one exact candidate
in Actions. Candidate 03's validate, release PostgreSQL, Phase E PostgreSQL,
onboarding and all Clocker SQL jobs passed; its browser failures remain failed
receipts for that older source. Do not treat them as receipts for this fix.

Claude's combined UI discrepancies and the separate Rondo dependency remain in
`2026-11-16-readiness-development-integration.md`. This repair does not close
those gates or authorize a development push. Keep SCRUM-205 In Progress until
combined development acceptance; independent audit closure is separate.

## Exact-candidate Actions qualification

Candidate 04 is `321a7bb5f6a9165ec29fb6cb90d0059540070b4a`, tagged
`candidate/backend-completion/20261116-readiness-combined-04`.
[CI run 43903205719](https://github.com/JoseK0514/NEVORA/actions/runs/43903205719)
passed **management-review-ui**, job `133425030966`. Its source/closure verifier
also passed. The downloaded exact-source artifacts report:

| Browser suite | Checks | Unexpected errors | Source and owned runtime |
| --- | ---: | ---: | --- |
| Management close | 6 | 0 | Exact candidate, verified, closed |
| Delegated correction | 3 | 0 | Exact candidate, verified, closed |
| Stale-action/history UI | 14 | 0 | Exact candidate, verified, closed |
| Two-Manager scheduling concurrency | 40 | 0 | Exact candidate, verified, closed |

The scheduling gate that failed on candidate 03 now passes locally and in the
original hosted CI environment. Compact report hashes/source/closure receipts
are in `readiness-development-evidence-20261116/candidate04-management-receipt.json`.
The candidate's optimized local build passed clean/unchanged; 21 focused units,
23 diagnostic controls, typecheck, lint and six-manual verification passed.

This resolves Codex's scheduling WebKit verification blocker. It does not claim
the entire Actions workflow passed: other combined UI gates remain failed or
unqualified, and development/main were not pushed. Claude and the separate Rondo
owner retain their existing work; integration must still qualify one combined
release. Keep Jira In Progress until development acceptance.
