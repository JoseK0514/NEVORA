# NEVORA first-customer onboarding and launch pack

**Working draft v0.1 — ready to fill and review. Customer launch readiness has not been assessed.**

This pack lets NEVORA prepare a customer's onboarding, service operations and commercial arrangements while Claude completes the application. NEVORA handles the technical coordination; the customer supplies business choices, an authorized roster and designated administrators.

For a quick overview, open the [executive brief](NEVORA-Executive-Brief.pdf). For editable tracking and calculations, open the [launch workbook](NEVORA-Launch-Workbook.xlsx) and its [short guide](WORKBOOK-GUIDE.md).

This is an **internal reusable master**. Distribute only reviewed customer-facing copies of the appropriate forms/guides. Do not send the internal decision, source-evidence or review files as a customer contract.

## Start here

1. Complete [Company intake](onboarding/COMPANY-INTAKE.md). First establish whether the customer's “30 clients” means employees or separate businesses. No customer count or company structure is assumed.
2. Collect the roster using [the worksheet](onboarding/EMPLOYEE-ROSTER.csv) and [its guide](onboarding/ROSTER-GUIDE.md). This is a collection template, not an application importer. Keep real employee data in an approved private customer workspace, outside this reusable pack.
3. Assign people using [the responsibility matrix](RESPONSIBILITY-MATRIX.csv) and resolve [the decisions](DECISIONS.csv). Use the editable launch workbook for tracking and budget inputs.
4. Obtain [Claude's candidate handoff](acceptance/CLAUDE-HANDOFF.md), then follow the [onboarding playbook](onboarding/ONBOARDING-PLAYBOOK.md) and [launch checklist](acceptance/LAUNCH-CHECKLIST.md).
5. Rehearse and record the [acceptance cases](acceptance/ACCEPTANCE-CASES.csv), train the customer administrators and transfer support ownership. Plans, demonstrations and drafted forms do not count as passed launch checks.

## What is included

| Workstream | Documents and templates | Intended owner |
|---|---|---|
| Customer onboarding | [Playbook](onboarding/ONBOARDING-PLAYBOOK.md), [intake form](onboarding/COMPANY-INTAKE.md), [roster](onboarding/EMPLOYEE-ROSTER.csv), [roster guide](onboarding/ROSTER-GUIDE.md) | NEVORA Onboarding Lead + Customer Owner |
| Infrastructure | [Plan](infrastructure/INFRASTRUCTURE-PLAN.md), [service inventory](infrastructure/SERVICE-INVENTORY.csv), [cost worksheet](infrastructure/COST-WORKSHEET.csv), [access/recovery](infrastructure/ACCESS-AND-RECOVERY.md) | NEVORA Operations Lead |
| Acceptance and launch | [Acceptance plan](acceptance/CUSTOMER-ACCEPTANCE-PLAN.md), [cases](acceptance/ACCEPTANCE-CASES.csv), [launch checklist](acceptance/LAUNCH-CHECKLIST.md), [engineering handoff](acceptance/CLAUDE-HANDOFF.md) | Onboarding + Engineering + Customer Owner; independent gates retain their existing owners |
| Support and training | [Support procedures](support-training/SUPPORT-PROCEDURES.md), [manager training](support-training/MANAGER-TRAINING.md), [employee quick start](support-training/EMPLOYEE-QUICKSTART.md), [communication templates](support-training/COMMUNICATION-TEMPLATES.md) | NEVORA Onboarding/Operations Leads |
| Commercial and data responsibilities | [Pricing proposal](commercial/PRICING-PROPOSAL.md), [invoice template](commercial/INVOICE-TEMPLATE.csv), [service responsibilities](commercial/SERVICE-RESPONSIBILITIES-DRAFT.md), [data worksheet](commercial/DATA-RESPONSIBILITY-WORKSHEET.md) | Jose + Commercial Reviewer + Customer Owner |

## First-customer sequence

| Stage | Exit evidence | Who takes the next step |
|---|---|---|
| 1. Scope and intake | Customer structure, contacts, enabled modules, locations, roster authority and success criteria recorded | Onboarding Lead |
| 2. Commercial and operational preparation | Proposed terms reviewed; service/account ownership and delivery requirements recorded | Jose + Operations Lead |
| 3. Engineering handoff | Exact candidate, UI identity, schema compatibility, feature flags and known issues supplied | Claude / Engineering Lead |
| 4. Authorized rehearsal and pilot | Selected target verified; mandatory acceptance evidence obtained; failures resolved or held | Engineering + Onboarding + Customer Owner |
| 5. Release decision and coordinated launch | Existing release/security gates satisfied; Jose's authorization and rollback ownership recorded | Authorized deployment operator |
| 6. First operating cycle and support handoff | Customer tasks completed, open issues owned, support/training transition accepted | Onboarding + Operations + Customer Owner |

These are evidence-based stages, not promised dates. Commit a customer schedule only after scope, access and engineering readiness are known.

## What this pack does and does not establish

- **Document preparation:** complete once the linked files, templates and consistency checks are delivered. This is the work owned by this task.
- **Product facts:** grounded in the [source register](SOURCE-REGISTER.md) at the recorded reference SHA. Claude's final candidate must be reconciled before using these guides with a customer.
- **Operational readiness:** NOT_ASSESSED. No live provider configuration, customer acceptance, restore exercise, invitation delivery or production launch was performed for this pack.
- **Commercial terms:** working drafts. No price, new SLA, tax treatment, signed agreement, automatic payment or legal commitment is created here.
- **Separation from Claude:** all files are outside `/workspace/NEVORA`; application code, schemas, shared environment settings, deployments and customer data remain outside this workstream. The [working agreement](WORKING-AGREEMENT.md) defines the boundary.

## Decisions to make first

The complete register is [DECISIONS.csv](DECISIONS.csv). The first five choices are: customer structure; enabled modules and success criteria; named customer/NEVORA owners; authorized hosting/database target and access; and commercial terms. Named people, dates, prices and provider quotations are intentionally blank where not supplied. Drafting did not wait for those choices; execution depends on them.

For a company with 30 employees, this is one company onboarding plus individual account activation. For a customer managing 30 separate businesses, the current single-company architecture does not supply one shared parent administration account; scope that requirement with Claude before selling or scheduling it.

## Review and verification

The [document review](evidence/document-review.md) records the corrections incorporated. The [validation report](evidence/validation-report.json) contains the actual link, CSV, workbook, PDF and source-integrity observations, including their limits. All customer acceptance cases remain NOT_RUN; no service or product release is certified by this pack.

To check a copied pack, run `python3 _tools/validate_pack.py`. Full application-source comparison additionally needs the reference checkout; supply `--source /path/to/NEVORA`. The ZIP contains a delivery manifest for the packaged files. Preview PNGs are local review aids and are excluded from the ZIP.
