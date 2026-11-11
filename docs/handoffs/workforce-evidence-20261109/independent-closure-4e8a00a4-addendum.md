# Independent closure addendum for 4e8a00a4

**Source** 4e8a00a4ab19e197b0074798b236a979ec5889f2. **Disposition** Five of the six original Important findings closed. Important finding 3 remains open. **QA recommendation** NO-GO for this revision.

The independent replay used the committed candidate in its clean detached checkout. The two original adverse probe scripts and their original report remain in the parent directory. Only adapted probes and observations for the original six findings are included here.

| Original finding | Disposition | Independent observable | Artifact |
|---|---|---|---|
| 1. SMTP acknowledgement loss | CLOSED | A real loopback SMTP server captured one complete DATA body and closed before final acknowledgement. Nodemailer raised ECONNECTION/CONN. After making the original notice eligible again, real PostgreSQL still contained one unknown attempt, with one body at the sink. | principal.jsonl line 7 |
| 2. Pooled DSN | CLOSED | The direct fixture passed runtime and deployment validation. Its otherwise-identical Neon pooler hostname was rejected by both. | probe.jsonl lines 1–2 |
| 3. Excessive monitor privileges | OPEN | Standard TEMP, schema CREATE and ordinary SECURITY DEFINER grants are now rejected. Four additional effective grants remained admissible and usable, as detailed below. | principal.jsonl lines 1–5 |
| 4. Stale observation order | CLOSED | A delayed callback held observation ownership. The overlapping invocation returned idle before calling its sampler. The following genuine unhealthy observations wrote one outage and no false recovery. The former pre-sampled string API was rejected. The native entry supplies a lazy callback. | principal.jsonl line 6 |
| 5. Worker destination substitution | CLOSED | The main imports and passes the source-controlled staging matrix. The compiled host matched its candidate receipt and contained those destination pins. The valid fixture passed. Substituted commerce host, control host, loopback with TLS disabled, alternate port/database, embedded policy and production profiles all failed. | probe.jsonl line 3 |
| 6. Forged healthy response | CLOSED | The actual handler and observer accepted a valid response. An independent HMAC calculation matched the emitted challenge/status/body signature. Unsigned, forged, reflected-request-signature, replayed, modified-body and changed-status responses all returned invalid. | probe.jsonl line 4 |

### Important finding 3

The remaining defect is in the admission predicate used during setup and before sampling at `src/lib/operations/monitor-store.ts:15` and `src/lib/operations/monitor-store.ts:17`. Each of these conditions ran in a fresh local PostgreSQL cluster. Both setup and runtime accepted the role for all four excess grants.

- The role lacked direct SELECT on the fictional restricted table. An administrator created a regular user schema named `pgxreview` and granted the role EXECUTE on a SECURITY DEFINER routine there. That routine returned the protected row to the role. The SQL pattern `pg_%` uses a wildcard underscore and skips ordinary application/extension schemas beginning with `pg`.
- An isolated UPDATE grant on an unrelated business sequence allowed the role to reset the sequence value to 947. Sequence relations are absent from the classifier.
- An isolated PostgreSQL 17 MAINTAIN grant permitted ANALYZE on the unrelated restricted table. The forbidden table-privilege list omits MAINTAIN.
- A private large object initially denied reading by this role. Granting SELECT on that object allowed the role to read the fictional private bytes. The checker uses no large-object ACL inventory.

Fix the schema identification and include those concrete effective grants and object types. Retain a passing audited least-privilege fixture. Fresh independent replay on the corrected source remains required for finding 3.

### Reproduction

Run from the candidate checkout. `$closure_dir` denotes this addendum's directory.

```sh
TSX_DISABLE_CACHE=1 node --conditions=react-server --import ./scripts/node-server-context.mjs --import tsx "$closure_dir/principal.mjs"
TSX_DISABLE_CACHE=1 node --conditions=react-server --import ./scripts/node-server-context.mjs --import tsx "$closure_dir/probe.mjs"
```

The PostgreSQL fixture owned the entire loopback cluster and removed it after the probe. The response probe used the real signing/verifying functions with in-process transport. No cloud credentials, actual company database, live support recipient, release UI, production approval or budget gate were exercised. The two deferred Minor items and previously reported external gates remain outside this addendum.
