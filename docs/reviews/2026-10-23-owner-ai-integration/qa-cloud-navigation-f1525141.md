# Independent QA correction assessment — f1525141

QA recommendation: **GO WITH CONDITIONS for local engineering readiness. NO-GO for closing the mandatory cloud gate until a fresh required cloud run passes.**

Jose: I independently reproduced the committed correction with the unfiltered full Phase D suite in Chromium and WebKit. The new controlled return and all downstream checks pass. QA-CN01 is **closed locally on f1525141a647ed1947462e8ee6240744cd4e63f5**. The original failed cloud result remains a failed result.

## VERIFIED — actual execution

Exact source: clean HEAD `f1525141a647ed1947462e8ee6240744cd4e63f5`, tree `399134a25f2b75dab121e8140f8286a14b286ece`. Command, environment, action transcript and machine report are linked in the manual QA matrix. `PHASE_D_QA_ENGINES` and `DATABASE_URL` were unset; both default engines ran on a fresh owned local PostgreSQL database, owned Next runtime and local SMTP sink. Exit 0, **203 check groups: Chromium 102, WebKit 101; zero errors, network cancellations or runtime diagnostics**.

The controlled scenario explicitly retires authority through blur, verifies “View paused” and absence of `#timecard-D3-E`, registers an actual protected response listener, and observes a real same-route RSC request. The response is constrained to the owned origin, POST `/api/timecards`, Manager actor `D3-M` and Sep 21–27 request body. HTTP 200 and body completion are required. The application's `parseCurrentTimecards` validates readiness, bounded lifetime and period structure; the reviewed employee must be present. The selected URL and actual card opening are then checked under the original shared 15-second deadline.

Chromium completed that sequence in **167.992 ms**, with `validForMs=14987`; WebKit in **161.381 ms**, with `validForMs=14985`. Both responses were completed 200 bodies for `2026-09-21` through `2026-09-27`. Subsequent real reapproval, finalization, neutral and mapped downloads, mapping, reports, inbox, clocker and account recovery completed. The new assertion did not truncate downstream coverage.

## VERIFIED — cause and correction

I previously reproduced the actual same-URL interruption independently at 99f155f5 by issuing the old goto after observing a real RSC request. The preserved timeline shows RSC cancellation, Next's fallback, and competing document navigation. This distinguishes a driver-induced native-navigation collision from a proven application data failure. Original macOS headless focus evidence did not establish whether native foreground or the proactive refresh timer initiated that original RSC; the report retains that limit.

I audited the implementation owner's separate ef4e17eb regression RED artifact: 21 checks, two errors, the same exact interruption, and a closed owned runtime. That execution is attributed to its owner, not relabeled as mine. The ef4e17eb→f1525141 diff removes only the redundant goto. My fresh f1525141 execution supplies independent GREEN evidence.

The complete 99f155f5→f1525141 diff changes only `scripts/phase-d-browser-qa.mjs`. No application, schema, migration, provider budget, error filter or deadline helper changed. The shared deadline helper covers the whole sequence, including response completion and UI readiness. The only response-predicate catch rejects unparsable request data; it does not suppress navigation errors. I found no blocking fixture assumption: synthetic lifecycle dispatch is explicitly labeled, actor and period are constrained, and the real response is parsed. The RSC predicate itself checks path/origin/header rather than query; the protected request-body match, response parser and final exact URL enforce the selected period.

## VERIFIED — custody

All **1,866** source-manifest hashes independently match the frozen checkout. Ownership records source/mirror verification and closure. I additionally verified server PID absence and closed loopback port; the runner logged owned PostgreSQL stopped and removed. Browser/server/SMTP closure is awaited by the unchanged harness finalizer. Checkout remained clean at f1525141. No product, test, script, index or HEAD edits were made by this QA task. QA runtime custody is complete and the source freeze may release.

The 390px Chromium and WebKit timecard screenshots were inspected. They show the actual period/card surface before the controlled return, not a screenshot of the fresh-return instant; the executed assertions and response report are the evidence for that sequence.

## RISK / BLOCKER — remaining gates

- **BLOCKER:** workflow 39995101398's mandatory phase-d-attendance-ui failure remains open until a new required cloud run on the corrected candidate succeeds. Local GREEN cannot replace it or certify Linux/WebKit parity.
- **RISK:** explicit blur/focus in headless browsers does not certify physical-device, native OS foreground or screen-reader behavior. The prior held-authority diagnostic and current controlled test are deliberately scoped.
- **RISK:** hosted acceptance, production environment/database parity and any separately required provider/budget approval are not established by this local driver review. Other independent reviews and release/source-retirement gates remain owned by their respective reviewers.

No new product defect identified in this correction. Prior reports and raw RED evidence are preserved unchanged.

Evidence: [manual QA matrix](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/cloud-nav/owner-ai-cloud-navigation-fix-manual-qa.md), [machine matrix](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/cloud-nav/fix-manualQa.json), [fresh report](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/cloud-nav/fixed-both/report.json), [fresh transcript](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/cloud-nav/fixed-both.log), [custody audit](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/cloud-nav/fixed-both-custody-audit.json), [prior independent investigation](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/reviews/qa-cloud-navigation-99f155f5.md).
