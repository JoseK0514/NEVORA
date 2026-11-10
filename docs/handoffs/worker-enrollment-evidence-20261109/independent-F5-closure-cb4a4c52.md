# Independent F5 closure to Jose

**F5 (Important) is CLOSED at `cb4a4c52d1bb999ceeda08ab8e5f108eb57955c8`.** All six required enrollment review findings now have independent source-level closure. F1–F4 and F6 retain their decisions at `f6e2cd4e`. The original reports remain intact. The local FIFO issue remains Minor and deferred.

**QA recommendation: GO for the F5 input-validation change.** The enabled enrolled parent now rejects environment variable names beginning with `NEON_` in `src/lib/operations/managed-host.ts:58`. This closes the previously identified gap for the repository-supported `NEON_AI_GATEWAY_TOKEN`. The only application-code change since the prior closure report is this validation expression. The other changed files are the two regression suites and a copy of the prior report.

## Independent local replay

I ran only existing tests against a private archive of the exact clean source, using privately copied installed dependencies and Node 24.19.0. No customer data, hosted calls or real provider credentials were involved.

```sh
node node_modules/vitest/vitest.mjs run src/lib/operations/worker-enrollment-routing.test.ts src/lib/operations/managed-preflight.test.ts src/lib/operations/managed-host.test.ts
```

Direct invocation exited 0, with **26/26 tests passing across three files**. An independent invocation with the verbose reporter also passed all 26. Its captured artifact is `/private/tmp/nevora-f5-closure.vQYHce8j/F5-tests.log`, SHA-256 `9478af8bc963930e0ba61a68779aa5a575d98742d5de43759a87195a9d6069fe`. The compiled preflight builds the repository host entry in a test-owned directory and calls its actual offline validation mode with the fixture's build label.

| Scenario | Observed result | Regression |
|---|---|---|
| Enrolled parent receives either Neon credential name | Both `NEON_AI_GATEWAY_TOKEN` and `NEON_API_KEY`, with empty and nonempty values, caused the parser to throw `managed_configuration_invalid`. Other named privileged settings continued to be rejected. | `src/lib/operations/worker-enrollment-routing.test.ts:44` |
| Actual compiled parent receives a nonempty Neon or provisioner credential | Each subprocess exited 1 and emitted the fixed `managed_workforce_unavailable` error. | `src/lib/operations/managed-preflight.test.ts:19` |
| Enrolled and legacy sibling profiles in either order | Parser rejected both orders, and both compiled validators exited 1. | Routing test line 39 and compiled preflight line 18 |
| Legitimate host configurations | Clean enrolled compiled preflight exited 0 and reported one enabled profile. The all-legacy pair parsed with two profiles. The disabled preflight returned a valid disabled result. | Compiled preflight lines 13, 16 and routing test line 42 |

The full candidate suite, exact-source acceptance, development integration and CI have separate gates. This targeted replay grants no hosted or Production authorization. Previous host/monitor findings retain their separate historical dispositions.


## Disposition from the independent host functional replay

**Original enrollment finding F5 is CLOSED on `cb4a4c52d1bb999ceeda08ab8e5f108eb57955c8`.** This disposition covers mixed enrolled/legacy profiles and the known out-of-scope settings on an enabled enrolled parent identified in paragraph 5 of [the original review](independent-review-fdd83020.md) and carried forward in [the earlier closure](independent-closure-f6e2cd4e.md).

My existing direct checkout replay passed all 26 tests in the three requested files. Both profile orders failed at the parser and compiled preflight. The parser rejected each of the six named top-level settings with empty and populated values. The compiled preflight rejected isolated provisioner and Neon credential settings, including the previously open Neon AI gateway token case. It accepted the valid enrolled configuration, and the parser accepted a separate two-profile legacy configuration. The exact invocation, source and captured output are in [the independent functional result](independent-host-functional-cb4a4c52.md).

This entry records my disposition from that completed run. It makes no hosted or production determination.
