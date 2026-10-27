# Continue Nevora Owner desktop in Codex Cloud

Jose authorized publishing this local prototype and full handoff on a feature branch so he can continue from his phone. Everything needed to restore the exact prototype is committed here; no local Mac file upload is required.

**Branch:** `codex/owner-desktop-cloud-handoff-20261027` in private `JoseK0514/NEVORA`.

**Stopping point:** G01-G10 complete in the fictional in-memory Owner desktop prototype. G11 Statements and payment-job visibility is next and unstarted. The accepted premium, clean, mobile-aligned design, behavior contracts and one-group-at-a-time cadence remain the foundation.

## Start in Cloud

Select this repository and feature branch. Give Cloud [CLOUD-START-PROMPT.md](CLOUD-START-PROMPT.md), or tell it:

> Read docs/handoffs/owner-desktop-cloud-20261027/README.md and CLOUD-START-PROMPT.md. Restore the included prototype, then continue as the same conversation using the detailed handoff. G10 is complete; G11 is next. Preserve Jose's foundation and scope.

Cloud runs this from the repository root, choosing a fresh separate workspace:

```sh
python3 docs/handoffs/owner-desktop-cloud-20261027/restore-owner-desktop.py --destination /tmp/nevora-owner-desktop
```

The helper reconstructs the ZIP, verifies each part and the original ZIP SHA/CRC, rejects unsafe paths/links, extracts independent files into a new directory and checks all 11,343 original file hashes. It never overwrites an existing destination or changes the application checkout. No installation/network/credentials are needed to restore. The full archive contains 11,344 files including its own manifest.

The archive is committed as ten parts below GitHub's single-file size limit. Source remains byte-identical inside it. Parts are ordinary Git blobs; Git LFS, downloads from a separate account and paid storage tools are not required. Use the restore command, not individual part files as ZIPs.

## What is preserved

- Runnable Owner desktop source, build, all tests and complete evidence/history/baselines.
- Jose's working agreements, accepted design tokens, previous annotated refinements, components, navigation and privacy/source/unknown-operation rules.
- Completed G01-G10 requirements and reports; original independent findings, reproduced fixes, rulings/costs, known minor and verification limits.
- Detailed G11-G16 and Q01-Q12 remaining work, source maps, exact acceptance conditions and 26 pinned remaining-group application source snapshots.
- Read-only Owner mobile context through its separately reported batch 3.5 and next 3.6. Mobile and desktop inventories/approvals remain separate.
- Twenty named skill instruction sets/reference Markdown. This does not install or authenticate their plugins in Cloud.

Convenient reading copies: [conversation continuation](instructions/START-HERE.md), [design foundation](instructions/DESIGN-FOUNDATION.md), [working agreements](instructions/WORKING-AGREEMENTS.md), [remaining roadmap](instructions/REMAINING-ROADMAP.md), [source map](instructions/SOURCE-MAP.md), [G10 closed boundary](instructions/G10-REMAINING.md), [frozen status](instructions/STATUS.json), [portability](instructions/PORTABILITY.md).

Those copies retain their original extracted-workspace paths; trailing whitespace was normalized for Git display only. Original source/instruction bytes and hash manifests remain unchanged inside the frozen archive. Read canonical instructions from the restored workspace before running their commands. Their historical "not pushed" statements describe the original local cutoff; this transport directory is the later authorized GitHub publication.

## Verification and boundaries

Frozen runtime SHA-256: `f6e3f5b3b332a61f12a2607c9a9728d7086a77747472f5217badc786ad543a3f`.

Local G10: 2,601 browser executions across 60 suites/Chromium/WebKit/Firefox, 424 model cases, 109 syntax checks, final artifact audit PASS. Both earlier bundles were verified; full restored-bundle audit also passed. The publication's separate restore/build/audit result is in `publication-verification.json` once prepared. Historical prototype results are not a new Cloud or production certification.

Branch base: freshly fetched `origin/development` at `84c3fc357b006220ef6bbf29580e7327228c9659`. Actual-app source reference used by the mockup remains clean pinned `46e202786863279302026ee03a0e225c359fa55c`. These are different facts. Strict source audit needs a separate clean checkout of the pinned commit; snapshots do not replace that gate. Root application TypeScript/ESLint/CI/configuration stay outside this handoff's changes, and source restoration occurs outside their scan.

No PR, main/development merge, app integration or production release is part of this upload. No live data, messages, financial actions, credentials, paid tools or analytics changed. G11 is planned; this request does not authorize running all remaining groups unattended. Preserve future edited source/evidence in durable authorized storage before a Cloud session ends.
