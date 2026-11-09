# Phase 3 association preparation review

Reviewed detached 8630e5af2017f1b31515b250179250127629d178 through 5fc0aa81f5ec1e45c41a3979d2b98591d3bfe79e against the November 5 association preparation plan and the approved native Stage C spec. Reviewed all ten changed files, the review package and progress ledger under .superpowers/sdd/2026-11-05-native-phase3-association-preparation/, and the two existing example documents.

## Strengths

The generated Apple routes and both platforms’ credential relations match the existing examples. Exact origin comparison, DNS-label validation and explicit local suffix checks reject the listed literal origin classes. Certificate rotation preserves distinct supplied values and rejects case-only duplicates for ordinary JSON arrays. Directory creation and exclusive file writes preserve existing destinations and ordinary destination symlinks. The receipt binds output bytes to hashes and accurately keeps signing, hosting and device verification false. Installation, hosting and release remain separate gates in the handoff.

## Evidence and skill checks

Independently reran the 13 focused Node tests with an allowlisted environment. All passed with zero skips. The committed RED, GREEN and native-suite logs decompress to the three raw SHA-256 digests in docs/native/evidence/2026-11-05/phase-3-preparation/test-artifacts.json. The recorded suite has 27 passes and zero skips. The broader suite was inspected from its archived log. Git diff --check passed for the reviewed range.

Consulted both omo:remove-ai-slops and omo:programming. Tests exercise output semantics, errors, real CLI invocation and filesystem effects. No deletion-only tests, tautologies, brittle prompt assertions or unrelated production extraction found. The CLI boundary warrants validation. Two undocumented package restrictions and dense formatting are addressed below.

## Issues

### Critical

None.

### Important — HIGH

1. **The external-output boundary can be bypassed on the review Mac.** At native/association/prepare.mjs:43–47, realpathSync preserves the caller’s capitalization on this case-insensitive filesystem and path.relative compares the resulting strings case-sensitively. A read-only probe of the uppercase checkout basename confirmed the same directory inode while the actual calculation returned ../NEVORA-NATIVE-EMPLOYEE-OWNER-20261101/hypothetical-output. A normal user can therefore create a bundle inside application source despite the documented guarantee. Enforce containment using physical directory identity, or filesystem-canonical path casing with evidence for supported platforms. Add a regression using a differently cased alias on case-insensitive volumes. realpathSync.native resolved the two spellings identically on this machine.

### Important — MEDIUM

2. **A sparse fingerprint array emits an invalid assetlinks file through the documented JavaScript API.** At native/association/prepare.mjs:22–25, every and map skip holes. With a valid config and Array(1), an independent associationDocuments probe produced sha256_cert_fingerprints equal to [null] in serialized JSON. prepareAssociations shares this validator and can issue a prepared receipt for that payload. Iterate all indices/values and reject missing fingerprints before creating output. Add one exported-API regression. JSON CLI input cannot represent a sparse array.

3. **The CLI checks a different file operation from the one it reads.** At native/association/prepare.mjs:70–72 the initial lstat constrains the name at that instant. Replacing or growing the file before readFileSync completes bypasses the 8 KiB limit. A replacement symlink also bypasses the regular-input check. Open the input once with no-follow semantics, verify the opened descriptor is a regular file, read at most 8193 bytes and reject overflow. This is a local concurrency issue with the explicit size/refusal contract.

### Minor — LOW

4. **Two undocumented segment-count ceilings narrow the public input contract.** At native/association/prepare.mjs:20–21 a suffix quantifier allows at most ten bundle/package components. For example an Android ID with eleven short alphabetic components fits the byte-size bound and package grammar but fails validation. Remove the component-count caps unless there is a project requirement for them. Align the accepted identifiers with the supported signed artifact formats.

5. **The security-sensitive checks are difficult to audit.** At native/association/prepare.mjs:12–25 and :34–35 several distinct decisions and nested document fields are squeezed into single lines. Reformat the predicates and output shapes during correction. The programming readability perspective applies without introducing new abstractions.

## Recommendations

Use the single executor correction pass to close the external-directory bypass and both input-boundary defects. Record failure and success through the affected entry points. Keep generated fixtures external and retain the open independent, device, account and deployment gates.

## Declined to judge

- Actual account enrollment, authoritative identity ownership, DNS resolution/hosting, platform verification, physical-device journeys, signing, release readiness and development integration require separate evidence. Only the tool’s honest representation of these states was judged.
- An adversarial process with filesystem permissions to replace output ancestors during the operation is outside the documented private-runtime workflow. Ordinary destination collisions and stable symlinks were reviewed. No claim of protection against hostile same-user changes is supported.

## Assessment

**Ready to merge? With fixes.** The source-containment bypass defeats a stated guarantee in the project’s current environment. The exported API and bounded CLI input also need corrections before accepting this preparation checkpoint. No release or account action follows from this review.

- codeQualityStatus: BLOCK
- recommendation: REQUEST_CHANGES
- blockers: findings 1–3
- reportPath: .omo/evidence/native-phase3-association-preparation-code-review.md
