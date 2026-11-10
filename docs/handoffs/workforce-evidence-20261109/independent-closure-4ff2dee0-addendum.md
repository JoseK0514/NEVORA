# Independent closure of Important finding 3

**CLOSED on 4ff2dee0b6908eca45b84bbba57ce1820d1891a2.** I independently replayed the failing catalog grants on PostgreSQL 17.10 for both the monitor and scoped worker-reader principals. Their setup helpers rejected every previously admitted excessive grant. The monitor also rejected its runtime connection before sampling. The five other Important findings retain their previously recorded closures.

| Scenario | Independent observable | Captured evidence |
|---|---|---|
| Legitimate machine logins | Actual monitor session committed its own journal observation. The actual reader selected its own workspace from a two-company fixture and PostgreSQL denied the base registry. Both passed before and after the adverse grants. | principal.jsonl lines 1–2 and 27 |
| Previously failing native function | Granting EXECUTE on the restricted file reader to PUBLIC let both roles read the fixture server's benign PG_VERSION. The two setup paths and runtime observation rejected that effective capability. A direct grant also failed admission. | principal.jsonl lines 12 and 15–16 |
| Previously failing protected catalog columns | Direct and PUBLIC column grants made the protected pg_authid field accessible to the two scratch logins. The query projected a boolean and never returned a verifier. Both setup gates rejected the principals and the monitor did not sample. | principal.jsonl lines 17–20 |
| Related catalog grants | Named and PUBLIC full-table grants on pg_authid and a grant option on a normally readable catalog column were rejected. Ordinary pg_roles and information_schema metadata stayed readable. | principal.jsonl lines 21–24 |
| Schema provenance | A later-created information_schema table with PUBLIC column-only access and an unregistered callable catalog SECURITY DEFINER routine both caused admission to fail. | principal.jsonl lines 25–26 |
| Earlier finding 3 cases | PUBLIC TEMP, schema CREATE, a callable application SECURITY DEFINER in pgxreview, sequence SELECT/USAGE/UPDATE, PG17 MAINTAIN, and large-object SELECT/UPDATE blocked both setups and stopped monitor sampling. Ownership of the private large object blocked setup for its owner, independently for each principal. | principal.jsonl lines 3–14 |

### Reproduction

Run from the clean candidate checkout, with `$closure_dir` set to the directory containing this addendum.

```sh
TSX_DISABLE_CACHE=1 node --conditions=react-server --import ./scripts/node-server-context.mjs --import tsx "$closure_dir/principal.mjs"
```

Exit status was zero. The probe asserted the negative admissions and successful legitimate operations, then removed its invocation-owned loopback cluster. I made no checkout, cloud or shared database changes. The role-validation control rejects excess grants. Removing any existing grants remains the database operator's responsibility.

**Release boundary.** This closes the six source-review findings in aggregate. The direct replay qualified PG17.10. Provider/version and installed-extension qualification, actual staged identities and custody, the selected service quote, exact-source hosted CI and staging behavior, responder assignment, approved inbox evidence and production authorization remain separate gates. The previously deferred Minor items retain their recorded disposition.
