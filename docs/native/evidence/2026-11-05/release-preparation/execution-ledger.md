# SDD ledger — plan: docs/superpowers/plans/2026-11-05-native-release-preparation.md

Pre-flight: Task2 assets feed Task3; Tasks1–4 feed Task5. No interface conflicts.
Ruling: Keep actual release signing and independent backup pending until an approved HTTPS origin and an owner-selected independent recovery store exist. Cost if wrong: beta delayed, while custody stays intact.
# SDD ledger — plan: docs/superpowers/plans/2026-11-05-native-release-preparation.md
Task 1: complete (commits 89633d8..ff42f9b, tests: node --test scripts/development-source-inventory.check.mjs → ℹ duration_ms 40.101791)

Task2: Ruling: Package required-reason/tracking metadata now and keep collection declarations in a complete draft worksheet until a hosted release configuration is verified. Omit collected-data manifest fields rather than falsely declaring no data. Cost if wrong: final archive/privacy review remains a release gate.

Task2 SDK evidence: Android APK/AAB/Debug/test APK,26 JVM tests and lint succeeded;15 lint warnings retained. iOS Release simulator succeeded and bundled official AppIcon/PrivacyInfo; regeneration produced no diff. Builds tied to fafa56ded5fe855350ebd58e3b070ea25c75baf4, origin empty/provider-off, no usable or signed beta.
Task 2: complete (commits ff42f9b..53dd379, tests: python3 /Users/josek0514/.codex/native-runtime/nevora-release-preparation-20261105/verify_release_artifacts.py → })

Task3: Ruling: Reuse the exact unmodified iOS screenshots from today's successful full-backend native run, with source/test/device hashes and unchanged UI source proved. Mark them draft; final required-size Android/iPad/candidate captures remain a submission gate. Cost if wrong: captures must be retaken before submission; no false platform evidence.
Task 3: complete (commits 53dd379..5d4f3fb, tests: python3 /Users/josek0514/.codex/native-runtime/nevora-release-preparation-20261105/verify_store_packet.py → PASS: listing limits, 3 asset dimensions/hashes, 5 native screenshot hashes, draft and pending URL gates)

Task5: Ruling: Begin the single read-only whole-change review after all implementation/store material is committed, in parallel with the final unchanged-code Android fixture. Supply its final receipt before final assessment. Cost if wrong: review may lack a result until that receipt arrives; final acceptance stays pending.

Task4: executed all checks; current Android original matrix9/10 and pre-resource control fail recreation at default149; release BLOCKED. Cold restart/current browser resolution pass; both owned test devices removed. Full two-worker suite10978pass/801existing skips; no assertion/timer changes.
Final: review WATCH/APPROVE for preparation diff, no material introduced issue; separate Android release blocker retained.
Final: Ruling: 1. Actual release signing and independent backup verification remain pending because no approved HTTPS origin or independent recovery location is selected. The encrypted working key remains in existing private custody. Cost if wrong: beta/signing delay; no invented recovery proof or credential export.
Final: Ruling: 2. Package the required-reason/tracking manifest now, omit collected-data keys, and keep full hosted-data collection declarations in the draft worksheet until the shipping environment is reviewed. This does not assert no collection. Cost if wrong: final archive/privacy review and potential disclosure edits before upload.
Final: Ruling: 3. Reuse the exact fictional native screenshots from today's successful69887718 run with original XCTest/source/device hashes, because product UI/public sources are unchanged; label them drafts with final size/platform/candidate recapture gates. Cost if wrong: retake screenshots before submission, rather than mislabel platform evidence.
Final: Ruling: 4. Begin the single read-only review after implementation/store assets were committed, while the final Android fixture finished; preserve its failure and add final browser/cleanup receipts after the reviewer cutoff. Cost if wrong: the reviewer lacked the latest result temporarily; no release assessment could turn green during that gap.
Final: Ruling: 5. Reviewer declined hosted/backend/provider acceptance: retain those external gates as unverified; local fixtures do not prove them. Cost if wrong: later environment/provider qualification work; no implied hosted approval.
Final: Ruling: 6. Reviewer declined signed-device/store readiness: keep signing, device and distribution gates open. Cost if wrong: beta delay; no unsupported signing/store claim.
Final: Ruling: 7. Reviewer declined independent backup recovery: keep it false until owner-selected independent storage and a restore/signing rehearsal are verified. Cost if wrong: owner recovery action remains required; the working key is preserved.
Final: Ruling: 8. Reviewer declined live support/deletion operations: keep mailbox access/delivery, manual fulfillment and external retention verification pending. Cost if wrong: operating/rehearsal work remains before making live service assurances.
Final: Ruling: 9. Reviewer declined final privacy declarations: worksheets remain drafts, not submitted answers or legal certifications. Cost if wrong: declaration/policy changes may be needed before submission.
Final: Ruling: 10. Reviewer declined physical assistive-technology behavior: the emulator recreation failure remains a release blocker; physical impact is unknown and must be tested. Cost if wrong: further stack/runtime work and physical qualification remain, without waiving accessibility.
Final: Ruling: 11. Reviewer declined merge/release authorization: no merge, code push, app upload or production action is inferred from this review. Cost if wrong: shared integration waits for the actual gates and Jose's authority.
Final: minor (deferred): self-contained graphic recipe duplicates font/icon in a long line
Final: minor (deferred): launcher bitmap density unspecified
Final: minor (deferred): API26 icon qualifier redundant at minSdk29
Task 4: complete (commits 5d4f3fb..df86ace, tests: python3 /Users/josek0514/.codex/native-runtime/nevora-release-preparation-20261105/verify_preparation_receipts.py → RECEIPTS COMPLETE: local preparation recorded; Android recreation and external release gates remain BLOCKED)
Task 5: complete (commits df86ace..df86ace, tests: python3 /Users/josek0514/.codex/native-runtime/nevora-release-preparation-20261105/verify_preparation_receipts.py → RECEIPTS COMPLETE: local preparation recorded; Android recreation and external release gates remain BLOCKED)
