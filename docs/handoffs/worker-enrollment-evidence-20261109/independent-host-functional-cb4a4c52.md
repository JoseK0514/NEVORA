# Independent workforce host input-validation result

**VERIFIED** on detached candidate `cb4a4c52d1bb999ceeda08ab8e5f108eb57955c8`, compared with `f6e2cd4e`. Jose, the enrolled-host parser rejected all six named out-of-scope top-level settings in the regression tests. Valid enrolled configuration and all-legacy configuration both passed.

| Scenario | Observed assertion |
|---|---|
| Enrolled profile with an out-of-scope setting | At `src/lib/operations/worker-enrollment-routing.test.ts:44`, each of `NEVORA_PROVISIONER_API_KEY`, `NEVORA_PROVISIONER_CONTROL_DATABASE_URL`, `NEVORA_OPERATOR_CONTROL_DATABASE_URL`, `STRIPE_SECRET_KEY`, `NEON_AI_GATEWAY_TOKEN` and `NEON_API_KEY` produced `managed_configuration_invalid` with either an empty or a nonempty value. The production change adds the `NEON_` prefix to the existing enrolled-host setting-name check at `src/lib/operations/managed-host.ts:58`. |
| Actual compiled preflight | The existing test bundled the candidate host entrypoint locally with its synthetic source label. One valid enrolled profile exited 0 and reported valid/enabled/one profile. Supplying a provisioner API key, Neon AI gateway token or Neon API key individually exited 1 with the expected generic error. See `src/lib/operations/managed-preflight.test.ts:16` and `:19`. |
| Separate legacy compatibility | The parser accepted two all-legacy profiles and rejected mixed enrolled/legacy siblings in either ordering. The compiled preflight independently rejected both mixed orderings. See `src/lib/operations/worker-enrollment-routing.test.ts:39`. |

I ran the following existing command from `/Users/josek0514/.codex/worktrees/nevora-worker-enrollment-final-20261109`.

```sh
node node_modules/vitest/vitest.mjs run src/lib/operations/worker-enrollment-routing.test.ts src/lib/operations/managed-preflight.test.ts src/lib/operations/managed-host.test.ts
```

Captured Vitest 5.0.5 output, exit 0:

```text
Test Files  3 passed (3)
     Tests  26 passed (26)
  Start at  23:36:57
  Duration  688ms (tests 86%, transform 8%, import 5%, worker 1%)
```

The checkout remained clean at the same commit. This disposition covers the named local host-validation item. Other enrollment items and hosted or production approval were outside the replay.
