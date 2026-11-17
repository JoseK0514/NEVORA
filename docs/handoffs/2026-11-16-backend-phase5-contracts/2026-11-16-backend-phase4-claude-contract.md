# Phase 4 — Claude consumption contract

November 16, 2026. Baseline `edce7661c211aba588f29bd6d56327fabdc11b47`; Phase 4 local changes are identified by the delivery handoff. Claude owns presentation, forms, navigation and accessibility. No screen or stylesheet changes are included here.

## B09: one-target reminder preview and original-operation recovery

Use `src/lib/manager-reminders/types.ts` and its README as the typed source. The new **read-only** `POST /api/manager/reminders/eligibility` takes the exact proposed command, using the same headers as `POST /api/manager/reminders`:

```http
Content-Type: application/json
Origin: <actual same origin>
X-Nevora-Reminder: 1
X-Nevora-Reminder-Authority: <current session authority>
```

```json
{"kind":"AVAILABILITY","operationId":"11111111-1111-4111-8111-111111111111","authority":"<current authority>","employeeId":"fictional-target","weekStart":"2026-11-16","expectedDeadline":"2026-11-17T17:00:00.000Z"}
```

For `COMMUNICATION`, replace week/deadline with exact `communicationId` and `expectedRevisionId` UUIDs. Unknown fields, caller workspace IDs, delivery switches, arbitrary recipient lists and invalid dates are rejected. Maximum transport is 2,048 actual bytes. Derive authority using the existing server communication-context contract; never expose the session hash or synthesize an authority. Availability does not gain a new scope or activation route because Updates is held.

Current Company operational authority is required for Owner/Manager. Location-only, financial-only, unassigned/legacy Managers, Employee/Lead and expired/revoked/replacement sessions gain no permission. Targets must be current active Employee/Lead in the bound company and current source recipient. An availability deadline must match exactly, remain open and have no submission. A communication must be on the current published, required, unexpired revision with no acknowledgement. Source eligibility is intentionally indistinguishable from a foreign/nonexistent target.

| Result | UI behavior |
| --- | --- |
| `ready`, `canQueue:true` (200) | Offer a deliberate action. Display source expiry and scheduled due time in returned timezone where useful. This observation grants no durable permission; submission rechecks everything. |
| `cooldown`, `canQueue:false`, `nextEligibleAt` (200) | Explain the one-reminder-per-target/source/local-delivery-day budget. `nextEligibleAt` is the next **queue** opening; at 21:00 the next day's 07:00 queue becomes available. Null means no further budget fits before this source expires. Re-read, never automatically send at that time. |
| `committed`, `queued` or `already_queued` (200) | Show queue persistence, preserve the original operation/notification IDs, and stop resubmitting. This is not proof of delivery. A previous failure/cancellation still consumes its daily budget. |
| `held/activation_held` (503), `unavailable/module_off` (404) | Keep the action unavailable. Preserve Updates/Conversations and provider release holds. |
| `blocked/access_denied` (401/403) | Sign-in/access guidance without revealing a target or widening scope. A proof disappearing between initial admission and read returns 401. |
| `blocked/invalid_command` (400/403) | Malformed/unreadable JSON returns 400; a parsed body failing the closed domain shape returns 403. Treat this as an invalid/stale consumer payload and rebuild it only after deliberate review, not as a sign-in problem. |
| `conflict/source_or_operation_changed`, `source_expires_before_delivery` (409) | Refetch current source and let the person review. Do not change the original uncertain command. |
| `unavailable/read_failed` (503) | Preview did not authorize a write. Offer retry of the read and a support reference if present. |

Allocate one UUID per deliberate reminder operation and retain its exact body while outcome is uncertain. Preview creates no operation. After submitting, a lost response or `outcome_unknown` requires `GET /api/manager/reminders/operations/{originalId}` with the original intent/authority headers. Recover that receipt before another action. An authenticated original-session `operation_not_found` permits deliberate replay of the exact original body/ID; it is not authority to replace the ID or change the recipient/source. GET `unavailable/operation_unavailable` (503) leaves the outcome unresolved: keep the original ID/body and retry only the lookup. Changed content conflicts. Recovery after a new login cannot reveal an old session's receipt.

Keep these meanings distinct: accepted request, persisted queue, release hold, confirmed failure, unknown outcome, provider acceptance and actual device delivery. These APIs expose only queue receipts and command outcomes; they expose **no actually-delivered state**. A 2xx response is not “sent” or “delivered.” Do not infer failed delivery from an interrupted browser request.

## Restricted-access Owner help

This is a **manual handoff through the person's existing workplace contact**, not a new send endpoint or messaging channel. A restricted screen can explain “Ask your workplace Owner to review your access.” It can offer `/support` or the existing support address if the person cannot reach that contact, using the existing policy/link visibility. No operational roster or Owner directory read is needed or permitted to compose this help.

Minimum user-controlled context: their own Employee ID if they choose to provide it; the generic action/screen that was unavailable; a valid support reference if one was returned. Never automatically attach workplace names, schedules, pay, coworkers, scope grants, raw errors, body data, credentials, cookies or recovery proofs. No automatic lookup/disclosure of an Owner's identity or contact details. No new analytics or collection.

Contract state is `manual_handoff / not_sent`: opening or copying this help has created no request, receipt, message or promised response. Access remains restricted. The Owner reviews scope through the existing authorized process. Do not activate Updates/Conversations to implement this handoff.

## B10: support references

On unexpected errors from diagnostic-enabled routes, read `X-Nevora-Request-Id` from that response only. Validate UUID syntax before displaying/copying it. Label it “Support reference”; keep domain `operationId`, `notificationId`, `DEL-…` deletion reference and Rondo review IDs separate. No universal body `requestId` field was added: existing domain JSON bodies/parsers are preserved. The response header is the diagnostic reference. Expected validation, authorization, stale/conflict and release-hold responses do not acquire diagnostic IDs. Routes without diagnostics may have no reference; do not fabricate one.

The generated reference matches one request-local `server_request_error` event in the existing server stderr stream. Allowed event fields are static route template, generated UUID, bounded error class, optional SQLSTATE and numeric framework digest. Error messages, stack, SQL, raw body, tokens, identity and workforce payloads are omitted. Client-supplied IDs are ignored. A reference by itself is not authentication or evidence that a mutation committed.

Support's responder uses authorized environment/time/route plus the reference to locate that sanitized event, then follows the operation-specific recovery procedure. Copyable text can include the reference, local time and generic screen. Never instruct blind replay of payroll, scheduling, deletion or other mutations. Hosted log access, responder custody and response drill remain operations acceptance; no new vendor or personal-data pipeline is included.

## B11: access and recovery outcomes

| Existing flow/source | Required explanation and safe consumer behavior |
| --- | --- |
| `/login`, `login/actions.ts` | Portal Employee ID is normalized; password is not trimmed. Shared-tablet PIN is a different credential and cannot substitute here. Invalid/inactive/unknown credentials remain generic. Preserve the originally typed ID through expected failures, never the password. |
| `must_change_password` | A proven operator password issues a short-lived replacement proof and goes to `/reset-access#proof=…`; it does not create a portal session. Do not bypass the replacement or invitation/activation requirement. |
| `/api/auth/recovery` | Strict `{employeeId,email}`, intent/same-origin JSON, identical 202 `accepted` response. Work continues after response; this is neither account-existence confirmation nor proof email was queued/delivered. Unreachable mail requires the existing assisted process. |
| `/api/auth/reset-access` | Exact full proof plus password; private workspace envelope is validated server-side. `reset` (200), `invalid` (400), `unavailable` (503). Expired, used, retired/revoked or changed credential/lifecycle proofs are invalid. Never truncate a 43-character proof or the longer workspace envelope; browser syntax admission accepts complete valid envelopes up to 4,096 characters. |
| Successful reset | Password replacement, one-use consumption, retirement of other proofs, all subject portal-session revocations and push detachment/cancellation commit together. Shared Clocker PIN/device/work records are unchanged. Reset does not sign in automatically; use normal sign-in afterward. |
| Uncertain reset response | No reset-status receipt endpoint is promised. Do not repeat a credential mutation blindly or say it failed before commit. Offer deliberate normal sign-in with the intended password, or request a fresh recovery link through the existing generic process. Do not generate/fabricate a session. |
| Assisted recovery | Current Company Manager/Owner with independent verification attestation, current target and hierarchy. A Manager cannot reset an Owner; self-assisted recovery is refused; Manager/Owner accounts need the appropriate other Owner. The proof is replacement authority only and must be treated as secret. |
| Passkey | Preserve flag/browser/config gates, explicit cancellation and failure states. Cancel is not success and does not change credentials. Offer the existing password/recovery route; no automatic passkey replacement or account enumeration. Platform/physical-authenticator acceptance remains separate. |
| Invitation/activation | Seven-day single-use invitation, exact activation/password completion, ordinary sign-in afterward. Expired/used/revoked or wrong-incarnation envelopes grant no access. Do not fabricate a session to make a first-run test pass. |
| First run | Use delivered owner activation/onboarding and employee completion flows. No new onboarding system, skip flag, fake completion or policy change. |
| Session signals / return | Only existing vetted relative `safeReturnTo` routes/query keys are accepted. Full URLs, protocol-relative destinations, arbitrary extra parameters, malformed paths and unsafe fragments are refused. A return path is navigation, not authorization. See shared correction below before treating all session-ended hints as qualified. |
| Language | Existing `nv-lang` cookie accepts only `en`/`es`, then parsed `Accept-Language`, then English. Auth screens consume `readAuthLang`; invitation/reset/change emails are bilingual. Do not propagate arbitrary `lang` or unvalidated return URLs, derive language from Referer, or rewrite proof fragments to carry it. Recovery API response prose still contains existing English strings: Claude must supply localized guidance keyed to typed state without exposing account facts. |

Shared correction **P4-AUTH-01** remains with the existing authentication/security/integration owner: `src/lib/auth/session.ts:endedSessionLogin` presently trusts a Referer's host matching incoming `host` **or `x-forwarded-host`** to infer `ended=1` and a safe relative return path. `safeReturnTo` prevents external redirects, so this is not evidence of an open redirect or access bypass; the hints still derive from spoofable headers and do not meet the requested trust contract. Use a server-authenticated/request-owned destination and trusted configured origin; only a real presented-session fact may justify a session-ended claim. Preserve the allowlist and valid language handling. Add spoofed forwarded-host/Referer and invalid-language fixtures under that owner's scope. Phase 4 did not edit shared session infrastructure or self-close this correction.

## Personal deletion and workplace closure

`submitDeletionRequest` returns `{outcome:"unavailable",reason:"LAST_OWNER"}`; the web action carries `{kind:"unavailable",reason:"LAST_OWNER"}`. It creates **no deletion request** and ends **no session** on this refusal. Explain two existing paths:

1. Establish another active, usable Owner: invited person completes activation/password replacement, retains current Owner/company authority, and has no pending deletion. A newly named, inactive, credential-less or still-must-change Owner is insufficient. The current Owner then deliberately retries their personal deletion with the ordinary password proof.
2. If closing/offboarding the workplace, contact existing support for the separate company-closure process. A support inquiry is not accepted closure, billing cancellation, data disposal or a committed company operation. Existing support can establish custody; verified end-to-end company-closure fulfillment remains an operating dependency.

Accepted `received`/`duplicate` deletion returns the same persisted `DEL-…` request and revokes subject sessions/calendar feeds atomically. A lost response is recovered using the existing password-proven status check; do not create a new request. The acceptance is a manual privacy/support workflow, **not completed erasure**. Follow `docs/compliance/account-deletion-runbook.md` and recorded policy version `2026-11-10`; preserve all approved retention/legal holds. No deletion timer, auto-close, automatic purge or new retention period is added.

Support fulfillment, historical-mailbox verification for withdrawal, actual provider removal and completion contact, subprocessor/DPA/security-overview business review and company-closure custody remain open. The approved public policy text is not proof of live provider configuration or a completed operational drill.

Claude must validate its final consumers on the integrator's combined source for mobile, keyboard/focus, EN/ES and loading/error/empty/success/held/conflict/unknown states. This backend-only phase claims no UI, browser, hosted or overall release acceptance.
