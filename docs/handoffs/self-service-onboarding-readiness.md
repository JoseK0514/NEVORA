# Self-service onboarding backend readiness

## Scope and ownership

Jose approved the plan with “lets do it.” Codex owns backend logic; Claude owns onboarding rendering. Implementation is isolated in a detached worktree from developmente2872f30, with local incremental commits and no branch push, development assembly or deployment. Existing customer deployments stay `single_company`. New signup/provider/mail/worker/operator actions are disabled by default.

The backend implements verified signup, current-policy consent custody, durable slug/resource reservation, one-project-per-business provisioning, canonical empty-database bootstrap with an inactive initial Owner, one-use initial-Owner activation, normal password/session sign-in, canonical resumable settings, team creation and explicit invitation batches. Actor/role/session/domain guards remain server-enforced. Workspace routing is not actor authority, and held Phase F/RLS work remains held.

Use [the UI contract](2026-11-07-onboarding-backend-ui-contract.md), [architecture](../architecture/self-service-onboarding.md), [approved plan](../superpowers/plans/2026-11-07-self-service-owner-onboarding.md), and [operator runbook](../runbooks/self-service-onboarding.md). All source-specific commands, RED/GREEN evidence and rulings are retained in `.superpowers/sdd/2026-11-07-self-service-owner-onboarding/progress.md` and its logs. That evidence is local; it is not a remote CI or production record.

## Verification packet

The final accepted backend checkpoint/tree must come from a clean-source `scripts/onboarding-acceptance.mjs` report, not a guessed commit or earlier test count. The report and per-step logs are under `.omo/evidence/onboarding/<checkpoint>-<run-id>/`; CI uses the analogous runner-temp artifact. It explicitly records `scope: backend-only`, UI/hosted not run, and production not authorized. Record root unit/type/lint/build checks alongside that report at the same candidate. Keep the full logs for failures and inherited skips.

Verified checkpoint evidence before the final packet: Tasks0–8 are committed and ledgered. Task4 root suite had11124passed/801existing skips; Task8 owned onboarding had103passed/0skips and focused regressions243passed/25existing skips. These are historical checkpoint results, not substitutes for current-source acceptance. Task9 adds a real multi-company journey, genuine password-action/cookie-failure tests, actual killed-worker reconciliation, separate restricted control-role tests, proof maintenance and restore/backup rehearsal. The final report must include them.

The broad Company Access run exposed36 prerequisite rejections because its shift-change suite explicitly requires an exchange-prefixed disposable target. Foundation and exchange configurations are now separate, and acceptance/CI run both; the exchange rerun passed36. A quiet-hour-dependent notification test was repaired by asserting its real summary group and using its recorded due time; all27 producer tests then passed without changing notification application logic or history assertions.

## Controls and director positions

| Position | Backend disposition | Remaining evidence/gate |
|---|---|---|
| Product | Owner-only business is allowed; optional payroll/Clocker/team can be configured later. Readiness uses actual canonical facts, not completion checkboxes. | Claude rendering and actual end-user acceptance. |
| Engineering | Durable receipts, source checksums, scoped real-driver transactions, bounded provisioning, exact-resource recovery, canonical settings/employee/invitation services. | Exact candidate CI and development-source reconciliation before assembly. |
| Security | Host/incarnation/purpose envelopes, least-privilege role templates tested locally, no web access to bootstrap custody, role-generation fences, one-use activation and explicit delivery uncertainty. | Verify actual hosted role grants, secrets, account/region/DNS/TLS, retention/legal pages and independent source-specific dispositions. |
| Delivery/governance | Local artifacts and Jira remain the handoff record; no private approval is converted into release authority. | UI/hosted/release gates stay open; no independent finding is self-closed. |

These are implementation positions, not independent security/QA/UI certifications. The required fresh whole-branch review is recorded separately against the exact candidate, with open findings preserved.

## Open integration and release gates

- Claude onboarding/signup page surfaces are absent from this checkout and the inspected current collab tree. There is no honest browser wizard acceptance yet. Do not add a fake page/test or count in-process HTTP tests as rendered UI evidence. Integrate the actual UI against the contract and test320/390/tablet/desktop, EN/ES, keyboard/focus, loading/empty/invalid/error/success, refresh/back, two tabs, lost responses, cookie failure, optional skips and partial/unknown invitations.
- Fresh origin fetch kept development at the baseline; `claude-codex-collab-nevora` advancedd21ad918d. `check:development-sources` correctly reports drift. No assembly occurs here; do not update its recorded head/disposition without reviewing the collab work and rerunning the required inventory check.
- No hosted project, real recipient email, actual DNS/TLS route, secret-manager grant, provider entitlement/capacity, remote CI result or installed native release is verified by the local packet. Existing metered AI allowances do not authorize hosted resource creation or a real email test. Obtain the separate environment, owned-resource/recipient and spending authority before those checks.
- Source-specific security/QA/UI findings, required CI jobs, branch protection, actual release authorization and deployed-SHA mapping remain distinct. Public enablement/production is blocked until they are verified and Jose explicitly authorizes release.
- Restore retirement deliberately leaves SUSPENDED and disables old logins/secrets. Owner/channel/contact/payroll/Clocker review, fresh roles and a separately reviewed reactivation are required. Backups do not prove that facts changed after the backup are still current.

## Resume

Finish current-source backend acceptance and fresh whole-branch review, preserving all findings/rulings. Integrate Claude's actual UI only through an authorized development assembly after source drift is reconciled. Run real hosted checks only under their separate authority. Jira SCRUM-166 remains In Progress while those gates are open; backend preparation is not a Done claim for the full live self-service product.
