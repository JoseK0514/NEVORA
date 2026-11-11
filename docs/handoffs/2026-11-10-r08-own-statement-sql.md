# R08 actual own-statement SQL qualification

Local follow-up to `ad161feab4fc3e614a3a7e97be539614913feb9d`. This is test
coverage only, with a dedicated configuration for the existing owned PostgreSQL
runner. No migrations, application logic, dependencies or hosted state change.

`clocker-payroll-client-projection.integration.ts` creates a fictional company, sessions,
approved run and genuine PDF bytes in a new disposable loopback database. It
persists intentionally private native/future/nested period metadata in the initial
immutable document insert. Assertions verify:

- No statements before publication; only the current employee's document after it.
- The actual SQL-backed DTO contains none of the private sentinel values, and
  retains the correct canonical identity, period, payday and final-file SHA.
- Download returns the exact original PDF bytes and exercises the real hash check.
- Another employee receives no statement and cannot download the document.
- Removing the current session denies the next own-statement read.

Actual SQL test passed in the local R09 RED/GREEN cohorts, including
`green-r09-three-pages-and-revocation.log` under
`/Users/josek0514/.codex/r08-r10-local-20261110/r08-r09/`.

Standalone local command (only after acquiring the shared local-test slot and
selecting the approved existing local PostgreSQL binaries):

```sh
node scripts/payroll-postgres.mjs vitest.payroll-client-projection-integration.config.mts
```

R08 remains pending integration review: the independent reviewer found that the
schedule pages' outer client `ScopedReadFrame` observation still serialized the
original source. The integration owner is correcting that separate path and its
regression in the combined checkout. This statement test does not close that
finding or certify an integrated browser payload. Jose's no-push/Actions hold,
native separation and production hold remain in force.
