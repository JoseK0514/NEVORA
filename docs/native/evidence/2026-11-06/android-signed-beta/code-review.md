# Fresh read-only review of b6ebe40c

Reviewer: android_integration_final_review. Scope: origin/development e9c3a66d through b6ebe40c and private signing helper source/allowlisted metadata. This is a code/release review, not independent QA certification. Findings are summarized below; the original response remains in the reviewer session.

**Critical:** None found.

**Important — CI uploads binaries even when custody checks fail.** The artifact step uses `if: always()` and includes all release APKs and AABs. If the preceding step rejects a changed checkout or cannot find the expected unsigned APK, any remaining binaries still get uploaded. Keep failure diagnostics, but upload only the two exact unsigned outputs after custody verification succeeds. This affects CI; it does not invalidate the local signatures.

**Minor — the checksum file is not portable.** The checksum command records absolute runner paths. Write paths relative to the artifact root so a recipient can use `sha256sum -c` after downloading.

**Assessment:** The evidence supports a locally signed staging beta at `b6ebe40c`. All 53 recorded Android and contract inputs and the beta profile match that commit. The signing receipt records the expected certificate, APK v2/v3 verification, strict AAB verification, unchanged payloads and rejection of both tampered artifacts. Signing used the existing development key. APK and AAB were present locally; I did not rerun the helper or access credentials.

Shared acceptance remains on hold pending the CI correction and successful checks on the exact integration SHA. GitHub returned no runs for `b6ebe40c` when checked. I verified `e9c3a66d` is its ancestor, the remote has exactly the three permitted heads, and PR37 remains an open draft on the held collaboration head. The candidate does not change the held design files or Vercel’s disabled Git deployment setting.

Signed-bundle validation and signed-emulator smoke were pending executor evidence at review time. Physical-device acceptance, native document handoff, FCM, Play upload, distribution and production are unverified. This read-only review issues no independent certification or audit closure.

## Executor correction pass

The Important finding was reproduced by eight real filesystem/Git/ZIP publication tests, all failing before the publisher existed. The correction stages exactly two unsigned outputs and relative checksums only after exact clean-source checks; signed JAR/APK blocks, missing output, dirty/wrong source, symlinks and an existing destination are refused without publication. The download test moves the original paths away and verifies the downloaded checksums with the independent shasum tool. This publication design also addresses the related portable-checksum finding. All17 Python tests and actionlint passed. Binary upload is success-only; always-run diagnostics contain no APK/AAB globs. No second review approval is claimed. Final frozen-source build/signing/CI evidence follows separately.
