# Combined8640247 gate result — superseded for correction

Exact clean8640247, Claude4aaa793 plus candidate33b68f250. Locked install, typecheck, lint and production build pass; all five development markers are absent across2,323 build artifacts. Full one-worker suite:7,360 passed,2 failed,801 skipped,55 pending across474 files. Both failures are genuine integration issues, not load timeouts; no timeout replay is applicable.

- `kit.test.tsx`: TC-WA-16’s scoped application selector in kit.css violates the existing kit namespace contract. Latest coordinator portal CSS already supplies a higher-specificity disabled-opacity rule. Root is reviewing the redundant rule’s removal, retaining coordinator bytes.
- `exchange/callout/page.test.tsx`: the test’s complete EmployeeSubmitButton module mock omits PendingLabel, now used by Wave A PendingButton. Root is reviewing use of the real PendingLabel through a partial mock, preserving business assertions.

No864 browser or exit runtime started. This result is retained; a corrected descendant must pass fresh gates before the full review release. Published candidate33 and four ready refs remain unchanged. Raw Vitest assertions, complete logs, source/lock/checker hashes and start/end source-clean proof are beside this file.
