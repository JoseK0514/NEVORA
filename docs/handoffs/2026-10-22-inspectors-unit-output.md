# Inspector preparation unit output

Captured from the completed local command `npm test -- --maxWorkers=1` (exit0). This is retained executor output, not an independently rerun suite or a complete Actions candidate acceptance.

```text
> fuel-scheduler@0.1.0 test
> vitest run --maxWorkers=1


 RUN  v5.0.2 /Users/josek0514/.codex/worktrees/inspectors-ci-20261022/Fuel Scheduler


 Test Files  544 passed | 27 skipped (571)
      Tests  9306 passed | 801 skipped (10162)
   Start at  16:54:27
   Duration  306.44s (tests 86%, import 12%, transform 2%)

    Isolate  571 workers spawned · ~43ms startup each (spawn + environment, per file)
             at least ~24.65s faster with isolate: false — reuses workers across files instead of one per file
```
