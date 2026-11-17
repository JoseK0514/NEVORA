# Fresh weekly feature review

Reviewer /root/weekly_final_review; explicit gpt-6-astra xhigh, fresh context, read-only.
Exact64747c2960e19a3184c36d5eaeb7baf326dc0ca3..dfaa54472d1e8499b89b55be78103d65d1929741.
Review package byte-matched git diff -U10. No Critical or Minor findings; eight Important.

1. weekly-store.server.ts118: retained saved comparison parents permanently consume the200temporary-operation quota, stopping use below1000receipt capacity. Exempt receipt-backed parents; preserve temporary and receipt caps.
2. weekly-service.server.ts44 / weekly-store.server.ts149: validation overwrites bounded summaries with full diagnostics and does not refresh partial; reject valid comparisons. Rebuild/bound projection after validation, leave room for model envelope, recheck exact128KiB.
3. store.server.ts193 / service.server.ts100,191: ordinary reusable history lacks weekly session/freshness custody. Declined/stale/feature-off weekly answer text can reach snapshot/new model request and a second session. Omit weekly-derived turns from reusable history or qualify both paths.
4. weekly-service.server.ts193 / weekly-plan.server.ts91: saved recovery metrics recompute ALL/SELECTED without original published/archived exclusions; denominator changes480to960in automaticWeek(2) probe. Bind to originally included IDs and identify later scope changes.
5. coverage-regressions.ts11 / reviewed-weekly-draft.server.ts93: repeated full scans/date parses blocked a zero-delay timer608ms on700unchanged five-minute intervals. Precompute coordinates and sweep per location; timer/abort regression.
6. weekly-context.server.ts36 / memory.ts274: decisionDate activation omitted; admission-to-tool midnight transitions can disappear because fence derived too late. Bind initial effective memory projection/validity, decision activation and both transition windows.
7. weekly-plan.server.ts24 /0066SQL38: slice(0,120) splits valid astral characters into lone surrogates rejected by JSONB. Scalar-safe display truncation; actual-store regression.
8. coverage-plan.server.ts154 / weekly-service.server.ts67: real81employee/UTF8overflow rejects generic unavailable before planner; reserved retry becomes prior_attempt_failed. Distinct idempotent input-limit outcome, no truncated source projection; actual-route tests.

Declined to judge: combined browser acknowledgement after lost full read and actual citation navigation; real-model50scores; hosted/production/independent certification. All remain explicit blocking gates. Reviewer did not rerun fullSQL/units; used focused read-only probes. Assessment: With fixes. Exact-write/receipt/full-read path and all-observation settlement fences are strengths, not certification of unresolved findings.
