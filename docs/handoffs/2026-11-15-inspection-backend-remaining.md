# Remaining Nov 14 inspection handoff

Jose resumed this work on Nov 15 after the foundation checkpoint `2d082042e`. Codex owns backend and hosting; Claude owns presentation. Development is the operating and acceptance line, held to production standards. Main and production remain unchanged. Local fictional PostgreSQL and browser evidence does not establish hosted activation or real delivery.

## Reconciled scope

- External calculation with NEVORA-managed statements is approved. New work defaults to `NEVORA_PAYROLL_CALCULATION_MODE=external`; exact `native_provisional` is an explicit test/operator opt-in, independent of payroll availability. No new 2027 native rules, native payment exports, native YTD policy or historical PDF rewrite is part of this release.
- Billing uses the existing functional central `/pages/plans` entry, delegated from company `/app/billing` (Nov 13 central billing plan). Strict durable billing idempotency remains Jose's Nov 12 decision. Unknown provider outcomes retain their original operation and payload.
- Nov 10 approved Employee ID plus PIN, person-scoped limits, Forgot password link and the V3 Monto wording. Nov 14 Owner simplicity permits optional employee email and explicitly selected Company/Locations Manager assignments. Optional email does not authorize a new knowledge-only activation channel or global Manager access.
- Spanish rollout timing, offline/late punches and new early/forgotten-punch policy remain separate product decisions. Existing policy and approved historic document versions are preserved. No repeat question is needed for external statements or the billing entry.

## Backend contract for Claude

| Surface | Contract |
| --- | --- |
| Payroll availability | `internalCalculatorAvailable=false` in external mode, even when native tables exist. New PREPARE (request and worker) creates `PROVIDER_IMPORT` / `WAITING_FOR_AMOUNTS`. Structured `NEVORA_PAYROLL_IMPORT_V1` remains the supported import. |
| Native refusals/history | `NATIVE_CALCULATION_DISABLED` (409) for new native recapture/correction/approval and financial profile writes. Current authorization precedes refusal. Saved actor-scoped receipts and Manager scope administration remain available. Existing issued statement bytes and publication access stay immutable. |
| Corrections | Run reads add `correctionDelta`: signed USD minor-unit `totalNetMinor` and `employees` with employeeId, previousNetMinor, netMinor and deltaNetMinor. Null means both authorized populations are not available. This compares statements and never confirms settlement. |
| Preparation | Run reads add `currentPeriod` with period, payday, workplace timeZone, asOfDate and settingsRevision, or null without an effective schedule. External statements do not require confirmation of native tax rules. Claude owns connecting the Timecards link to this guidance. |
| Today/setup | Adds `clockerRegistered` and `setupProgress` (teamSize, publishedSchedule, registeredClocks, peopleWithPins, paySchedule). Counts use the actor's permitted locations; active people include management. Registration is a stored fact, not punch-feature activation. |
| Things to do | Active action items add correction recorded/requested start/end instants, workplace zone and workDate; exchange request facts add exchangeKind. Restricted canonical F1 capture remains unchanged. |
| Invitations | Managers may read readiness for a person wholly within their current operational scope; allowedCommands is empty. Owner-only writes/replays stay Owner-only. `deliveryAvailable` reports configured capability, not proven delivery. Invitation emails include Employee ID. |
| Profile/messages | Own profile adds email/phone. Notification snapshots add workplace timeZone. Currently authorized list items carry eventType, outcome, names and count where available, plus factual event titles and existing date subject. Private reasons and payroll amounts remain excluded. Push privacy copy is unchanged pending language scope. |
| Billing | Company status adds workplace timeZone. Central status already gets the zone from current installation facts and now exposes subscriptionStatus. No optimistic checkout-completed assertion is inferred from a return URL. Shell nav context adds billingEnabled. |
| Kiosk | New setup-only refusal `NEW_TABLET_SETUP_PAUSED` (402), distinct from setup misconfiguration. Existing enrolled tablet reconciliation runs before this refusal. |
| Import | Single-company routes return `ROSTER_IMPORT_NOT_ENABLED` (404). Preview adds positions by id/name and capacity (activeEmployees, employeeLimit, remaining, importAdds); null limit is unconfigured, not unlimited. Canonical validation retains its outer code with underlyingCode/underlyingMessage in params. Server write limits remain authoritative. |
| Period close | Plain failure sentences retain status, same-operation retry and existing Owner-only exclusion rules. `/app/pay` is no longer a commerce recovery exemption. |

## Operator password and authentication

An operator-created Owner credential starts with `must_change_password=true`. After normal password verification, login issues a hashed, 15-minute `INITIAL_PASSWORD` replacement proof bound to exact employee/credential revisions under locks, redirects to the existing reset screen in a workspace-bound fragment and issues no app session. A new proof retires old unused proofs. The existing reset transaction consumes it once, refuses reuse of the temporary password, clears the flag, revokes sessions and detaches push. Normal session issuance, session reads, management mutation guards and passkey registration/login deny flagged credentials. The additive `0063_initial_password_replacement.sql` and canonical manifest are required together.

Claude's pending keep-ID cookie, session-end return, restricted page and Accept-Language changes were inspected read-only in the collaboration checkout. Keep the HttpOnly short-lived cookie on all expected failures and clear it after either successful sign-in or transfer to replacement. Return destinations remain local paths accepted by safeReturnTo; Referer is only navigation guidance and grants no authority. Resolve the four direct schedule-settings redirects consistently when integrating Claude's reviewed source. The reviewed immutable UI checkpoint has not yet been observed; do not import the dirty checkout.

## Verification and next gate

Implementation and verification are in progress; this document is a contract, not a release certificate. Retained RED/GREEN, SQL and browser logs are under `.superpowers/sdd/2026-11-15-external-payroll-statements/`. CTO direction is additive contracts and explicit calculation policy; CISO direction is no operational session before required replacement and current scoped authority at every protected boundary. Product scope is imported statements; program/release gate is combined immutable source, source-bound manuals and development qualification. Hosted settings, log retention/destination, SMTP delivery and sandbox billing traversal must be verified separately without activating customers or real effects.
