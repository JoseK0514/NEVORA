# Desktop review execution

No execution authorized until root32-fix candidate72/fullCI resource window releases. Final source must remain exact724b430f3693bc5a9d37677ad250581e33d0f866. No preview is currently running. Five reports remain pending/nonzero.

1. After root releases, source runtime.env and run `DESKTOP_REVIEW_RELEASED=1 bash scripts/validate.sh` from this report directory. It uses /workspace/ready-desktop, source npm dependencies, exact expectedSHA, Next typegen, TypeScript and nine affected test files with one worker. Inspect generated tracked-file status; no app edits/commits belong in validation.
2. Launch only the approved exact-source owned fictional runtime with PREVIEW_SOURCE=/workspace/ready-desktop, PREVIEW_OUT=/workspace/paused-previews/ready-desktop and disk PG tmp. Seed fictional extras using that exact source helper. Log in all10 matrix fixtures; do not print password/storage states. Retain access/audit/source manifests.
3. Run the unchanged checker first in bounded four-route batches using DESKTOP_RELEASED_SHA=724b430f3693bc5a9d37677ad250581e33d0f866, PLAYWRIGHT_RUNTIME_ROOT from runtime.env and the exact command below. A bounded `--max-batches 1` diagnostic preserves scope and lets root schedule other work. Remove the bound only for the released full sweep. Same preview lineage resumes completed matching cells; changed SHA/fixture/checker/collector/guard requires separate evidence.

```bash
node scripts/serial-baseline.mjs \
 --source /workspace/ready-desktop --sha 724b430f3693bc5a9d37677ad250581e33d0f866 \
 --preview /workspace/paused-previews/ready-desktop \
 --report /workspace/nevora-inspections/p4-desktop/ready-desktop/evidence/full-exit \
 --week 2026-10-19 --execute --max-batches 1
```

4. Run `recheck-inbox.mjs` and `recheck-header.mjs` with DESKTOP_REVIEW_RELEASED=1 and matching PREVIEW_OUT. They verify exact checkpoint and run sequentially, without source edits or mutations. Inbox:8 natural opening cases+4 selected-group/native-state/privacy/focus/scroll guards. Header:8 measured font/line-height/fit cases. These supplement all required earlier-ID checks and cannot turn missing full coverage into zero.
5. Complete all five-area manual/state/keyboard/reduced-motion/controlled-font/large-data/collapsed-sidebar jobs in desktop-review-exit-jobs.md. The9888-cell baseline is the role-specific union brief+ROUND matrix, not a substitute for those extra obligations. Source selected-item deep links must use actual fictional fixture IDs; do not invent invalid item URLs. Save each earlier ID status and exact measurement. WebKit CLS is unsupported, so use geometry and report null; raw unchanged checker zero is not observed CLS.
6. Stop/audit only owned runtime, verify source/mirror/PostgreSQL closure, then finalize five reports. Merge only after complete zero and applicable independent review; no production exposure/publish is authorized here.
