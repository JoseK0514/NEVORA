# Native theme probe assessment

Read-only review of `local-probes/theme-race-native-select-red.json` and `theme-race.mjs` under `outputs/employee-mobile-profile`. No source changes or runtimes by reviewer.

The trace materially supports the proposed coalesced-media explanation: native select System applies dark while the retained MediaQueryList reads true; immediate light emulation yields a fresh query false; after two animation frames both retained/fresh are false, no change event was observed, and theme remains dark. The wrapper retains the native object and only adds tracing. The probe extracts the real boot script, but its choose function manually reproduces the writer, so this is diagnostic evidence rather than a full production-writer regression.

An immediate apply plus one next-frame reapply in the existing owner is now a reasonable bounded candidate. Acceptance still requires executing the actual exported writer/boot script in regression tests and the unchanged native sequence against the candidate. The RED trace alone does not establish that the proposed callback always runs after media recomputation. Reapply must read latest choice so a later explicit or storage choice is never overwritten by captured System state. Do not expand to another owner or repeated timers absent evidence.

codeQualityStatus: BLOCK
recommendation: REQUEST_CHANGES
blockers: QA-PROFILE-001 remains open pending implemented candidate and native regression/full QA evidence. This assessment does not close QA or supersede its finding. CRITICAL/HIGH: none established; MEDIUM: the reproduced System appearance mismatch remains.

Previously loaded remove-ai-slops/programming criteria applied: evidence now justifies investigating a bounded lifecycle adjustment; no approval for speculative machinery or weakened assertions.
