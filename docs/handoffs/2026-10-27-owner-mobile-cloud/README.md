# Nevora mobile Owner — continue in Codex Cloud

This is Jose's complete continuity handoff, published on a dedicated feature branch so it can be accessed from a phone. It is the accepted standalone mobile Owner mockup through **3.5 Features and words**. Next is **3.6 Company/location operational policies and history/conflicts**. Preserve the existing design and standards; no new foundation interview or redesign is needed.

**Repository:** JoseK0514/NEVORA (private). **Branch:** `codex/owner-mobile-cloud-handoff-20261027`, created from development `84c3fc357b006220ef6bbf29580e7327228c9659`. This branch contains only this handoff directory; application code, build/configuration, CI, databases and deployment settings are unchanged. No PR or merge is part of this transfer.

## Start on your phone

In Codex Cloud, select this repository and the branch above, then use [CONTINUATION-PROMPT.md](CONTINUATION-PROMPT.md). The files are already in GitHub; no upload from your phone is needed. Access through the user's authorized private-repository connection is still required; publication does not verify that connection or create a Cloud task automatically.

## Start in the Cloud workspace

From the repository root:

```sh
python3 docs/handoffs/2026-10-27-owner-mobile-cloud/prepare_cloud.py
```

The command verifies the three archive parts and combined hash, safely extracts every original file into a new temporary directory outside the application checkout, then runs the package's source/manifest validator. It prints the exact package path. From that path, read `AGENTS.md`, `START-HERE.md`, the linked design/context/working agreements and `NEXT-BATCH-3.6.md`. Build/serve the mockup there using the commands provided. No application npm script or credentials are needed. `--destination /tmp/<new-directory>` can choose an explicit new package folder; existing destinations are refused.

The source and evidence are archived to prevent their reference TypeScript/tests/helpers from entering application compilation or lint. No test/config control was weakened. Archive parts are joined automatically; do not edit them by hand. The full payload contains the canonical `work/owner-mobile` source, self-contained artifact, accepted design, user agreements, all43 remaining workflow groups and complete roadmap, historical contracts/plans/ledgers/snapshots/checks/screenshots, latest independent review and pinned actual-app source reference. No credentials/env/dependencies/Git metadata were included. Payloads are plain Git files; no Git LFS setup is needed.

When returning new mockup work to Git, preserve the original published payload and save a separately identified next-batch source/evidence artifact. Keep reference/app fixture code isolated from the app's compilation inputs; do not silently change app config to accommodate it. Actual app integration remains separately authorized.

## Readable references

- [Full starting context](START-HERE.md), [conversation/design decisions](CONVERSATION-CONTEXT.md), [user working agreements](WORKING-AGREEMENTS.md).
- [Immediate next batch3.6](NEXT-BATCH-3.6.md), [all43 remaining groups](ALL-REMAINING.md), [full delivery plan](owner-mobile-delivery-plan.md), [phase gates](owner-mobile-quality-gates.md).
- [Latest verification report](LATEST-REVIEW.md), [original independent review](INDEPENDENT-REVIEW.md), [review disposition](LATEST-REVIEW-RESOLUTION.json).
- The exact current self-contained artifact is `outputs/nevora-owner-mobile.html` inside the full payload; serve the extracted package to interact with it. Its original bytes are preserved, including historical formatting.

## Verified boundary

Current UI SHA-256: `65f2a5d5cbb596f90a2d08adb2fca30c869e1142e8325e9d25f23326e70d1c64`.
53working bounded mockup groups /43remaining-or-partial /4Owner exclusions. Those are inventory groups, not production-completion percentages.

Latest executor matrix:1230browser/125model/8source checks,45captures and162contrast samples. Independent PASS/APPROVE/WATCH on unchanged source,54focused checks independently passed. One LOW live-resize scroll-clearance issue is documented; no material blocker. The handoff's separate disposable portability smoke passed35browser+19model checks. No actual Cloud/Linux/device/real-assistive-tech/server/production certification is claimed. Extraction/transport verification for this publication is recorded in PUBLISH-VERIFICATION.json.

## Publication boundaries

Jose explicitly requested pushing a new feature branch to this existing repository without merging. Seven remote heads were observed before this task; this task created exactly one handoff branch. Remote verification later observed nine heads, reflecting concurrent branch activity. The timestamped observation is in PUBLISH-RECORD.json. The existing seven-branch source/assembly policy is unchanged and **must be reconciled before any future integration/assembly**. No branch was deleted, release gate bypassed or global ceiling changed; a passing assembly/source gate is not claimed. Exact authorization/scope and review trigger are recorded in PUBLISH-RECORD.json. Main/development and the Vercel Git-deployment hold remain unchanged.
