# Phase D account recovery

UX-01 uses the existing password credentials and portal sessions. UX-02 activation identity proof remains OPEN / DEFERRED; activation code and policy were not changed.

## Customer journey

Sign In → Forgot access → employee ID and registered recovery email. Every known, unknown, inactive, mismatched-channel and unavailable-channel request has the same 202 response. Lookup/delivery run after that response, so their latency is not an account-existence signal. Same-origin JSON/header checks and bounded request bodies apply. Requests are limited to three per account and 300 globally per 15-minute bucket; stale buckets are pruned and new account buckets are not created after the global cap.

Email contains a server-generated 256-bit, single-use proof valid for 15 minutes. Only its SHA-256 hash is stored. The proof is bound to the existing credential and employee profile version. URL fragments keep it out of HTTP query/access logs and referrers; the browser removes the fragment and keeps the proof only in the reset form. GET/scanner visits never consume a proof. Reset attempts are bounded before password hashing (250 globally and ten per proof per 15-minute bucket).

Reset replaces the existing scrypt password, consumes the proof and retires other unused proofs atomically. All portal sessions end; push subscriptions detach, their encrypted material clears, generations rotate, pending deliveries cancel and installation tombstones remain. Normal sign-in is required. A reviewed old credential cannot create a new session after reset. Expired/reused/retired/mismatched proof returns one invalid-proof state with a route to new or assisted recovery. A lost response instructs the customer to try their new password before requesting another proof.

Roles, eligibility, employee profile, schedules, Clocker PIN/device identity, raw punches, break history, correction history and timecard/export revisions are outside the reset mutation. Clocker PIN verification is a separate credential; preserving it also preserves uncertain punch recovery and device/location binding.

## Assisted recovery

Forgot access and Reset access direct a customer whose registered channel is inaccessible to their current manager or Owner. `/app/account-recovery` requires current Owner/Manager proof, an independent workplace identity-verification record and a secure direct transfer of the recovery proof. No newly supplied email/phone is trusted or substituted. The same reset protocol consumes this proof.

No self-issued assisted proof is allowed. Manager cannot issue proof for an Owner; another current Owner must independently assist an Owner. A workspace that cannot establish that authority must retain the existing password and use its verified ownership-support process; this implementation creates no support identity, bypass credential or automatic authority exception. Such a production exception remains Jose's decision.

## Delivery and release state

`recoveryDelivery` is a configurable SMTP adapter for an existing approved account, using current Nodemailer 10.0.16. Production requires canonical HTTPS `FUEL_PORTAL_ORIGIN`, explicit SMTP host/port/user/password/from and TLS or mandatory STARTTLS. File/URL content access, logs/debug and multiple recipients are disabled. `.env.example` documents variable names without values. Missing configuration leaves assisted recovery available and makes no email-delivery claim.

Browser QA uses an invocation-owned loopback SMTP fixture and fictional `.invalid` recipients only. No external provider, paid service, customer email, production secret or production configuration was used. Real SMTP configuration/delivery is a separate release state and is not claimed verified.

Design references verified October 7, 2026: [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [official Nodemailer SMTP options](https://nodemailer.com/smtp), [message security options](https://nodemailer.com/message). This document states implementation behavior; it does not claim independent certification or production authorization.
