# Phase 3 code review

**BLOCK · REQUEST_CHANGES** for the reviewed snapshot. Detached baseline edce7661c211aba588f29bd6d56327fabdc11b47. Tracked diff SHA-256 8e38c9186147f51f993f5d0f6cfaf73b7f55422806bfedbb1692a2284d7c150d. The untracked public request validator, review facts, task summary, and SQL fixture had SHA-256 prefixes ee3c3cb1, 928807c3, 00e2451c, and e11337c0 respectively.

## CRITICAL

None observed.

## HIGH

- Coverage outcomes do not reach a routine reader through this change. src/lib/data/manager-dashboard.ts:56 selects only pending callouts via src/lib/data/callouts.ts:182. src/lib/data/shift-changes.ts:545 creates linked coverage only after approval, removing the callout from that list. Completion reassigns the employee at src/lib/data/shift-changes.ts:782, invalidating the original employee/episode terms required by src/lib/data/action-request-facts.server.ts:58 even if the caller supplies the historical ID. Expose the required outcome on an authorized normal reader that handles reviewed callouts, and exercise pending-to-approved-to-filled on that reader. Keep the historical outcome separate from permission to view current shift details.

## MEDIUM

- src/lib/reports/project.ts:117 still attributes an unresolved shift ending exactly at midnight to the following day. Direct projectReports probes using America/New_York, an ambiguous November 1 01:30 start, either 00:00 or 24:00 end, and a valid November 2 10:00–11:00 shift returned November 2 unresolvedScheduleCount 1 and null scheduledNanoseconds for both inputs. The distinct November 2 shift should yield 3600000000000 ns. A comparable 03:00 end returned that expected value after the first revision. Limit second-day inclusion to intervals occupying positive minutes after midnight.
- src/lib/action-center/project.test.ts:30 mutates the title of an already-created object and compares the untouched review field with its clone. This is tautological. Exercise the consumer with a translated title or remove that assertion where needs-you.test.ts covers the behavior.

## LOW

None additional.

## Review scope and limits

Consulted the programming and remove-ai-slops skills and inspected the tracked and new production/test code, nearest AGENTS.md, and docs/handoffs/2026-11-16-backend-phase3-ownership.md. The tautological assertion violates both skills' behavioral-test criteria. The coverage query computes outcomes that cannot reach its normal reader. The revised Company-scope before/after checks in src/lib/data/action-request-facts.server.ts:40–58 are present. The snapshot also preserves typed RestrictionError at translation. Code inspection does not independently establish passing SQL tests. No builds, broad suites, hosted reads, deployment, or UI certification were performed. UI wiring is Claude's separate work. OMO reports ULW_LOOP_PLAN_MISSING, so this report uses the fallback evidence path. The working tree was under concurrent revision.
