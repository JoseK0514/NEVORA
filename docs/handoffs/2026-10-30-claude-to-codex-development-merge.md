# Claude → Codex: `development` now carries Release 1 + your Owner AI tag

Date: 2026-10-30. Jose asked for one development preview with all updates, conflicts resolved.

## What `development` is now

- `development` was `682ecea9`, an ancestor of Release 1, so this push is a fast-forward. Nothing on `development` was dropped.
- Merge `f299fe80` = Release 1 head `8e29c478` (`claude-codex-collab-nevora`) + your tag `owner-reviewed-coverage-20261030` (`c7507e5f`, which contains `AI-owner` `8d948736`).
- `claude-codex-collab-nevora` is unchanged and is still the Release 1 line. This merge is **not** part of Release 1 and does not change its migration list for production.

## Please build on these numbers

Release 1 already owned `0043_schedule_pending_edits.sql`, so your two migrations were renumbered and run after it:

| Your file | Now |
|---|---|
| `0043_owner_advisor_notebook.sql` | `0044_owner_advisor_notebook.sql` |
| `0044_owner_coverage_actions.sql` | `0045_owner_coverage_actions.sql` |

`db/migrations/order.ts`, `src/test/integration/local-postgres.ts` and `src/test/migration-order.test.ts` list them in that order. File contents are byte-identical. Your next migration on this line is `0046`. If you keep working on `AI-owner`, rebase it on `development` first, or the numbers collide again.

## Other conflicts

`generation-provenance.integration.ts` and `schedule-generation.integration.ts`: both lines fixed the same lock-wait flake. Kept your structure (drain registered before work starts), plus Release 1's 5 s barrier deadline (matches the held sessions' `statement_timeout`) and `Promise.race([ready, writing])` so a writer that settles before reaching its barrier cannot hang the case.

## Checks on the merge (owned local Postgres, fictional data, `DATABASE_URL` unset)

| Step | Result |
|---|---|
| Typecheck, lint | pass |
| Unit | 10,445 passed, 801 skipped, 0 failed |
| Advisor pilot | pass |
| Release 1 migrations | 11 passed |
| Release Postgres | 77 passed |
| Owner advisor SQL (includes notebook and coverage actions) | 71 passed |
| Canonical generation SQL (provenance, schedule generation, cross-layer, session) | 177 passed |
| Employee schedule SQL | 6 passed |
| Owner advisor browser (AI manager, notebook, coverage plans, coverage actions; Chromium + WebKit) | 4 of 4 specs passed |

The generation suite ran on a disposable UTF-8 Postgres with the `nevora_generation_test_` prefix (the shared owned runner only offers the foundation and exchange prefixes). The full Release 1 browser gate (Phase D/D2/E, Clocker) was not repeated on this merge; GitHub CI on `development` runs on this push.

## Development preview

- `https://nevora-git-development-josekarlo-5933s-projects.vercel.app` points at a manual deploy of this merge.
- Database: Neon branch `dev-combined-20261030` of the Release 1 fictional preview project, with 0044/0045 applied. The Release 1 Preview database is untouched.
- Environment for that deploy was passed as deployment-only flags (the project's `development`-scoped variables still point at the older development database and were not changed). `NEVORA_OWNER_ADVISOR_ENABLED=true` with no provider: no model calls, nothing billed.

## Still open (yours or Jose's)

- The Owner AI panels keep the clean-manager look, not the corporate kit.
- Live model quality, hosted acceptance and the corporate restyle of the AI pages come before any of this goes to production.
