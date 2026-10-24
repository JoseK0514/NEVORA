# Independent supervisor and Zod repair review

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: No material code defect found in this bounded diff. Fresh persisted verification and mandatory CI remain release requirements, not established by this approval.

Scope: clean c0f6397f in the separately owned owner-ai-supervision-20261023/Fuel Scheduler checkout; compared against8d4a3792 and inspected REDb7e40d0d, supervisor541088a0 and lockc0f6397f separately. Four files change: supervisor, existing process test fixture, new root-group test and Zod lock record. No application/schema/UI/provider behavior changed. Read-only inspection and official registry GET only; no concurrent runtime, source/HEAD mutation, installation, secrets or paid operation.

## Findings by severity

CRITICAL: none. HIGH: none. MEDIUM: none. LOW: none.

## Ownership assessment

scripts/phase-e-owned.mjs:206-213 pins root identity once from the actual child handle on spawn, requiring current invocation marker, own parent and group-leader identity. It does not add the root to IPC resource registration. rootGroupProof:141-149 rechecks original PID/start/group/command and parent plus live marker, and refuses exited/lost root. Unsupported non-group-leader platforms fail closed; current mandatory workflow uses Ubuntu24.04.

The new remember branch:156-163 requires both current observation kind and prior kind to be owned-descendant. It revalidates unchanged root proof and member lifetime/group/parent/ancestry, retaining the original command hash. Explicit registration still follows strict original-hash comparison and cannot promote a changed member. Existing detached-group behavior is preserved. snapshot:182-188 independently checks live prior root-group leases for lifetime, ancestry and required marker before discovery, preventing silent marker-loss skips.

Final groups construction:236 places root-group members under the pinned root group instead of individual signals. signalGroup:245-268 requires full current root proof while live; after root absence it checks all candidate original members, requires lifetime/group continuity and current owner marker, and preserves strict command proof for registered members. A changed original lifetime throws rather than being silently skipped. No surviving anchor authorizes no group signal. Automatic exec members supply group-only authority, never individual signalling or registration authority. Existing timeout/grace/stop failure semantics remain unchanged.

This is the reviewed, intentional expansion of root-group observation and final group cleanup, not a claim of unchanged policy. The same-PID/start-time resolution and multi-read observation races remain existing limitations, not stronger kernel-level identity guarantees. No broader authorization claim is warranted.

## Test relevance and observed artifacts

New src/test/phase-e-root-group-process.test.ts synchronizes an actual shell-to-Node exec using a FIFO. It records real before/after argv, PID, PPID, PGID and birth; positive success is conditional on an actual observed command transition. Ten cases cover clean exec, pre-registered rejection, post-exec registration rejection, orphaned-root cleanup, forced timeout, changed root command, root/member marker loss, changed member birth and ancestry. The absence of individual process.kill calls is asserted; cleanup/timeout/error reasons remain substantive. This represents the identified fork/exec boundary but is not a replay of the exact cloud Git command.

Darwin simulates Linux marker retention for only the actual creation-handle root and fixture member; negative field simulations are declared. Linux reads native /proc except the declared negative controls. Original src/test/phase-e-process.test.ts changed only its simulated marker fixture allowlist to admit the actually spawned root. Existing negative expectations, including registered outside-group rejection, were not relaxed.

Inspected engineering/root-group-persisted-red.log: two intended positive/control failures, one registered negative passing, seven unselected tests. Old supervisor produces the expected IDENTITY_CHANGED with actual differing command hashes. Inspected engineering/root-group-expanded-green.log: two files,23 tests passed. These are parent execution artifacts, not tests rerun by this reviewer. At inspection engineering/root-group-persisted-green.log contained only the run header, so this report does not claim completion of that fresh run. Root birth/group-specific injections and unrelated-process survival during root orphan cleanup are not exhaustive new cases; their generic strict checks and existing negatives were inspected. Linux cloud and fresh full-suite results remain required.

The previously loaded remove-ai-slops/programming perspectives were applied. Tests exercise real boundary behavior rather than text removal or copied constants; declared simulation is narrow. The supervisor additions reuse existing proof helpers and do not introduce unnecessary production parsing or a new broker. No material violation found.

## Zod fix and official verification

The lock diff changes only Zod4.6.5 to4.6.7 and adds the official tarball URL/integrity. Root manifest and parent versions remain unchanged; dev:true and existing ^3.25.0 || ^4.0.0 consumer/peer ranges remain compatible.

[Current GitHub advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) marks versions below4.6.6 affected. [Official4.6.6 release](https://github.com/colinhacks/zod/releases/tag/v4.6.6) contains the collection-bound fix; [official4.6.7 release](https://github.com/colinhacks/zod/releases/tag/v4.6.7) documents the subsequent patch release. I independently fetched https://registry.npmjs.org/zod/4.6.7 read-only: version4.6.7, tarball https://registry.npmjs.org/zod/-/zod-4.6.7.tgz and integrity sha512-g8W2D2kU6a8untc053fX1uVBKzM7yqAxW/3zwk83+6RyF2+SKOuV+c0wBDhUwzV1PaGapmZH+rmcUzPf+3CGwg== exactly match the new lock. No blanket audit fix, override or audit suppression was introduced. This resolves the advisory range in source; fresh installed-graph/full-audit evidence is still required to close the operational gate.

## Disposition

Approve the bounded code/lock repair for continued verification. Preserve the original failed development run and RED artifacts. Require fresh persisted GREEN, full tests/types/lint/source-bound build and both audit modes, independent evidence review and mandatory cloud CI before declaring development acceptance. No hosted migration, production authorization, provider spend or six-branch policy is changed. This code review is not independent hosted security certification.
