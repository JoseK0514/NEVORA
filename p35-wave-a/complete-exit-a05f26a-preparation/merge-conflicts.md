# Wave A review merge decisions

Base `b9567abc26b977a517b77622a1661b16172f5b16`; incoming `a05f26a74b2979ce0efe1532f7f70d7064261bb9`; review `1c741fda0abf6312de7e3860be139cb2767c1ff8`. Branch `codex/ready-wave-a` only.

Git reported one content conflict: `src/app/app/schedule/edit/delete-shift-button.tsx`. Incoming source uses measured min-size holds and native disabled; candidate uses `PendingLabel`, guarded `aria-disabled`, and retains the initiating focus. The approved resolution keeps the candidate file byte-for-byte, preserving ST-WA-8 and IS-RC-DELETE-01.

`src/components/wave-a/pending-button.tsx` auto-merged incoming min-size writes into the candidate's reserved-label implementation. Root approved preserving the candidate file byte-for-byte instead: its hidden label grid already keeps responsive width/height without transformed measurements or stale pixel minima. This preserves ST-WA-7 plus guarded pending focus.

All other source edits are accepted: Coverage “needed” fallback, HoldHeight component API, PIN/time-off responsive hold hook and ROUND. Candidate IS-WA-2 ActionForm/helper and every CSS file remain exact. All31 candidate fix commits are ancestors; all55 recorded finding/file entries retain their candidate blob IDs. See `candidate-fix-preservation.json` and `merge-preserved-blobs.json`.

Only `git diff --check`, merge lineage/blob checks and harness syntax/dry-run checks have run. No preview, browser, typecheck, lint or test load started during the root gate hold. This is a review target, not a zero verdict or an admitted candidate merge.

## Candidate32 refresh

Root requested exact `9ec3adcf486bf4d18d6b9c8d5ed9af9e876d332b`. Clean normal merge with `ort` produced `563bf65a83f6ff4ce97da4dc7eb131a18f9e9fea`, parents `1c741fda0abf6312de7e3860be139cb2767c1ff8` and `9ec3adcf486bf4d18d6b9c8d5ed9af9e876d332b`. No conflicts; exactly6 lines in `src/app/app/payroll/payroll-workflow.css` changed. Current base is `9ec3adc`; all32 candidate finding commits,56 file entries and all CSS are preserved exactly. Historical original merge/proof remains under `history-1c741fd/`.
