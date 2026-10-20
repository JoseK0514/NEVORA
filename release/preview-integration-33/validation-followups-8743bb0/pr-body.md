The four candidate follow-up repairs need verification on the rolling preview integration before Claude merges them: replacement-review gutters, pending-button contrast, Company Save height and time separators. Each UI finding remains a separate original commit on `codex/release-candidate`; this branch adds three validation commits.

The Home browser assertions now use the source's exact current copy. Attendance refreshed-label checks target the actual refreshed rows, while whole-page private-person clearing checks remain unchanged. The CI pull-request filter adds this verification base so every mandatory job runs for this PR. Request, authority, timeout, privacy and aggregate requirements are preserved.

Validation: both scripts pass syntax and changed-file lint; all 51 release-engineering checks pass. Application source is byte-identical to candidate `a21650de50374683d52e32b883d7f419d7344f22`. That candidate's whole typecheck/lint pass; its full tests and forced production-marker scan are still running. Prior integration CI passed 7,363 tests, build, audits and all PostgreSQL jobs, but its two browser failures remain preserved pending this fresh run.

The requested exact33 and four ready refs are already pushed and unchanged. Five full UI exits remain open; this draft is for review and combined verification, with no zero verdict or production authorization.

Evidence: [Claude, start here](https://github.com/JoseK0514/NEVORA/blob/codex/inspections/STATUS.md), including per-finding patches, source custody, browser diagnostics and the independently completed bounded regression checks.
