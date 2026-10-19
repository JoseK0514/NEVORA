# Coordinator and backend integration — historical blocked checkpoint

Candidate `98b037b855b30d0494885e0e8c5b0c3bc78d228f` includes coordinator `8c4264c` and backend `c6a5954`. It retains the previously authorized Wave A `c05e0c7`; newer `7679133` awaits its own zero exit. This is local integration evidence, not release acceptance or a production certification.

Jose explicitly assigned the Coverage screen wording to Wave A: all changed screen assertions follow that side, and backend authorization, locator, stale-review and save-result assertions remain. Root layout is the coordinator-supplied resolution. Premium CSS equals the latest coordinator blob exactly. The retired Inbox flag is skipped. The reviewed device checklist remains authoritative; device access waits for Jose.

Verified so far: locked install, TypeScript and lint (zero warnings) pass. `npm run build` passes with both development switches set, and all 2,307 build artifacts contain none of the five development markers (see production-absence.json). The backend cleanup file passes 12/12 with one worker; the unchanged original candidate reproduces three zombie-PID failures. Existing backend fix 22c4320 requires positive zombie evidence and rejects live processes. Preview launcher c6a5954 enables the helper’s supported generated-type pinning; strict closure verification will be recorded after browser checks finish.

First full suite: 7,333 passed / 3 failed / 801 skipped / 55 pending (8,192 assertions). All three failures are 5-second timeouts in typed-guarded-backfill.server.test.ts. That whole file passes 68/68 alone, with the three cases at 1.7–2.7 seconds. A full one-worker rerun is in progress, with no changed assertions or timeout increases. First-run failures are preserved, not waived.

Corrected browser probe: 60 rendered samples, no HTTP/page errors; all eight role/engine More open/focus/Close/Escape/focus-return checks pass, with 44px minimum sheet targets. The probe allows the read-only /api/manager/action-center POST; every submission remains intercepted. Automated checks and five combined reports are pending. Current checker flags identify the known desktop shell type floor, owned by Desktop and excluded from Wave A’s own findings.

No source branch edits or pushes, device exposure, deployment, or main merge. All fixtures are fictional, loopback only, external delivery disabled. No credentials or browser state are included. Full release gate remains NO-GO pending the six zero exits and final combined sweep.

Completed checkpoint: full serial suite7336/0, process12/12 and backfill68/68 isolated; build/scan pass. Checks128/256 pass (128 text-floor failures), strict preview close succeeds. Five combined area reports now retain the confirmed2 pending-height P1s plus1 shared-shell P1; the secondary review’s8 unsettled panels remain gaps. Later candidate reports provide the fresh settled rerun.
