# EACCES retirement-boundary review

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: None found for candidate publication. Native Linux and full mandatory cloud checks remain required.

## Scope
Reviewed the one-line change in /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler/scripts/phase-e-owned.mjs:97, accompanying src/test/fixtures/phase-e-retirement-boundary.mjs and src/test/phase-e-retirement.test.ts. This approval does not cover unrelated working changes or authorize release/production.

SHA256 identities:
- supervisor: df4bb1e3bcadf4223468201cc4c9854c7a07ad59dd94b48bfa8571b5acf32403
- fixture: 14b8ade6ea6c9d88851f3f569ec9009571594cda45b80b0e4146d455b08ccf27
- test: 1f7cf6993f26f9d898040aa9c12cc2a441028e799bc123ecda85d76da1e49661

## Findings
CRITICAL: None.
HIGH: None.
MEDIUM: None.
LOW: None in this bounded correction.

EACCES is accepted only behind allowRetirement and observedProcessExit(pid). The latter rejects observer error/stderr, malformed records, live state, mismatched PID and ambiguous absence. Its accepted states remain clean status-1 empty absence or exact two-field PID/zombie status. This is retirement classification, not ownership certification. The symbol sentinel cannot become a registered identity through these callers. Registration and signaling proof reads do not opt into this exception. Root retirement still independently proves both root and sampled member retired; a surviving or uncertain member fails. Live EACCES remains OWNERSHIP_UNAVAILABLE, and EIO is not added to the exception.

Fixtures retain native child/member lifetime evidence and explicitly disclose the injected errno. New positives require retired processes, exit zero, no signals, no backup cleanup and no observation failure. New negatives cover a surviving member and an unreliable exit observer; pre-existing live EACCES/EIO/missing-marker and observer diagnostic assertions remain. These exercise meaningful lifecycle boundaries rather than merely matching an allowlist. The remove-ai-slops and programming skill perspectives, consulted earlier in this chain, were applied; no weakened existing assertion or needless production abstraction identified.

## Evidence and limits
Read /Users/josek0514/.codex/quiet-ui-pr30-evidence-20261023/retirement-eacces-red.md. It reports native Linux root zombie/member absent/EACCES in cloud run 40053979460 and local RED 2-fail/13-pass. This is a parent-authored summary, not independent raw receipt verification; this report does not certify those run totals. Parent's GREEN cohort was still running at review request and is not claimed here.

Reviewer ran node --check on supervisor and fixture: PASS. No process suite, heavy testing, external mutation or cloud trigger performed. Require retained actual native Linux receipts and mandatory cloud outcomes before release claims. Prior reports remain intact. Artifact uses the existing no-ULW-plan fallback.
