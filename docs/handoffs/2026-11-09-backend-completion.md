# Remaining web backend remediation and staging adoption

Jose approved the November 9 inspection's remaining work, excluding native applications and native push. Runtime fixes are committed at `8e4b4d9dce4f9952bf34a1c37be2223d57b7cead`, on top of development `4ee21b69`. Claude retains product UI ownership. This handoff does not authorize production.

## Delivered fixes

- **F1 timecard recovery:** a committed reopen now recovers its exact receipt after later payroll approval. New paid-hours changes remain blocked. Current employee locks and both operational authorization fences remain. SQL still owns actor/company/command-hash receipt matching.
- **Q1 privacy:** the replay exception is limited to the authenticated actor and current workspace. A second Owner sees the identical paid-time denial for a known foreign operation and a fresh UUID. Same-actor changed payloads still conflict.
- **Payroll release checks:** both dedicated real-SQL suites are in the existing mandatory `release-postgres` CI job, with JSON artifacts retained. A failing/missing suite is not suppressed.
- **Three recorded operations deferrals:** a typed SELECT-only health-reader seam replaces the malformed-result double cast; the routing-reader view has a fixed column projection; receipt validation is split into readable guards with its original invariants retained. An actual SQL future-column test demonstrates that setup reruns do not expose new registry data.

The one independent whole-change review reproduced F1 against baseline and candidate, identified Q1, and independently closed both after the narrow amendment. Its 19 amended probes passed, including changed command, foreign workspace, post-admission demotion, logout, paid-time and ledger invariants. Original findings and recheck are preserved separately:

- `/Users/josek0514/.codex/backend-completion-20261109/independent-review/review.md`
- `/Users/josek0514/.codex/backend-completion-20261109/independent-review/amended-addendum.md`

## Verification obtained

The final runtime source `8e4b4d9d` passed 11,579 default assertions with zero failures; 857 skipped and 55 pending assertion records remain explicit. Both dedicated payroll suites passed again, native 44/44 and configurable 37/37. Typecheck, changed-file lint and the Next release build exited zero. Full timecard SQL passed 15/15. Earlier unchanged operations code passed 33 unit and two owned SQL checks; the CI contract passed 19 checks. Deletion intake/withdrawal SQL passed 14/14.

The complete source-qualified onboarding acceptance at the preceding runtime commit `f8f6b846` passed all five steps: inventory, manifest, 139 onboarding, 505 Company Access foundation and 36 exchange cases. It includes actual owned dump/restore retirement. The original unsuccessful invocations remain retained: one selected the server-tools directory without dump/restore clients; the next correctly refused generated payroll outputs in the clean checkout. The correct client path and externalized fictional PDF outputs resolved those invocation errors; no test, ownership check or timeout was weakened. The subsequent `8e4b4d9d` amendment changes only timecard recovery scope and its test. Exact final development CI remains a separate current-head gate.

Evidence is under `/Users/josek0514/.codex/backend-completion-20261109/`, including `final/`, original RED/GREEN runs, accepted onboarding receipts and generated fictional PDFs. Source custody and current remote checks are retained there. Six clean source-labeled Neon bundles were prepared at `8e4b4d9d`; they are not relabeled or claimed deployed by this handoff.

## Actual bounded staging work

Jose separately approved the [activation proposal](/Users/josek0514/.codex/backend-completion-20261109/activation-plan.md): renew only existing test Company A's active-time quota from 3,600 to 7,200 seconds; back up/qualify the two existing test companies; apply the memory migration. No paid plan or third company was created.

1. Company A's HTTP 402 was traced to active time 4,064 against its 3,600-second project cap. Only that approved cap was renewed; all other configured quotas were preserved. The database then admitted the intended test anchor.
2. Both test registry records and company anchors were suspended using exact IDs, environment, incarnation and expected revisions. Provisioning had two ACTIVATED operations and zero active leases.
3. Actual provider snapshots were created while suspended: A `snap-small-credit-bcwn657z`, B `snap-hidden-tooth-bbwkyqs3`, each expiring November 10 at approximately 22:50 UTC. They were restored to separate suspended test branches. Company identity, employee count/fingerprint, time/advisor counts and original manifest matched the originals. This is observed staging restore evidence, not a production recovery certification.
4. The original bootstrap manifest `702c9f8b5d0fe0697618ac198bd2b3b9da44d1a953b710d685ee2b77afec29e0` matched the source-qualified November 8 chain. Comparing all canonical entries found **only** appended `0046_owner_advisor_memory.sql`; no predecessor changed or disappeared. Its SHA-256 is `1855f5064cef812a679772706b6adb1b01c858adee3524780ce1da76ecdd2907`. Filename sorting is not used.
5. That exact migration and narrowly scoped APP grants were rehearsed on both restored branches, then applied transactionally to both original test databases. Restricted APP logins exercised private context forgetting/replay invalidation inside rolled-back probes. Restricted WORKER logins were actually denied private-memory SELECT with SQLSTATE 42501. An initial operator `SET ROLE` attempt was correctly denied; no membership or permission was broadened. The connector's existing role-specific connection path provided the APP/WORKER tests without exposing passwords.
6. Both originals were restored to their original ACTIVE incarnation 1; control revisions are now A 6 and B 8. The original bootstrap receipts remain unchanged. Separate source/SQL/adoption receipts document this upgrade; it is not a new bootstrap. The known shared Preview database is a different target and was not migrated.

| Test company | Project / original branch | Database |
|---|---|---|
| A, `b7f07d3e-2255-474c-9a28-10c3185f5234` | `divine-mode-79850636` / `br-gentle-firefly-bctl69xv` | `nv_app_b7f07d3e2255474c9a2810c3185f5234` |
| B, `fe327544-3bd5-4b27-a19b-d1cb35d55300` | `soft-meadow-67826582` / `br-polished-pine-bbrt3aiy` | `nv_app_fe3275443bd54b27a19bd1cb35d55300` |

Notebook, coverage-review and memory schemas are now present on those two selected staging targets. Native push was not adopted or enabled. Jose subsequently approved deleting only restore-test branches `br-shiny-cloud-bc27clor` and `br-noisy-grass-bb56kqbq`; both were deleted and cleanup receipts retained. Original companies and their provider-expiring snapshots were preserved.

Full sanitized journal and adoption/role receipts: `/Users/josek0514/.codex/backend-completion-20261109/staging-journal.json` and `staging-adoption-receipts.json`. The existing six commerce/provisioning function deployment IDs still match their historical closed versions; no new bundle was deployed or falsely relabeled. All three schedules were freshly observed disabled with no next run. Variable-name inventories are not fresh reads of secret flag values. No provider delivery, public activation, live payment, native or production action occurred.

## Fresh bounded Rondo evidence

Jose approved a fresh **$5 total** cap. Three source-qualified Owner conversations completed: changing evidence followed by restoration, compound flood/power/continuity pressure, and changed objectives with identical company facts. Six answer turns used 17 recorded HTTP 200 exchanges. Both root and the independent reviewer assessed these defined criteria as passing, with all six business snapshots unchanged. Rondo withdrew obsolete advice, distinguished recorded availability from acceptance/publication, did not treat scheduling as proof of safe opening, and acknowledged the deliberate lower-hours coverage gap.

The new ledger is CLOSED at **$2.062919 conservative maximum reservation**, not an attestation of actual billing. Both prior ledgers remained unchanged. No unused allowance was reused. Raw fictional answers, facts, exact harness/rates and independent checks remain under `/Users/josek0514/.codex/backend-completion-live-20261109/`. These are finite backend/model findings, not hosted UI, VELANI deployment, universal competence or autonomous Owner replacement. Replies still merit concise-chat/UI review.

## Work that still requires real operating inputs or another owner

- **Workforce activation:** superseded by the [managed-runtime handoff](2026-11-09-managed-workforce-runtime.md). Jose selected the separate Render workspace, a $10/month ceiling and support@thevelani.com. The host/monitor implementation and six independent Important source findings are qualified/closed at `4ff2dee0`. No new service, roles or real delivery is activated. Recoverable worker-root custody, actual provider quote/application approval, staffed response and hosted workload/alert qualification remain open; no original backup is confirmed.
- **Deletion fulfillment:** intake and guarded manual withdrawal SQL work; actual erasure/de-identification remains the approved manual workflow. Operations still needs a trustworthy pre-request contact source, an approved support mailbox, staffed fulfillment and evidence for provider/log/backup handling. No historical email source was invented or real message sent.
- **2027 payroll:** publication research is retained in `/Users/josek0514/.codex/backend-completion-20261109/payroll-2027-readiness.md`. SSA publishes a 2027 wage-base change; the current inspected IRS employer guide is still 2026. A complete 2027 PR/employer rule/provenance/YTD/policy qualification was not established or implemented. The unsupported-year guard remains; do not call 2027 supported or reuse 2026 constants. Current facts/references must be qualified before that first native-calculator payday.
- **Hosted combined acceptance / Claude:** integrate the approved UI contracts with the exact backend candidate, then qualify authenticated signup/setup/invitations, billing return, scheduling/time/payroll documents, Rondo context and cross-company/recovery behavior on the isolated target. VELANI Preview's shared Production database setting still requires isolation before mutating hosted tests. Local model/SQL checks and schema adoption do not close this UI/environment gate.
- **Production:** actual employer/merchant tax configuration, selected production retention/restore/cutover, final independent release gates and Jose's production authorization remain separate. Employee bank transfers, tax filing, CSV creation and Manager Rondo were not added to Release 1 by this work.

Engineering clears the repaired source for development integration subject to exact-head checks. Security retains scoped receipts/readers, closed processing and isolation. Delivery keeps Claude UI and native ownership intact. Governance release impact remains **CONDITION / production HOLD**; no exception or missing business fact was silently accepted. The next operating gates are recoverable worker custody, hosted worker/alert activation and the actual source-matched hosted UI run, with 2027 qualification tracked before its supported-use deadline.
