# Self-service onboarding backend readiness

## Latest integrated candidate — November8,2026

Onboarding and commerce are locally integrated at `81d3d1d0723d99ce534f7b16a992642d6755b3be`:11,158 root passes/831 existing skips,135+496+36 owned onboarding/access checks and42 total commerce runner checks; types/lint/build/production-marker/audits pass. See [integrated source, hosted state and remaining gates](2026-11-08-integrated-onboarding-commerce.md). A dedicated Free Neon control/catalog, four restricted roles, private Vercel staging project and three exact DNS CNAMEs are now created/configured; actual external driver endpoint TLS and role denials pass. The Vercel deployment connector returns403 even for explicit preview, so there is no deployed candidate or hosted end-to-end claim. Private worker/provider/SMTP and Stripe sandbox authentication remain open. Claude owns UI; original independent BLOCK verdicts remain preserved. The older packet below is historical where superseded by this source-specific handoff.

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

These are implementation positions, not independent security/QA/UI certifications. The fresh whole-branch review and author fix dispositions are recorded in [review custody](self-service-onboarding-backend-review.md), with the historical BLOCK result preserved. [All implementation decisions and deferred findings](self-service-onboarding-decisions.md) remain part of the handoff. The author verifies fixes with regression tests; there is no second-review approval or independent certification.

## Open integration and release gates

- Claude onboarding/signup page surfaces are absent from this checkout and the inspected current collab tree. There is no honest browser wizard acceptance yet. Do not add a fake page/test or count in-process HTTP tests as rendered UI evidence. Integrate the actual UI against the contract and test320/390/tablet/desktop, EN/ES, keyboard/focus, loading/empty/invalid/error/success, refresh/back, two tabs, lost responses, cookie failure, optional skips and partial/unknown invitations.
- Fresh origin fetch kept development at the baseline; `claude-codex-collab-nevora` advancedd21ad918d. `check:development-sources` correctly reports drift. No assembly occurs here; do not update its recorded head/disposition without reviewing the collab work and rerunning the required inventory check.
- The isolated staging resources, restricted hosted roles, external endpoint TLS and DNS CNAMEs are verified separately in the latest integration handoff. Actual deployed Vercel runtime, automatic A/B company provisioning, application SMTP/approved-inbox journeys, hosted restore, Stripe sandbox lifecycle, remote CI and native release acceptance remain unverified. Existing metered AI allowances do not authorize new AI spend.
- Source-specific security/QA/UI findings, required CI jobs, branch protection, actual release authorization and deployed-SHA mapping remain distinct. Public enablement/production is blocked until they are verified and Jose explicitly authorizes release.
- Restore retirement deliberately leaves SUSPENDED and disables old logins/secrets. Owner/channel/contact/payroll/Clocker review, fresh roles and a separately reviewed reactivation are required. Backups do not prove that facts changed after the backup are still current.

## Resume

Current-source backend acceptance and the single fresh integration whole-change review are complete; the review returned BLOCK and the author fix pass has regression evidence. Preserve all findings/rulings without claiming a second independent approval. Finish the hosted gates in the latest integration handoff. Integrate Claude's actual UI only through an authorized development assembly after source drift is reconciled. Run real hosted checks only under their separate authority. Jira SCRUM-166 remains In Progress while those gates are open; backend preparation is not a Done claim for the full live self-service product.

## Dependency review

The2026-11-08 follow-up removes the9 inherited moderate findings with reviewed dependency updates, a failing-then-passing mail-envelope regression and clean-install verification. Full and production audits now report0 findings. See [hosted and dependency checks](2026-11-08-onboarding-hosted-dependency-checks.md) for exact versions, provider-delivery evidence, access blockers and the required hosted rehearsal. No forced audit downgrade, lint-rule suppression or production enablement was performed.
