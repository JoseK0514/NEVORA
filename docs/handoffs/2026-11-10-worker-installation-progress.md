# Browser worker installation progress

November10,2026. Continuation of the notification/recovery/NV156 source ec2887ca8. Native app/device/store work stays separate. No production or real notification delivery was enabled.

## Problem and change

Actual Chromium cold installation of the existing worker remained installing after only three public-asset requests. The same behavior occurred without browser network routing. A controlled replay changed only immediate response-body consumption and completed all seven real fetches/readiness; small nonempty synthetic bodies still stalled, so a size-only explanation was rejected. Actual VM regressions failed on the old installer for unread-body progress and incomplete-body refusal.

Functional commit80a746bfdfabd5f467ecb270d0eb9ab6b89242ee makes each existing public fetch validate its status/redirect/type and drain a clone body immediately, retaining the original Response for cache.put. All downloads must complete before public-cache writes. Existing paths, credentials-omit/redirect-error/no-store, original metadata/bytes, cache keys/scope, owner/suppression state, finite copy-pair admission and normal waiting lifecycle remain. There is no skipWaiting, claim or forced reload.

This is download validation before writes, not a new atomic cache transaction: a later cache.put/quota/storage failure can still leave some entries written, as before. The fixed current seven public bodies total480932bytes; no arbitrary/private URLs were added. Supporting Chromium implementation/test links are in the external Task3 report; the local red/green proof drives the fix and does not certify a universal browser slot count.

## Actual evidence

Focused existing worker/payload/device-client tests:199passed; owned lint/whitespace passed. Final committed-source Chromium attempt7 passed13checks, with clean80a source before/after. Cold and updated current caches each contained every real public body with exact size/SHA256. A controlled raw old-worker bootstrap used explicitly synthetic zero-byte public bodies only to establish old owner/suppression state; all real current bodies were restored before update. The new worker waited while a controlled tab retained unsaved fixture work; closing controlled tabs allowed normal activation. Old/new same-kind pairs, invalid/mixed/private/expired rejection and owner/suppression preservation/rotation passed.

Seven raw ERR_ABORTED events remain in evidence, strictly attributed to the exact legacy script, install-legacy stage, HTTP200, zero synthetic bytes and seven known paths; independent unchanged-source diagnostic replays reproduced them. Current-source real-body failures and runtime errors were zero. No blanket exclusion exists. Earlier failed attempts, preflight typo, disproven diagnostic expectation and diagnostic filename-reuse/reconstruction note remain visible. Original early attempts' unconditional display-hook flag was inaccurate because installation never reached the hook; the reports disclose that correction.

This proves local browser worker lifecycle/storage/admission functions on an owned loopback fixture, not full application/UI, an actual PushEvent, OS notification or hosted client rollout. Display hooks were intercepted and unused. All owned contexts/browser/server processes closed; no SQL, production credentials, external provider or real messages were used.

Evidence root: /Users/josek0514/.codex/web-read-completion-20261110. Actual final browser artifacts: service-worker-refresh-attempt-7/result.json, run.log and harness.qa.mts. Task3 report/red/green/review artifacts are in the per-plan scratch until final archive; the current server-followup-final-verification.json points to their final location. This final metadata source's combined default/typecheck/build/package/source reconciliation and exact hosted CI are recorded in that source-bound receipt. Earlier cb53/ec checks qualify only their own source; no pending test or old-source green result substitutes.

## Scope, owners and next gates

CTO/CISO: smallest proven progress fix with existing download, cache, privacy and ownership boundaries retained. Assurance: controlled causal replay plus regressions and real Chromium checks, with explicit bootstrap/error-classification limits. Governance/program: no policy exception accepted; root owns combined checks/review/development publication and exact CI. Actual hosted refresh and separately authorized channel acceptance remain required before real notification delivery.

Fresh source reconciliation recorded held Claudeb49953238: two closing passes through45125ce0d/113paths, followed by one review-README-only decision record; static/selected-contract inspection only, no UI import/functional certification. Its added NV142 subject request and other P2/P3/kiosk/owner decisions stay in the external backlog disposition. Separate signup0c414 and selected UI still require actual combined integration/qualification under their owners. No owner chat was interrupted.

Finite staging worker activation retains exact source/artifact/plan binding, terminal CI, Jose's explicit approval and current private custody/headroom/window/backup/grant/closed-probe/idle gates. No paid apply, quota update, credential handoff, staging grant/SQL, main merge or production release occurred here. Native delivery remains separate. Dynamic receipt/packet versions supersede older operational snapshots without implying approval.
