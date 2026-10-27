# Profile review — reopened System appearance investigation

Candidate4bf72579. Prior approvals are historical bounded code reviews, not current final acceptance.

- codeQualityStatus: BLOCK
- recommendation: REQUEST_CHANGES
- blockers: resolve independently reproduced QA-PROFILE-001 or demonstrate an evidence-backed fixture correction and rerun the unchanged substantive requirement.

CRITICAL/HIGH: none established. MEDIUM: System appearance mismatch reproduced in independent full QA. LOW: prior observation is now superseded by this reproducible acceptance blocker.

Independently read `src/lib/theme.ts:7,13–17`, `src/components/theme-switch.tsx`, and integration System steps (`src/test/integration/employee-mobile-profile.integration.ts:90–91`). Independently inspected QA artifact `outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/profile/firefox-theme-diagnostic.json`: html dark, choice system, stored null, newly queried prefers-dark false, visible page. This establishes inconsistent final state, not event ordering or cause.

The boot script retains one MediaQueryList and synchronously reads it during apply. Subsequent correction depends on its change event or storage event. The fixture emulates dark while explicit dark is already selected; the following html-dark poll can succeed without a media-change delivery/render boundary. Then selecting System synchronously applies current media state before immediate emulation back to light. Event coalescing or stale retained-MQL state is plausible. Diagnostics query a new MQL, so they do not distinguish those explanations. No cause is proven from source alone.

Required next evidence: minimal native sequence using actual theme owner, logging boot-time MQL.matches and fresh query.matches, event delivery, apply invocation/result and animation-frame boundaries. Compare explicit-dark → emulate-dark → System → emulate-light with a controlled event/frame boundary, and a native System media transition without choice switching. Preserve failing sequence; do not turn a wait or longer timeout into a claimed application fix.

A bounded next-frame reapply in the existing writer is a possible hypothesis, not an approved fix. It must preserve immediate apply and reread current choice rather than capturing System, so later explicit choices/storage changes win. Verify whether one frame actually closes the observed gap; do not add a parallel theme owner, repeated timers or synthetic events merely to obtain green output. Include actual rapid-choice precedence and storage behavior if shared theme owner changes.

The loaded remove-ai-slops/programming perspectives favor a proven lifecycle fix over speculative normalization, duplicate listeners or assertion weakening. No runtime or implementation changes by reviewer; QA retains runtime custody.
