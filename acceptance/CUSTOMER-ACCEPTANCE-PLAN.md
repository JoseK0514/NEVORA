# First-customer acceptance plan

Status: READY_FOR_REVIEW as a document; execution NOT_RUN. Owner: NEVORA Onboarding Lead. This plan grants no commercial approval, production authorization, or independent audit closure.

## Confirm the customer and candidate

Record company count __; employees per company __; locations __; timezone __; Customer Owner __; Customer Manager __. Thirty employees in one company means one company database. Thirty separate businesses require separate company deployments/databases under the documented operating model and separate readiness decisions. Do not substitute employee count for company count or promise shared administration, SaaS signup, billing, SSO, or CSV import.

Before scheduling execution, receive the completed [engineering handoff](CLAUDE-HANDOFF.md): frozen integrated SHA, exact UI/backend versions, approved scope, enabled modules, known issues, hosted mapping, schema and release evidence. The reference checkout `8e9073974b52053e557382ec5199dbce9d5aa32c` is a source baseline, not the approved launch candidate. Any later source/configuration change requires recorded impact review and repeat acceptance of affected cases.

## Run in two separate stages

1. **Fictional rehearsal:** Operations proves the hosted environment/database is isolated from every customer target before any write. Use fictional identities, a controlled test delivery destination, and disabled live providers. Run [ACCEPTANCE-CASES.csv](ACCEPTANCE-CASES.csv), including denial, duplicate/stale and failure recovery cases. Synthetic expiry, concurrency, outage and rollback exercises stay here. Obtain the applicable engineering and independent release reports separately; this worksheet does not perform or replace their certification.
2. **Consented customer pilot:** After rehearsal acceptance, Customer Owner and Jose separately record pilot consent/authorization, exact target, participant list held privately, allowed data/actions, dates, success criteria, manual fallback, and stop contact. Customer data loading, invitations, schedule publication, live timekeeping, payroll and providers each need their applicable approval. Use only the agreed subset. Never run fault injection or destructive rehearsal on customer records. A successful fictional rehearsal alone permits no customer execution.

Use the [onboarding playbook](../onboarding/ONBOARDING-PLAYBOOK.md) for intake and training; use [access and recovery](../infrastructure/ACCESS-AND-RECOVERY.md) for custody and recovery evidence.

## Coverage and evidence

| Participant | Required coverage |
|---|---|
| Customer Owner | Company identity/settings, roster/access, last-Owner protection, operational configuration |
| Customer Manager | Approved company or location scope; unassigned/revoked denial; no Owner elevation |
| Lead and Employee | Separate self-service sessions; no directory/management authority or another person's private records |
| Operations and Engineering Leads | Target custody, failure recovery, release evidence and support handoff |

Cover Chromium and WebKit on the approved candidate, phone portrait and desktop, keyboard/focus and readable validation/recovery. If Clocker is enabled, include actual intended tablet hardware, landscape/portrait including 1024×768 and 768×1024, shared-screen privacy and recovery. Record actual OS/browser/device versions. Emulation does not establish physical-device or screen-reader certification; preserve existing required accessibility/device gates.

Every case starts NOT_RUN. Required cases must PASS. Initial account activation/login evidence is mandatory for every selected cohort that needs it, regardless of `NEVORA_INVITATION_DELIVERY_ENABLED`. Unavailable delivery remains BLOCKED unless a supported alternative is positively verified for that cohort. ACC-03 may be NOT_APPLICABLE only when documented proof shows no cohort member needs initial activation and Customer Owner/Jose approve that disposition. For other conditional capabilities, enabled scope becomes required; disabled scope receives NOT_APPLICABLE only with flag/module evidence and reviewer. Unsupported or newly enabled scope needs agreed coverage. FAIL/BLOCKED entries need an owner and resolution reference; reruns retain original history.

Evidence records case ID, stage, exact SHA/deployment, environment/database identity reference, timestamp, actor role, browser/device, expected/observed result and restricted evidence location. Store redacted fictional screenshots or aggregate receipts. Keep passwords, cookies, invitation/recovery fragments, PIN keys, connection strings, payroll/bank/tax data and real employee details out of this pack and screenshots. Provider acceptance does not prove message delivery. Missing/unavailable data must not be reported as zero or success.

## Acceptance and decision record

Claude / Engineering Lead accepts technical handoff completeness and owns remediation. Customer Owner accepts company configuration and pilot workflow fit; Customer Manager and Employees record usability observations. Onboarding Lead verifies training and case completion; Operations Lead accepts support/recovery ownership. Required independent reviewers retain their own findings and closure authority. Governance & Risk consolidates the recommendation; Jose alone authorizes production and material risk decisions.

GO requires all required/enabled cases PASS, mandatory release gates evidenced for the same candidate/target, trained owners, tested recovery evidence, and explicit Jose authorization. Any identity mismatch, privacy/authority failure, unreconciled schema, blocking finding or missing mandatory evidence is NO-GO. Customer acceptance cannot waive these gates. Record decision __; candidate/target __; evidence __; Customer Owner acceptance/date __; Operations acceptance/date __; Jose authorization/date/reference __. Until filled, execution remains NOT_RUN and launch remains blocked.
