# Clocker development CI investigation — November 15, 2026

Development is Jose's primary operating/acceptance release and must meet production standards. Main/production remain protected. Codex owns backend/hosting and Claude owns UI.

## Observed failure and custody

Development d17a2050efa9395feff5ddc6ebbce5a97c8ec7da, CI run 43753368402, Clocker browser job 132932017778: Chromium completed 45 checks; WebKit timed out waiting for Clock In immediately after the first complete four-action lifecycle, before the lost-response scenario (scripts/phase-c-punch-ui-qa.mjs:116). The dependent Phase D and Phase E evidence aggregates failed. The other root jobs and separate Mobile Access workflow succeeded.

The original artifact 14177313773 was downloaded and its owning run/head and SHA-256 586887b172fb5ab5ff204687c0f50ff5c07260ff0bee1d8ae094f56d5280a120 verified. It contains the source-bound report and manifests, but neither the failed screenshot nor diagnostics for that early PIN boundary. Existing diagnostics start only at a later final-PIN scenario and omit punch-state HTTP boundaries. The artifact does not establish a product defect, transient infrastructure cause, or test timing cause.

## Bounded candidate

Add a Node-side observation window at the failed early PIN boundary, preserving the later native-submit diagnostics. Record readiness/keypad/continue phases using the original actions and assertions. Extend the existing redacted observer to the same owned location's punch state/execute/receipt operations, recording only action enum, request ordinal, HTTP status and existing lifecycle/boolean state. No PIN, command, token, URL, response body or employee data is retained. Existing event caps and failure-only snapshot deadlines remain.

Application source, UI, authorization, privacy windows, request deadlines and test deadlines/assertions remain unchanged. This is an evidence-gap repair, not a claim to have established the original timeout's cause. Original reproduction and exact candidate qualification must be reported separately. Do not classify the timeout as flaky solely because a later run passes.

## Ownership

Claude collaboration cb016437baee4ecc54b627fa55db6c934343668c remains held and unimported. Its one 436-path round1/Phase1/Phase2 commit includes UI, related presentation/consumer and authentication/navigation changes. Scope inspection is not behavioral/security/UI acceptance. No Claude checkout, branch or running chat is modified or contacted. Only development may be advanced after its required exact-source gates; no main merge or production deployment is authorized here.

## Evidence

Local external evidence root: /Users/josek0514/Documents/Codex/2026-11-04/https-www-thevelani-com-preview-theme-2/outputs/clocker-pin-fix-20261115

Diagnostic-only external drivers preserve application d17 source, use fresh owned loopback PostgreSQL and fictional fixtures, block foreign network traffic and close their owned resources. They are not substitutes for clean exact-candidate qualification. One initial diagnostic stopped at a separate cold navigation timeout. An accidentally selected SQL run was interrupted through its identified owned Vitest child; its runner stopped its PostgreSQL cluster and it is not passing evidence.

Fresh local diagnostic results on unchanged application d17: 45 WebKit checks passed; the same Chromium-then-WebKit sequence used by CI also passed all 90 checks, with zero runtime/hydration errors. The early observed PIN verify and status responses were HTTP 200 and no unexpected navigation was observed. A new diagnostic regression failed against the old observer (missing all nine punch request/response/completion events) and passed after its bounded extension; all 20 observer tests passed. These establish the evidence-gap repair, not the original timeout cause. Exact candidate SHA, hosted checks and development acceptance are recorded in the external completion receipt after verification; do not assume them from these local results.

## Second hosted observation

Candidate 96d52ebf3d0437ef2d79b492951754edf91aa10a, CI43760416564 / job132953740191, passed the original early re-PIN boundary with PIN verify/status and both development-mode punch-state reads all HTTP200. It later timed out at the recovery re-PIN step waiting to click Check Action Status (line129), after59 checks. The original screenshot capture again did not complete. Artifact14180542203, verified SHA-256 1bd1bdb3f062ec98b88f3b77defde75eaee5d03c21786516d486b19cb527a823, preserves this result. Development remains d17; no candidate failure is waived.

A single early observation window was insufficient for the later failure. The next bounded candidate opens a separate Node-only observation window on every keypad verification, retaining each page's latest window through its ensuing action/recovery steps. A new verification closes only that page's prior window, so the other real tablet remains observed. Existing native-submit diagnostics remain separate. Keypad phases record completion of the test's click sequence, with no assertion of actual input length from a constant. All original actions, assertions, authentication and deadlines stay unchanged. This is still diagnosis, not a causal repair claim.
