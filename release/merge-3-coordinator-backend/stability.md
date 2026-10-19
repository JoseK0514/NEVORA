# Combined Stability

Candidate `98b037b855b30d0494885e0e8c5b0c3bc78d228f` (coordinator8c4264c, backendc6a5954, retained Wave Ac05e0c7). Historical integration checkpoint; later candidate reports supersede it. Fictional local data only; every form mutation held/aborted.

## Verdict

Not zero: P0 0 / P1 2 / P2 0 confirmed.

## Earlier findings / findings

Retained Wave Ac05e0c7 still has ST-WA-7 (Swap) and ST-WA-8 (Delete). At320/200 both engines show88→52px pending button height. Swap y587.516→623.516 (+36); Delete y633.516→667.516 Chromium (+34), y631.516→667.516 WebKit (+36). See [pending.json](pending.json) and crops/*-{swap,delete}-200-{before,pending}.png. Owner: Wave A; fix both pending controls on the source branch and obtain a zero exit before merge. Newer7679133/7651490 were deliberately excluded pending their own exit.

## Checked and correct

Locked install, TypeScript and lint (zero warnings) pass. Full serial suite7336 passed,0 failed,801 skipped,55 pending. Process file12/12 alone; backfill file68/68 alone. Build and artifact marker scan pass; strict source/mirror verification and owned PostgreSQL shutdown pass. See [evidence summary](evidence/tests-summary.json) and [preview integrity](preview-integrity.json).

## Gaps

Partial combined inspection, not a complete exit: 60 page samples at390/100, 8 More cases, 256 automated cells, and4 held forms at320/200. Secondary review found8 of16 Home/Inbox captures still loading; these are not ready-state evidence. The exact cases and five review reports remain in [secondary-review](secondary-review/README.md). Full matrix, all fixture states, contrast judgment, physical devices and native keyboards are not complete.
