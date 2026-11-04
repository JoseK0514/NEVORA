# Fresh native dispatch review — November 4, 2026

Reviewer: /root/native_dispatch_review, gpt-6-astra high, read-only. Base80891a61 plus the complete server working diff. Changes requested: one Important, one Minor, no established Critical.

## Important: Retry-After

worker.ts uses shared retryDecision, whose existing Web Push policy caps provider delays at3600 seconds. Native adapters intentionally preserve longer validated Retry-After values. Reviewer directly reproduced native Retry-After7200 causing a retry after3605.908 seconds. Preserve the native minimum separately, expire if it reaches source expiry, and leave Web Push policy unchanged. Correction must have observed RED/GREEN plus relevant suite.

## Minor: quiet-boundary test specificity

The original credential-wait test advanced9hours, exhausting worker budget/lease as well as crossing quiet hours. Replace with a200ms crossing while budget/lease remain live; assert exact quiet-end deferral. The SQL test named “source or browser session” only revoked session; add separate source/preference mutation coverage.

## Review focus

Inspected canonical signatures, immutable challenges, current session locks, generations, token uniqueness and receipts; no additional concrete defect identified. Inspected stale generation/lease completion and invalidation fencing; no additional concrete defect. Handoff repeats canonical source/access and installation/session checks after credentials; real SQL/OAuth fixture exercises session deletion. Inspected fixed destinations, size/deadline/abort bounds and redacted errors; Node IO tests use EventEmitter doubles. Native completion stays separate from Web Push state, with both repositories exercised by mixed-device tests.

## Operator observations

Native dispatch depends on the current application's readNotificationConfig.featureEnabled, which includes Web Push public VAPID and subscription encryption readiness. This preserves current business notification production gates; document this requirement. Either native provider enables dispatch; unavailable other-platform provider returns terminal provider_configuration. No optional observation is treated as release acceptance.

## Declined judgments

Reviewer did not rerun or certify executor225focused/42SQL/default-suite claims. No actual provider connectivity, real-socket TLS/parser behavior, credentials/accounts, device display/delivery, platform capability changes, hosted journeys, source inventory, release or deployment was verified. This is a server code review, not independent QA or release approval.

Original terminal review is retained in this Codex chat's native_dispatch_review agent response. This file is the executor's faithful transcription/condensation, not a new reviewer judgment.
