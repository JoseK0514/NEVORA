# Independent QA — Owner AI integration

**QA recommendation: GO WITH CONDITIONS for local service, SQL and deterministic provider-boundary readiness at `783bb7e003381ff42ff6bb6a543814dc1c51996c`.** This does not certify browser/UI, actual HTTP transport, live-model answer quality, cloud CI, hosted acceptance or production readiness. Independent UI/security decisions and all release gates remain mandatory.

Report to: Jose, independently. Reviewer: independent QA executor. No product source, repository test, index or HEAD changes were made by QA. No agents spawned. All new QA fixtures and receipts are outside the application checkout. No provider/network delivery, production credentials or production/customer data was used.

## Exact custody and change in recommendation

Initial frozen candidate: `2830a1484b6f28c5a5f4baed20c9a5cbebcf9f46`, based on development `40282f12c9f42ba00ed0f116c1dc6e42775efe8d`. Initial tree was clean. QA hashed 5,197 tracked files. During the foundation run, implementation advanced to `fdd0b31f4202e76eca87a8f273d73291669b771f`, adding the citation regression and browser target assertions only. QA detected this transition itself; all application code and the running foundation suite remained byte-identical. This is explicitly retained in `qa/test-only-transition.diff` and custody manifests.

**Initial verdict: NO-GO.** QA independently reproduced the reported citation defect at that test-only head. Four valid period tools returned nine distinct citations, and seven returned fifteen; both answers failed actual client parsing with `Invalid advisor response`. The source could finish a valid investigation but the Owner could not consume its structured answer. `qa/citations-red.log` records two failures and one correct oversized-output rejection. `qa/initial-verdict.md` preserves the original verdict; it has not been rewritten.

**QA-I01 closure addendum, independently reproduced on `783bb7e0`:** the fix shares the unchanged eight-tool budget and derives a fifteen-citation answer bound. Only answer parsing receives that bound; other source parsers retain their prior bounds, and URL validation is unchanged. QA inspected the entire four-file production diff and reran the actual producer→public-parser regressions plus adjacent provider/parser/projection checks: **64 passed**, including nine/fifteen citations retained and sixteen rejected. QA also reran all **38 advisor SQL cases** on the final candidate. QA-I01 is closed by this independent reproduction, not by the implementation owner's claim.

`qa/custody-fixed.json` lists every changed and added tracked file. Changes from the original candidate are four production files (CSS, public-response parser, contracts constants, loop constant reference), browser assertions and one new citation test. No schema, canonical scheduling, timecard/payroll projection, authority, persistence or foundational fixtures changed. Therefore QA explicitly transfers the unchanged 281-case foundation, 39-case canonical coverage and seven supplemental period results to the final candidate; these are not described as fresh final-head executions. The affected advisor/contract suites were rerun. CSS/touch-target acceptance belongs to the independent UI reviewer; this report does not self-close UI-1.

## VERIFIED — executions and limits

| Evidence | Actual result | Source custody |
| --- | --- | --- |
| Original advisor owned PostgreSQL | 38 passed, six files | Original application source |
| Canonical coverage repair owned PostgreSQL | 39 passed | Original source; unchanged canonical code transferred |
| Foundation owned PostgreSQL | 281 passed, ten files | Original source; test-only HEAD transition detected; unchanged suite/schema transferred |
| Independent period probes outside product tree | Seven passed | Original source; unchanged period/service behavior transferred |
| Original provider/briefing/period deterministic regressions | 59 passed | Original source |
| Fixed citation/parser/provider/briefing regressions | 64 passed, six files | Final `783bb7e0` |
| Fixed advisor owned PostgreSQL replay | 38 passed, six files | Final `783bb7e0` |

No skips occurred in these final executed suites. Every owned cluster stopped normally. The database fixtures create fresh loopback PostgreSQL and delete only their own databases. `DATABASE_URL` was unset. The inspected generation-prefix adapter only adapts the fresh owned target name; it retains the loopback/name guards. No notification worker ran; publication tests assert local outbox semantics without delivery.

The SQL cases verify concurrent asks across two Owner sessions, shared request caps/private histories, competing priorities and triage, replay/stale evidence, missing/empty/current published snapshots, availability/position eligibility, exact draft confirmation, separate published consent, actual PostgreSQL lock waits, expiry/logout races and complete business/history/outbox rollback. Historical-upgrade columns, constraints and indexes match the current-runtime schema, including both advisor migrations.

The seven independently written period probes supplement repository tests. They compare **all 112 public tables** around valid and invalid read-only requests; accept the 1-day and 31-day English/Spanish boundaries; reject 32-day/reversed/invalid dates, unsupported language and injected approval authority; make a missing payroll view explicitly unavailable/partial; honestly cap eleven distinct overlapping approved runs to ten while leaving readiness unverified; discard actual period results after logout, demotion or workspace deactivation; and retain finalized historical revision two while excluding private approval notes and duration fields. A global fetch spy rejects unexpected network calls and was never called.

The first overflow fixture attempted duplicate original payroll periods and failed the real unique constraint before its assertion. QA retained `qa/independent-period-fixture-red.log` and the original fixture, then used eleven distinct overlapping periods. The overflow assertion was unchanged. This is a corrected QA fixture, not a product issue or a hidden pass.

Previous executor logs were read and hash/tail receipts retained in `qa/prior-evidence-audit.json`; their 38/39 summaries matched the underlying files. Fresh executions above, rather than those historical claims, support this verdict. Prior missing-setup, removed-weekday-rule, changed-invalid-position and 1,001-proof cases pass independently in the current SQL/projection suites. Historical browser consent closure remains the UI reviewer's evidence.

## ISSUE / RISK / BLOCKER

- **ISSUE QA-I01 — CLOSED at final candidate:** valid multi-period citation output exceeded client parsing capacity. Independent RED and GREEN artifacts are preserved as described above. No unresolved material QA issue was found in the exercised service/SQL scope.
- **RISK QA-R01 — historical extraction growth:** `briefing.server.ts` and `tools.server.ts` read full canonical scheduling history before applying row caps. `generation-guards.ts` aggregates the complete source tables. These are downstream processing caps, not SQL extraction bounds. No load/performance certification is given; retain the existing bounded-reader follow-up before claiming scalability.
- **RISK QA-R02 — live reasoning remains unverified:** deterministic provider fixtures prove transport and capability boundaries, not real-model semantics or broad blind prompt-injection resistance. No additional metered allowance was authorized for this QA task.
- **BLOCKER QA-B01 — release certification:** matching remote candidate/test-merge and development CI, source-inventory compliance, approved isolated hosted environment/database, migration/rollback execution and hosted acceptance are not verified here. Program-reported branch-retirement/source gates remain owned externally; QA does not adopt a stale branch count or treat local passes as their closure.
- **BLOCKER QA-B02 — independent surface gates:** the independent UI specialist owns UI-1 and actual browser acceptance; engineering/security owns its final disposition. The parent owns default suite/type/lint/build. Those results are not independently claimed in this report. Publication/integration must wait for the required complete gates. Production remains Jose's separate decision.

No user permission is requested by QA for this completed local review. Next required action is for release coordination to collect independent final UI/security decisions and satisfy the source/cloud/hosted prerequisites; a new live-model run separately requires an explicitly approved budget and data envelope.

## Evidence locations

Complete structured scenario matrix: `/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/owner-ai-integration-qa-manual-qa.md`.

Machine-readable `manualQa` with `surfaceEvidence`, `adversarialCases`, `artifactRefs` and artifact hashes: `/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/manualQa.json`.

All PASS references are non-empty and independently inspected. Blocked hosted/model cases are explicitly failed for missing prerequisites, not skipped or inferred. Actual HTTP was not invoked in this delegated service/SQL scope; direct Request/Response handler tests are identified as such. No browser screenshot or network certification is claimed from CLI output.
