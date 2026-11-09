# Phase A owned application test harness

Use the installed dependencies; do not install a database provider or change `src/lib/db.ts` for tests.

## Required environment

- `FUEL_TEST_DATABASE_URL`: explicit loopback URL using the existing factory's `nevora_exchange_test_` naming boundary. The factory creates its own fresh database; it refuses existing/unowned data.
- `FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN=yes`: applies only after exact disposable UUID/OID ownership checks.
- `PHASE_A_EVIDENCE_DIR`: new absolute directory outside the worktree.
- `PLAYWRIGHT_RUNTIME_ROOT`: explicit existing external Playwright installation, currently `/Users/josek0514/Documents/ChatGPT/engineering-toolkit`. No automatic download.
- `PHASE_A_BROWSER=chromium` or `webkit`; `PHASE_A_UI_MATRIX=1` for all seven widths; `PHASE_A_POLICY_ONLY=1` for the bounded workflow-policy supplement.
- Keep real `DATABASE_URL` and provider secrets unset, and push delivery flags false.

Run `npm run test:phase-a:app`. The scratch Next process and disposable database are owned/closed by the harness. Only scratch `src/lib/db.ts` substitutes the transport; every scratch copy has original file hashes, substituted-file identity, process PID/group and database ownership. Test barriers delay actual reads but do not synthesize data/results.

Actual app proof differs from fixture rendering and differs again from production Neon/physical-device/provider proof. Preserve all logs, including test-driver failures. A successful database poll is not sufficient for a browser action to have settled: the driver waits for the actual streamed Server Action response and refresh.

PostgreSQL cluster startup/stop is outside the harness. Use only an explicitly ownership-verified local cluster. Never stop unrelated Phase 5 previews/databases or terminate broad node/process groups.
