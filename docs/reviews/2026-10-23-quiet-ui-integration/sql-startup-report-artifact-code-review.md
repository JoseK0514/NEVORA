# SQL startup diagnostic artifact review

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: None in the one-line artifact-path change. Startup observation failure remains unresolved and fatal.

Reviewed .github/workflows/ci.yml:359 in /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler: adds only recursive sql-report.json beneath the existing long-path startup evidence root to the always-run upload. No command, assertion, retry, error classification or application change.

CRITICAL/HIGH/MEDIUM/LOW: None found in this bounded change.

The startup fixture writes its nested report in external-evidence-.../sql-report.json and reads it before writing startup-receipt.json. The new recursive glob reaches that existing file. phase-e-owned.mjs records each supervised result's observationFailure and resources before throwing on failure, then writes sql-report.json from finally. Ownership/source metadata and process identity use PID/PPID/PGID/start/commandHash fields; environment read failures retain fixed reason/phase and bounded errno categories. Actual process command lines/environments are not added.

Important precision: sql-report.json also contains the predetermined harness command array (node/Vitest configuration, suite and output-file paths), not exclusively hashes. These are already constructed from fixed suite selection and local evidence paths; the connection URL is passed in childEnv, not that array. It does not dump arbitrary observed argv or environment values. The existing startup receipt already uploads the outer command/paths and ownership marker. The change does not widen to raw PostgreSQL logs or arbitrary files.

Inspected attempt7 retained startup receipt: exitCode=1, ownershipClosed=true, dataRemains=false, sourceCheckpoint 46678584161659e605173249baafdf88eac217be and runnerHash df4bb1e3bcadf4223468201cc4c9854c7a07ad59dd94b48bfa8571b5acf32403. Existing upload has four files and no sql-report.json. The added artifact is sufficient to reveal the supervisor's retained failure reason and sampled identity/resource projection if the condition recurs. It cannot recover the omitted prior report or prove root cause, and may not establish precise timing/process ordering beyond that projection. Successful TCP query/cleanup does not nullify the observation failure.

remove-ai-slops/programming perspectives applied from prior consulted skills: minimal evidence retention, no weakened gate or unnecessary production parsing. Read-only source/artifact inspection; no test/browser/network/external mutation. Mandatory native cloud rerun must supply the missing report. Prior reports preserved; established no-ULW-plan fallback used.
