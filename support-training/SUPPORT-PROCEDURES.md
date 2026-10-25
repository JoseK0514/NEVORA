# Support procedures

Status: **READY_FOR_REVIEW — working draft**. Owner: NEVORA Operations Lead. Hosted behavior, staffing and readiness remain unverified. Training remains draft until Claude / Engineering Lead checks final navigation/version.

Use with the [Onboarding Playbook](../onboarding/ONBOARDING-PLAYBOOK.md) and [Launch Checklist](../acceptance/LAUNCH-CHECKLIST.md). This pack sends no messages, activates no providers and stores no customer records.

## Contact and policy authority

Canonical contact: **support@thevelani.com** for technical help, privacy and content concerns. Quote the approved response aim exactly when needed:

> We aim to respond to support and privacy inquiries within two business days. Business days are Monday through Friday, excluding public holidays observed in Puerto Rico. Requests that need investigation may take longer to resolve.

This is an aim, not a response or resolution guarantee. Severity labels add no SLA, support hours or coverage promise. Authority: [source register S04](../SOURCE-REGISTER.md), `src/lib/legal/policies.ts`, version `2026-10-20`. Policy locations are `[CUSTOMER_ORIGIN]/support`, `[CUSTOMER_ORIGIN]/privacy`, `[CUSTOMER_ORIGIN]/terms` and `[CUSTOMER_ORIGIN]/account-deletion`. Verify `[CUSTOMER_ORIGIN]` before sharing.

## Intake and routing

Entry: a report arrives through an authorized channel. Operations Lead records a reference, received time/time zone, category, minimum workspace identifier if needed, affected role, impact, app version, device/browser/OS, safe steps and sanitized error text. Conceal personal information and secret-bearing URLs in screenshots. Store cases in an authorized restricted system, never this pack.

Never request or retain passwords, verification/recovery codes, full invitation links or proofs, PIN keys, bank details or payroll documents. Do not request identity documents through ordinary email. Confirm identity proportionately through an approved authenticated or employer-assisted process before discussing protected records or changing access. An email address, screenshot or claimed job title alone does not authorize a change. If the verification process is unclear, route to the Operations Lead without disclosing records.

| Report | Customer route | NEVORA route |
| --- | --- | --- |
| Shifts, availability deadlines, leave decisions, pay or record corrections | Customer Manager / Customer Owner | Support handles an app fault or inability to reach the workplace contact |
| Invitation missing, expired or uncertain activation | Customer Owner; invitation management is Owner-only | Operations Lead coordinates technical investigation |
| Sign-in difficulty | `/forgot-access`; manager or Owner for authorized recovery after identity checks | Support for a technical blockage; never ask for a recovery code |
| Privacy, suspected unauthorized access, content concern, concern about an administrator | Employee may contact support directly | Operations Lead coordinates appropriate privacy/security review |

Managers have scoped access; Lead and Employee use self-service. Never recommend sharing credentials or elevating a role as a workaround.

## PROPOSED internal triage

These priorities require Jose / Business Owner review before adoption. They describe routing, not contractual commitments.

| Priority | Impact example | Proposed owner/action |
| --- | --- | --- |
| P1 Critical | Suspected exposure, unauthorized access or broad inability to operate | Operations Lead coordinates Engineering Lead and Jose; preserve minimal evidence and assess containment |
| P2 High | Core workflow blocked for a customer, without a verified workaround | Engineering Lead investigates impact and a safe workaround |
| P3 Normal | Limited defect or access assistance | Operations Lead assesses, routes and records next action |
| P4 Guidance | How-to question or feedback | Operations Lead answers from verified behavior or records product feedback |

## Incident handoff and closure

For suspected incidents, distinguish observations from hypotheses: reference, first observed time, affected workflow/scope, version, sanitized reproduction, evidence location, known workaround, risks and next owner. Operations Lead hands this to Engineering Lead; Jose owns material risk acceptance and production authorization. Engineering determines containment and recovery. Do not promise restoration times, declare data safe without evidence, or claim backup recovery guarantees.

Keep customer updates as drafts using [Communication Templates](COMMUNICATION-TEMPLATES.md); an authorized sender reviews facts and recipients separately. Close only when the resolution evidence, verification owner and customer follow-up disposition are recorded; otherwise hand off with an explicit outstanding action.

## Offboarding and data requests

Separate employee access changes, account deletion and workspace closure. Employer authorization governs workplace access; do not turn offboarding into blanket record deletion. Route access changes through Customer Owner and verified controls. For access/correction/export/deletion requests, follow Privacy and Account deletion policies ([source register S04](../SOURCE-REGISTER.md)): employer-controlled workplace requests are coordinated with the employer; VELANI LLC handles information it controls.

The documented self-service path is Profile → Delete my account, password re-entry and confirmation. Eligible deletion uses the policy's stated aim and retention exceptions; do not promise immediate erasure. Owner account deletion leaves the workspace open; workspace closure is separate and goes to support. Record the request reference and restricted handoff, not its sensitive contents here.

Reference: `8e9073974b52053e557382ec5199dbce9d5aa32c`; `src/lib/legal/policies.ts`, `src/lib/auth/invitations/service.server.ts` and `src/lib/auth/permissions.ts`.

