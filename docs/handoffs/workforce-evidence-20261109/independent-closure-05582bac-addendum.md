# Independent closure of finding 3 on 05582bac

**Candidate** 05582bac226ff2355efe192137bee4c32ee2c2bd. **Finding 3 remains open. QA recommendation for this revision is NO-GO.** The other five findings retain their prior independent closure.

### Verified corrections

On a fresh, invocation-owned PostgreSQL 17.10 cluster, I applied the repository migrations, created real restricted monitor and scoped-reader logins and used the two public setup helpers. Both were admitted. The monitor sampled and committed its own journal observation. The reader selected its own active workspace from a two-company fixture and received PostgreSQL permission denied when querying the base registry. These positives passed again after the adversarial grants were removed. See `principal.jsonl` lines 1–2 and 21.

Both setup helpers rejected PUBLIC TEMP, schema CREATE, a PUBLIC SECURITY DEFINER function in the deceptive ordinary schema `pgxreview`, all three sequence privileges, MAINTAIN on a restricted table, both large-object ACLs and explicit EXECUTE on the restricted native function `pg_read_file(text)`. The runtime rejected the affected monitor before sampling in each case. Ownership of the private large object also blocked setup for each owner. See `principal.jsonl` lines 3–14.

### Remaining Important issue

1. **A PUBLIC grant on the same restricted native function bypasses role admission.** The new predicate at `src/lib/operations/principal-policy.ts:20` recognizes named EXECUTE grants. Its special SECURITY DEFINER arm excludes system schemas. Starting from a verified permission denial on `pg_read_file('PG_VERSION')`, I granted EXECUTE on that one signature to PUBLIC. Both machine logins then read the scratch server's benign version file. Both setup helpers accepted those roles and the monitor proceeded to sample. See `principal.jsonl` lines 15–16.
2. **Named and PUBLIC grants on protected catalog columns bypass both guards.** The relation scan at `src/lib/operations/principal-policy.ts:21` excludes `pg_catalog` and `information_schema`. Both roles initially received 42501 on a query referencing `pg_authid.rolpassword`. Granting SELECT solely on `rolname` and `rolpassword` to the two machine roles allowed the query. The same happened after revoking those grants and granting the column privileges to PUBLIC. Both setups and the monitor observation accepted every case. A fixture-only database boolean established access to that column without returning or logging a password verifier. See `principal.jsonl` lines 17–20.

At the next correction, compare effective named and PUBLIC capabilities on native routines, catalog tables and individual columns against PostgreSQL's shipped ACL baseline. Explicit grants that exceed that baseline must block admission at setup and on the monitor's runtime connection. Use the existing initial-privilege comparison in `src/lib/tenancy/runtime/current-source-envelope-probe.test.sql:219` as a reference. Scope the next independent replay to this finding and retain the passing least-privilege cases.

### Reproduction

Run this from the candidate checkout, with `$closure_dir` pointing at this addendum's directory.

```sh
TSX_DISABLE_CACHE=1 node --conditions=react-server --import ./scripts/node-server-context.mjs --import tsx "$closure_dir/principal.mjs"
```

The output `principal.jsonl` records the actual setup, runtime and data-access observables. The script asserts the previously reproduced fixes and prints the adversarial dispositions. Its zero exit status is compatible with the remaining adverse observations. It starts an owned loopback cluster, uses fictional roles, and removes the cluster on exit. The review changed no checkout, cloud or shared database state. Hosted, budget and deployment gates were outside this replay.
