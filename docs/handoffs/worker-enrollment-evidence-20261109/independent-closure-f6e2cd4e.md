# Independent closure review to Jose

**NO-GO for development integration of `f6e2cd4eafab573884e265201eb540693e84e5e6`. Five of six required findings closed. F5 remains OPEN.** This addendum applies only to this candidate. The historical NO-GO report at `fdd83020` retains its original verdict and checksum. The earlier six separate host/monitor closures remain outside this replay.

## Finding decisions

| Original finding | Independent decision | Replayed scenario and observed result |
|---|---|---|
| F1 Critical, overprivileged company WORKER | **CLOSED** | Actual PUBLIC and direct-login SELECT on the fictional credential column each caused cold issuance to reject. The pending row retained a null ciphertext. The primed canonical connection refused the protected query. The additional callable native-looking function test also denied use. Correct company SQL, queue health and restricted Worker commerce still passed. The shared predicate draws on the bootstrap grant declarations. Issuance calls it and enrolled transactions use it in both company guards. Runtime suite lines 97 and 133, runtime.log. |
| F2 Critical, colliding Worker/Owner commerce hashes | **CLOSED** | Equal company hashes combined with the wrong root left the cold request pending with a null ciphertext. Equal hashes set to the genuine Worker digest also caused the warm enrolled commerce connection to reject. Inspected positive Worker digest and unequal instance digest predicates in the issuance and commerce paths. The genuine distinct-hash commerce positive passed. Runtime suite line 107, runtime.log. |
| F3 Important, entitlement completes after revocation | **CLOSED** | The owned fetch fixture revoked the actual enrollment or waited through its database deadline before replying. Both canonical entitlement calls rejected. Two valid reads succeeded with one fetch. Revocation before a subsequent cache read caused rejection with the same fetch count. The handle rechecks material and company authority after the asynchronous work. Runtime suite lines 118 and 127, runtime.log. |
| F4 Important, destructive issuer rights | **CLOSED** | Setup and issuance rejected effective PUBLIC TRUNCATE, direct DELETE, excess column UPDATE, grant option, disabled forced RLS and disabled immutable trigger. The row remained pending with null ciphertext. PUBLIC TRUNCATE and a broadened role flag introduced during the async proof also denied issuance. Legitimate restricted issuance, scoped readers and stable replay passed. The application checks these privileges before custody, after proof and before commit. Store suite lines 138, 166 and 172, store.log. |
| F5 Important, host parent custody | **OPEN** | The compiled preflight rejected mixed legacy/enrolled sibling profiles in both orders and the ambient provisioner API key. The parser accepted all-legacy profiles and rejected the tested extra NEVORA and Stripe settings. Its positive enrolled compiled preflight passed. The original finding also requires rejecting known out-of-scope provider credentials at the parent boundary. The enrolled-host parser leaves one repository-supported model credential outside that check. See the source evidence below. Host and preflight tests, host.log and f5-source.txt. |
| F6 Important, split setup transaction | **CLOSED** | The real cycling pg.Pool was rejected before any write. A checked-out client encountered a real server-side failure after DROP POLICY. The policy count remained one after rollback, and the issuer retained ciphertext UPDATE. Normal setup and subsequent restricted issuance passed. Store suite line 154, store.log. |

**F5 source evidence.** In `src/lib/operations/managed-host.ts:27` and `:58`, neither parent-environment check includes `NEON_AI_GATEWAY_TOKEN`. The enclosing function can return an enabled config at line 60. This exact name is recognized as an AI provider credential in `src/lib/owner-advisor/config.server.ts:46` and is explicitly inventoried in `services/hosted/neon/capabilities.ts:7`. The child allowlist at `managed-host.ts:63` protects the child environment. It cannot prevent the enrolled parent from holding the key. The F5 compiled test at `src/lib/operations/managed-preflight.test.ts:19` supplies the provisioner key. The parser test at `src/lib/operations/worker-enrollment-routing.test.ts:44` covers four names. Neither exercises the known Neon credential. This conclusion comes from read-only source inspection. No new probe, payload, credential or model call was used. To close F5, reject that provider credential in the enabled enrolled parent, add the corresponding parser/compiled regression, and replay those tests and the valid host cases at the fixed SHA.

The local FIFO CLI issue remains **Minor, deferred**. The original release limitation on revocation also stands. The existing direct-login positive still demonstrates that revoking enrollment admission does not rotate the underlying database password.

## Executed evidence

I extracted `git archive f6e2cd4e` and privately copied the installed dependencies into a mode-0700 scratch directory. The original implementation checkout remained clean at the requested SHA. All four existing commands exited 0. The SQL fixture used local synthetic data in two invocation-owned servers bound to loopback and removed both clusters. No source/test files or assertions were edited.

Scratch directory: **/private/tmp/nevora-enrollment-closure.xycjiUKT**. Relative artifact names below resolve under that directory. The archives and tests were local; no hosted service was invoked.

| Scenario | Exact invocation | Captured artifact |
|---|---|---|
| Issuer grants, RLS, transaction rollback, replay and positive issuance | `env NEVORA_TEST_PG_BIN=/Users/josek0514/.codex/native-runtime/nevora-backend-integration-20261108-0w4zx1gf/pg-tools/bin node scripts/onboarding-owned.mjs --suite worker-enrollment` | 31/31 passed, store.log |
| Company-side ACL, hash and entitlement admission including primed connections | `env NEVORA_TEST_PG_BIN=/Users/josek0514/.codex/native-runtime/nevora-backend-integration-20261108-0w4zx1gf/pg-tools/bin node scripts/onboarding-owned.mjs --suite worker-enrollment-runtime` | 14/14 passed, runtime.log |
| Parser, actual compiled enrolled preflight and private callback | `node node_modules/vitest/vitest.mjs run src/lib/operations/worker-enrollment-routing.test.ts src/lib/operations/managed-preflight.test.ts services/hosted/neon/provisioner.test.ts --reporter=verbose` | 19/19 passed, host.log |
| Process fixture distinguishes observed missing, zombie, live and ambiguous states | `node --test scripts/phase-e-proc-environment.check.mjs` | 4/4 passed, fixture.log |

**Fixture evidence.** The Linux process simulation still samples the invocation's recorded PIDs. The changed test helper distinguishes a status-1 ps observation with empty output and no diagnostic from denied/ambiguous observation and models an observed zombie with an empty environment. The lifetime assertions and production supervisor are unchanged in the diff. The Company Access test now derives its eligible deadline from the actual routine-delivery policy and pins the clock. Its one-notification and identical-replay assertions remain present. I independently ran the four process-helper cases listed above.

**Release evidence.** I inspected the recorded full-suite SHA and summary in `default-suite-f6e2cd4e-source.txt` and `default-suite-f6e2cd4e-serial.log`. The serial run recorded 11,675 passes and 857 skips with no failures. My independent reruns were the four focused commands in the table. The separate default-suite and historical CI records remain as originally recorded. At closure time I found no final seven-step result in `acceptance-f6e2cd4e.log`. This finding review does not certify hosted access, the prior unrelated WebKit failure, deployment, real delivery or Production. Requalify a new source after the F5 correction and submit it for independent F5 closure.

### Artifact hashes

- store.log — SHA-256 `463654b8255929a2f30bbf7b20f416094beb4382b287239659642543bfed45f0`
- runtime.log — SHA-256 `1022b38348a2a8d993b75e4a01ec70176266d9331722961eab4fee1fc3fd73c4`
- host.log — SHA-256 `92e87062a8fc6baf3bd9fc1c7149738a0f18c11b60ed49f7c51764c37dbb5879`
- fixture.log — SHA-256 `ef922062f5f9906e456db05795c86dbffac6beb101dc383f9de81d4285108ba6`
- f5-source.txt — SHA-256 `124ce2c5a8ea0accb857cc3ed10d794b60865c5a961519115b8592c3c0d61e43`
