# Calendar login tabs and Home pointer checks

Reviewed the three-file pending diff against ab8ec2a2796179bb6e01f52c20c64abeb0fb6280. Code quality CLEAR. Recommendation APPROVE. Blockers none.

## Findings

CRITICAL, HIGH, MEDIUM and LOW each have zero open code findings.

- scripts/phase-e-calendar-browser-scenarios.mjs lines 84–98 performs real login in a same-context tab and waits for the shell and authenticated notification status. The original scenario tab exercises the legacy fragment redirect and reaches the none state before leaving. The runner subscribes to context page creation before either tab opens, audits the scenario tab and checks collected errors through context closure (scripts/phase-e-browser-qa.mjs lines 77–85 and 235–251).
- .github/workflows/ci.yml lines 717–723 registers the existing pointer suite after both engines install, limited to Home CI leaves. The suite exercises seven fixtures per engine, including genuinely clipped controls.
- The previously loaded programming and remove-ai-slops perspectives found no violations. No error classification, threshold, lifecycle assertion or production source changed.

## Scope of the runtime evidence

The earlier failed receipt at development-publication/calendar-local-1/browser-failure-report.json records WebKit 390, route /app, pending main-frame navigation age 60 ms and a null resource kind. This supports a timing observation but does not establish which fetch failed. The new same-session direct-entry scenario does not exercise a same-tab hard departure from a still-active Home. A passing replay could support calendar entry and lifecycle coverage, but could not establish that the earlier departure error was fixed in the application. The original failure remains evidence. No suites were run for this review.
