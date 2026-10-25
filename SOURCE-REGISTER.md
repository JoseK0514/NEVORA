# Source register

All repository claims below reference `JoseK0514/NEVORA` at `8e9073974b52053e557382ec5199dbce9d5aa32c`. Paths are relative to that repository. They describe the inspected source, not Claude's future candidate or a verified hosted customer deployment.

| ID | Source | What it establishes | Limit |
|---|---|---|---|
| S01 | `README.md`; `docs/execution/single-company-20261012.md` | One configured company per database; existing company setup, role-aware employee creation and authentication. | Multi-company switching, SaaS signup and subscription billing are deferred. Local evidence is not hosted acceptance. |
| S02 | `scripts/setup-company.mts`; `scripts/company-setup.ts`; `db/migrations/order.ts`; `db/migrations/README.md` | Explicit setup target, fresh-empty-schema refusal, canonical ordered migrations, company/location/Owner creation. | Existing customer/friend databases must not be initialized or reset as an onboarding shortcut. Held migrations stay held. |
| S03 | `src/lib/auth/invitations/service.server.ts`; `delivery.server.ts`; `model.ts`; `src/app/activate/activation-invitation.tsx` | Owner-issued, invitation-based activation; registered email; distinct delivery and activation states; employee chooses own password. | Delivery is disabled by default; provider acceptance does not prove receipt or activation. No automatic email activation was performed. |
| S04 | `src/lib/legal/policies.ts`; `docs/compliance/README.md`; `docs/compliance/account-deletion-runbook.md` | VELANI LLC operator identity, support contact/qualified response aim, employer/operator responsibilities, public policy and deletion handling. | Preserve this wording; historical provider-region/restore statements still need current operational verification. No new legal promises are accepted by this pack. |
| S05 | `src/lib/company-access/`; `src/app/app/employees/`; `src/lib/auth/permissions.ts` | Role/access boundaries and employee management. Managers need an Owner-assigned management scope; invitation actions belong to Owner. | Operational pack role names are responsibilities, not new application permissions. Confirm the final candidate's behavior during rehearsal. |
| S06 | `docs/execution/final-release-checklist.md` | Existing final release controls; FR-AUTH-001 is OPEN and requires candidate-specific independent evidence before production. | This document pack and any local tests do not close that requirement. |
| S07 | `docs/product/specs/codex-joint/DEPLOY-RUNBOOK.md`; `vercel.json` | Coordinated deployment/rollback requirements and Git auto-deployment disabled. | The runbook's migration narrative stops at 0035 while the canonical order includes 0036/0037. Claude must reconcile the exact release manifest; no migration recipe is copied here. |
| S08 | `AGENTS.md`; relevant `.codex/skills/nevora-*` guidance | Work ownership, no shared-state cleanup, security/release boundaries, business authority, and separate independent oversight. | Recommendations and completed documents are not Jose's production authorization. |

## Session observations, separate from repository facts

At the last checks in this task, hosting/history requests through the current network route returned `403 Forbidden`; the app history tool bridge was unavailable. No Vercel account token, usable database binding, or `.env.local` was available to this session. The environment draft contains proposed access requirements; saving them did not apply them or publish a site. These observations establish this session's access limitation, not the absence of accounts or databases elsewhere in the business.

PR #31 was prepared and checked locally in earlier work. No hosting alias was changed and no customer/friend database was accessed. The operations pack does not certify or depend on those earlier local test results as evidence of customer readiness.

## How to refresh this pack at handoff

1. Obtain Claude's frozen candidate identity and the actual target environment through [the handoff worksheet](acceptance/CLAUDE-HANDOFF.md).
2. Compare the relevant source paths above against that candidate. Record changes to roles, invitations, configuration, migration order, and published policy text.
3. Update affected instructions before distributing them to a customer. Record the responsible reviewer and candidate identity.
4. Execute the acceptance plan with authorized targets and retain evidence. Leave all unexecuted cases NOT_RUN.
