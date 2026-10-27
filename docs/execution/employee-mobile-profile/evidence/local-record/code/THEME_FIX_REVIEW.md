# Theme lifecycle fix — independent code review

Candidate `2e4104ce89f1abbb2d3bafd5b87341eba9753c47`, delta from4bf72579.

- codeQualityStatus: WATCH
- recommendation: APPROVE (code-quality scope)
- blockers: none newly identified in this delta; QA-PROFILE-001 remains QA-owned pending its independent closure. This is not final product acceptance.

CRITICAL/HIGH/MEDIUM code findings: none remaining in the proposed fix. LOW/condition: retain all earlier System failures and independent QA finding until its author verifies this candidate. Prior BLOCK reports are preserved as historical evidence, not erased.

Inspected complete three-file diff. `src/lib/theme.ts:17–21` preserves immediate application and asks the existing owner to reapply current state once at the next animation frame. It does not capture an obsolete System choice, create another theme owner, add a media listener, change storage policy, or poll indefinitely. It changes a shared theme writer, so the independent combined gate remains necessary.

`src/lib/theme.test.ts:40–75` executes the actual boot script in a VM and the exported writer. Its media object deliberately models the native observed no-event transition, rather than merely checking a callback exists. Additional cases verify later explicit or other-tab choices win over pending work. The integration diff only adds a screenshot after the unchanged System-light assertion; no wait/timeout/assertion is weakened.

Independently inspected native actual-writer probe source `local-probes/theme-actual-writer.mjs`: it transpiles the real source writer and uses exact boot script. RED loads4bf72579 from Git; GREEN loads candidate source. Parsed RED first cycle fails; all50GREEN cycles have theme light, choice system, stored null, retained/fresh MQL false. This isolates the production-writer correction beyond the earlier manually reproduced choose function. No native probe was run by this reviewer.

Inspected retained unit logs: one failure/five passes before fix; afterward13passes across four files, including all six theme cases. Inspected `local-theme-green/results.json` and raw log: complete actual Profile three-engine journey passes44.06seconds;42checkpoints,111registered captures,54contrast samples; no pageerrors/unexpected console errors. Existing warnings remain recorded. Ownership closed/sourceVerified/mirrorVerified true with owned PostgreSQL shutdown logged. Independently hashed all2016manifest entries against the worktree: zero mismatches at exact2e4104ce. This is affected-path evidence, not a substitute for independent full QA.

Evidence is under `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/`; raw logs are in the worktree `.superpowers/sdd/employee-mobile-profile-plan/`.

Previously loaded remove-ai-slops and programming perspectives reapplied: meaningful behavioral regressions, bounded lifecycle change, no unnecessary production parsing/normalization/abstraction or assertion weakening. No new violations. No implementation changes, runtimes or tests executed by reviewer. No release/deployment/physical-device claim.
