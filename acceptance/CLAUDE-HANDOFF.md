# Engineering handoff request for Claude

Status: READY_FOR_REVIEW; response and operational verification pending. Recipient: Claude / Engineering Lead. Requested by: NEVORA Operations Lead. Provide a reviewable handoff for the customer-selected candidate within your existing UI/backend scope. This request grants no deployment permission and does not direct independent QA/UI work or close their findings.

## Candidate custody and scope

| Fillable engineering response | Value / private evidence reference |
|---|---|
| Integrated immutable SHA, repository, authoritative PR/branch lineage | __ |
| Exact UI commit/build artifact; backend commit/artifact | __ |
| Worker versions; runtime/dependency lockfile versions | __ |
| Hosting deployment-to-SHA evidence; intended environment/domain | __ |
| Enabled workflows/modules and explicit exclusions | __ |
| Known issues, affected users, workaround, severity and owner | __ |
| Change-freeze owner; evidence invalidated by later changes | __ |

Reconcile against source baseline `8e9073974b52053e557382ec5199dbce9d5aa32c`; do not identify the baseline as the final candidate without approval. Confirm one company per database, separate customer deployments/databases where applicable, Manager company/location scope, invitation activation prerequisites and any unsupported intake assumptions.

## Schema and recovery readiness

Provide current target schema evidence __; candidate canonical migration manifest/checksums __; fresh-install versus upgrade classification __; prerequisites/compatibility __; bounded execution review __; failed-upgrade rollback evidence __; existing-data upgrade and actual hosted Neon transport evidence __. Reference `db/migrations/order.ts`, `scripts/company-setup.ts` and the approved deployment runbook. The current registry includes `0036_owner_advisor` and `0037_owner_briefing_reviews`; the runbook narrative stops at `0035`. Reconcile the candidate's actual requirements before an operator acts. Preserve declared order, final native-payroll/company-access migrations and exclusion of held tenancy files.

Record Manager legacy-adoption review and new-Manager scope assignment requirements __. Identify effects of additive schema with features disabled __; app/worker backward compatibility __; previous approved artifact __; backup/restore evidence __; recovery data-loss boundary and write reconciliation __. Do not assume older artifacts tolerate the installed schema or reverse immutable ledgers automatically.

## Environment and activation inventory

Return required setting **names, location, approved state and verification reference only**. Secret values stay in approved private stores.

| Setting group | Required handoff |
|---|---|
| `NODE_ENV`, `DATABASE_URL`, `FUEL_PORTAL_ORIGIN` | Production mode; exact verified single-company target and HTTPS origin; separate Preview bindings |
| `NEVORA_SETUP_ENVIRONMENT`, `NEVORA_SETUP_DATABASE_URL`, `NEVORA_SETUP_DATABASE_NAME`; `COMPANY_*`, `BOOTSTRAP_*` | Only applicable operator setup requirements; no secrets in this response |
| `NEVORA_PAYROLL_ENABLED`; `NEVORA_CLOCKER_PUNCH_ENABLED`, `NEVORA_CLOCKER_PIN_KEY`, `NEVORA_CLOCKER_ORIGIN` | Confirm exact approved state; remain off unless separately enabled and accepted |
| `NEXT_PUBLIC_NEVORA_PASSKEYS`; `NEVORA_PASSKEY_RP_ID`, `NEVORA_PASSKEY_ORIGIN` | Default unset/off; enabling requires approved final host, schema and matching build/runtime |
| `PUSH_ENVIRONMENT`, `PUSH_FEATURE_ENABLED`, `PUSH_DELIVERY_ENABLED`, `PUSH_TEST_DELIVERY_ENABLED`, `PUSH_TEST_ACCOUNT_IDS`, `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY`, `PUSH_VAPID_SUBJECT`, `PUSH_SUBSCRIPTION_ENCRYPTION_KEY`, `NOTIFICATION_WORKER_SECRET` | Approved existing state and continuity; no provider activation implied; test delivery off and test allowlists absent |
| `NEVORA_RECOVERY_SMTP_HOST`, `NEVORA_RECOVERY_SMTP_PORT`, `NEVORA_RECOVERY_SMTP_USER`, `NEVORA_RECOVERY_SMTP_PASSWORD`, `NEVORA_RECOVERY_FROM` | Approved sender/TLS readiness or unavailable delivery explicitly stated |
| `NEVORA_INVITATION_DELIVERY_ENABLED` | Default disabled; approved delivery state __; verification reference __. SMTP configuration alone does not enable invitations |
| `NEVORA_OWNER_ADVISOR_ENABLED`, `NEVORA_OWNER_ADVISOR_DATA_APPROVED`, `NEVORA_OWNER_ADVISOR_PROVIDER`, `NEVORA_OWNER_ADVISOR_MODEL`, `NEVORA_OWNER_ADVISOR_DAILY_LIMIT`; selected provider credential setting names | Off unless separately authorized, with additional acceptance coverage before use |
| Workspace `timeOff`, `marketplace`, `updates`, `payStatements`, `breaks` | Actual approved states; source defaults all on do not establish customer approval |
| `NEVORA_DEV_FORCE_ERRORS`, `NEVORA_DEV_CAPTURE_DELIVERY`, `NEVORA_DEV_CAPTURE_OUT`, `NEVORA_OWNED_APP_*`, `NEVORA_PREMIUM_*`, `FUEL_TEST_DATABASE_URL`, `FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN`, `PREVIEW_OUT`; deferred `NEVORA_APP_DATABASE_URL`, `NEVORA_WORKER_DATABASE_URL` | Production absence verification per runbook; deferred principals require separate tenancy authorization; no test-transport fallback |

## Evidence, owner and next gate

Invitation-specific evidence __: approved delivery state, controlled fictional receipt, activation and first login on the exact candidate/target. Distinguish provider acceptance from recipient receipt. Delivery unavailable/off leaves cohorts needing initial activation BLOCKED unless a supported alternative has positive evidence __. No-activation cohort proof and Customer Owner/Jose approval for NOT_APPLICABLE __. Keep proofs and credentials private.

Supply exact-candidate CI report __; hosted isolated schema/transport report __; functional/security/browser evidence __; required physical-device evidence __; published independent QA/UI/FR-AUTH-001 references and current open statuses __; unresolved risk/exception register __. Historical author evidence remains identified as such. Where evidence is unavailable, state BLOCKED and the responsible owner.

Deployment operator __; environment verifier __; rollback operator/decision owner __; Engineering escalation contact __; support briefing owner __; next gate/date __. Route customer workflow review through [acceptance](CUSTOMER-ACCEPTANCE-PLAN.md), [onboarding](../onboarding/ONBOARDING-PLAYBOOK.md), [recovery custody](../infrastructure/ACCESS-AND-RECOVERY.md) and [support](../support-training/SUPPORT-PROCEDURES.md). Jose's explicit selected-target authorization remains required before actual production execution.

Source basis: repository `AGENTS.md`, `docs/execution/single-company-20261012.md`, `docs/product/multi-company-database-per-company-20261021.md`, `src/lib/auth/session.ts`, `src/lib/auth/invitations/*`, `src/lib/company-access/*`, `src/lib/navigation.ts` and `src/lib/workspace-presentation/modules.ts`, inspected at the reference baseline. Source inspection is not hosted verification.
