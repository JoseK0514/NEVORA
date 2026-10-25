# Manager training worksheet

Status: **READY_FOR_REVIEW — draft, training NOT_RUN**. Owner: NEVORA Onboarding Lead. Use the [Onboarding Playbook](../onboarding/ONBOARDING-PLAYBOOK.md) and [Launch Checklist](../acceptance/LAUNCH-CHECKLIST.md). This worksheet does not evidence completed training.

| Session record | Fill before delivery |
| --- | --- |
| Customer / workspace | [CONFIRM] |
| Trainer / Customer Owner / Customer Managers | [ASSIGN] |
| Session date / duration / language / accessibility needs | [CONFIRM] |
| Claude's final version / navigation check / evidence | [PENDING] |
| Approved practice environment / synthetic accounts | [CONFIRM] |
| Enabled modules and Manager company/location scopes | [VERIFY] |

Entry: scope and contacts are recorded; the trainer verifies final version, permitted practice accounts and settings. Do not write to real employee records. Missing conditions remain BLOCKED or NOT_RUN.

## Fillable agenda

| Segment | Practice and teach-back | Time / outcome / evidence |
| --- | --- | --- |
| Roles and access | Customer Owner identifies permitted managers and scope. Owner, Manager, Lead and Employee are app roles; Lead is self-service, not an invitation administrator. | [FILL] / NOT_RUN / [LINK] |
| Invitation and activation | Owner reviews an eligible synthetic employee and invitation status. Employee chooses their own password, keeps their Employee ID and signs in. | [FILL] / NOT_RUN / [LINK] |
| Schedule | Authorized manager opens `/app/schedule`, checks location/week and explains draft versus published status. Employee checks their own published schedule. | [FILL] / NOT_RUN / [LINK] |
| Availability and requests | If enabled and authorized, review `/app/availability` and `/app/requests`; demonstrate usual versus selected-week availability and a request awaiting a decision. | [FILL] / NOT_RUN / [LINK] |
| Help and privacy | Manager explains workplace decisions versus technical support, safe recovery and the approved policy routes. | [FILL] / NOT_RUN / [LINK] |
| Teach-back and handoff | Each attendee repeats the tasks within their own role and names the support contact and unresolved gaps. | [FILL] / NOT_RUN / [LINK] |

## Trainer checklist

- [ ] Verify desktop/phone labels; do not invent menu sequences or reuse unverified screenshots. Team/Employees wording and destinations can vary.
- [ ] Confirm each Manager's company/location scope. A missing control is not permission to use someone else's account; escalate to Customer Owner.
- [ ] Verify invitation delivery is configured and approved. Invitation requires registered email; employee records can exist without email. Do not activate providers for training.
- [ ] Explain invitation issued, provider accepted, received and account activated as distinct states. Provider acceptance proves neither receipt nor activation. For an uncertain action, use its check/refresh path before considering another invitation; a replacement invalidates the previous invitation.
- [ ] Let employees enter passwords privately. Never capture invitation proofs, credentials or recovery codes as attendance evidence.
- [ ] Show published/unpublished/unavailable schedule states. An empty unpublished day is not confirmed time off. Read a saved/submitted confirmation rather than assuming a click succeeded.
- [ ] Teach time-off decisions as manager/employer decisions. Only demonstrate shift exchanges, timecards, payroll-related records, notifications or other optional tools after configuration, authorization and final behavior are verified. Do not describe NEVORA as executing payroll payments.
- [ ] Rehearse `/forgot-access` and identity-checked recovery without exchanging codes with support. Verify `[CUSTOMER_ORIGIN]`; review `[CUSTOMER_ORIGIN]/privacy`, `[CUSTOMER_ORIGIN]/support` and `[CUSTOMER_ORIGIN]/account-deletion`.

Exit requires a completed teach-back record, outstanding-gap owner and evidence reference for each required task. Record delivery status [NOT_STARTED / IN_PROGRESS / READY_FOR_REVIEW / VERIFIED], attendee acknowledgment [PENDING] and reviewer [ASSIGN]. Acceptance results stay NOT_RUN until executed; failures go to the Launch Checklist before launch review.

Source: reference `8e9073974b52053e557382ec5199dbce9d5aa32c`; `src/lib/navigation.ts`, `src/lib/auth/permissions.ts`, invitation service/panel, schedule/availability/request pages and `src/lib/legal/policies.ts` ([source register](../SOURCE-REGISTER.md)). Reconcile Claude's final version before distribution.

