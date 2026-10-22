# 40 Application Security Engineer — authentication and authorization

**Verdict.** The server-side authority model is strong. Every mutation I traced re-derives a session proof from the HttpOnly cookie and checks it again inside the same SQL transaction. Open redirects are blocked, and the recovery tokens are well designed. The weak points are at the front door. Login and account activation have no rate limiting. Activation is claimable with only an employee ID and a phone number. Clocker PINs are 4 digits, managers assign them, and the PIN alone identifies the employee. A Manager also has more power over other Manager accounts than the Owner probably intends.

## Recommendations

1. **Add rate limiting and remove account-enumeration signals on login and activation.**
   - *Why:* `src/app/login/actions.ts:10-44` has no per-ID, per-IP or global attempt limit. A repo-wide search found limiters only for recovery and Clocker PINs.
   - When the ID does not exist, `verifyPassword` (scrypt) is skipped (`actions.ts:30-33`). The faster response tells an attacker that the ID is not an account.
   - An active account with no password yet is redirected to `/activate?employeeId=…` (`actions.ts:22-26`), which confirms the ID exists and is still unclaimed.
   - *Fix:* reuse the bucket table pattern from `password_recovery_limits`, with per-ID and per-IP buckets and exponential backoff. Run a dummy scrypt for unknown IDs. Return the same response in every case.
   - *Impact* High · *Effort* M · *Owner* Backend.

2. **Replace "ID + phone" activation with a single-use, expiring invite.**
   - *Why:* `src/app/activate/actions.ts:9-39` and `src/lib/data/employees.ts:154-184` give the account to whoever first submits a matching ID and phone digits. There is no token, no expiry and no attempt limit.
   - Coworkers usually know each other's phone numbers, and manager-chosen IDs are often guessable.
   - This applies to every account that has not been activated yet, including newly created Manager or Owner accounts (`employees/actions.ts:61` lets an Owner create Owners).
   - *Fix:* issue an invite token the same way `issueAssistedRecovery` issues one: 256-bit, hashed, 15-minute to 7-day expiry, sent by SMS or email or shown to the manager once. Activation should require that token.
   - *Impact* High · *Effort* M · *Owner* Backend + Product.

3. **Strengthen Clocker PIN identity.**
   - *Why — PIN alone identifies the employee:* PINs are looked up by a workspace-wide fingerprint (`src/lib/clocker/pin-crypto.server.ts:21-24`, `pins.server.ts:53-60`). Each guess at a tablet matches *someone* with probability (number of PINs)/10,000.
   - *Why — collision oracle:* PINs must be unique, and a collision returns "This PIN is unavailable" (`pin-authority.server.ts:9,27-28`). Anyone who can set PINs can learn which PINs are in use.
   - *Why — managers know every PIN:* managers set PINs for employees (`employees/[employeeId]/clocker-pin/actions.ts:12-20`), so managers can clock in as anyone.
   - *Why — one tablet can lock out all tablets:* the failure budget is 20 per 5 minutes for the whole workspace (`pin-limits.server.ts:27`). One tablet can use it up and block PIN entry on every tablet at shift change.
   - *Fix:* identify by employee number + PIN, or move to 6-digit PINs the employee chooses on first use. This also removes the uniqueness oracle. Keep the hard lockout per device only, and turn workspace-wide failures into an Owner alert. Consider a photo or "not you?" confirmation on each punch.
   - *Impact* High · *Effort* M–L · *Owner* Backend + Product.

4. **Require the Owner for actions that target another Manager, and notify the account holder.**
   - *Why:* a Manager can do all of the following to another Manager:
     - change their role, email or phone, or deactivate them (`employees.ts:322-335`);
     - issue them an assisted-recovery link, and the raw token is returned to the actor (`recovery.server.ts:47,53`), so the actor can set the password and sign in as them;
     - set their Clocker PIN (`pin-authority.server.ts:51`).
   - The target is never told.
   - *Fix:* when `target.role IN ('MANAGER','OWNER')`, require `actor.role='OWNER'`. Email the account holder whenever assisted recovery, a role change, an email change or a PIN change happens.
   - *Impact* Medium–High · *Effort* S · *Owner* Backend.

5. **Enforce manager location scope on mutations, not just reads.**
   - *Why:* `managerScopeStatements`/`managerLocationsSql` are only used by 4 read modules: today, clock-monitor, management-profile and action-request-facts (`src/lib/data/manager-location-scope.server.ts`).
   - The schedule, requests, employees, timecards and exchange mutations check only `role IN ('OWNER','MANAGER')`.
   - Once a `LOCATIONS` grant ships, a manager scoped to one store could still edit every store.
   - *Fix:* add the scope guard to every management mutation before location-scoped managers are released.
   - *Impact* Medium (not exploitable yet) · *Effort* M · *Owner* Backend.

6. **Add MFA and step-up re-authentication for the Owner (and optionally Managers).**
   - *Why:* the only sign-in factor anywhere is an 8-character-minimum password (`password.ts:8`). The Owner controls payroll export, payment instructions, Clocker device enrollment and assisted recovery.
   - *Fix:* support TOTP or passkeys. Require a fresh re-authentication within the last 10 minutes for payroll export, device registration and assisted recovery.
   - *Impact* High · *Effort* L · *Owner* Backend + Product.

7. **Ship security headers on every route.**
   - *Why:* `X-Frame-Options`/`frame-ancestors 'none'` are only set on the Clocker and recovery paths (`next.config.ts:18-27`). `/login` and every `/app/*` page (approve, publish, payroll) can be framed, which allows clickjacking.
   - There is also no HSTS and no baseline CSP.
   - *Fix:* add a global `source: "/:path*"` entry with `frame-ancestors 'none'`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options` and a starter CSP.
   - *Impact* Medium · *Effort* S · *Owner* Backend.

8. **Harden the portal session cookie and its lifecycle.**
   - *Why:* `fuel_session` has no `__Host-` prefix and uses `SameSite=Lax` (`src/lib/auth/session.ts:11,47-53`). The Clocker cookies are already `__Host-` and `Strict` (`clocker/setup.server.ts:20-23`).
   - The session has a 14-day absolute lifetime and no idle timeout.
   - Logout revokes only the current session. There is no "sign out other devices" and no list of active sessions.
   - Expired `employee_sessions` rows are never purged.
   - *Fix:*
     - rename the cookie to `__Host-fuel_session` in production;
     - add an idle timeout of about 12 hours for Owner and Manager;
     - add a "sign out everywhere" control;
     - schedule a purge of expired rows.
   - *Impact* Medium · *Effort* S–M · *Owner* Backend + UI.

9. **Stop the global recovery buckets from acting as a lockout switch.**
   - *Why:* request recovery has a hard global cap of 300 per 15 minutes (`recovery.server.ts:18,31-32`), and reset has a hard global cap of 250 per 15 minutes (`recovery.server.ts:61-68`). Anyone who sends about 300 junk requests blocks password recovery for every user for that window.
   - The per-ID and per-token buckets already give the real protection.
   - *Fix:* make the global limit per IP, or treat it as an alert rather than a deny.
   - *Impact* Low–Medium · *Effort* S · *Owner* Backend.

10. **Two small fail-closed gaps.**
    - **(a) Origin check trusts request headers in production.** When `FUEL_PORTAL_ORIGIN` is unset, `correctionBoundary` derives the allowed origin from `Host` and `X-Forwarded-Proto` (`src/lib/time-corrections/http.server.ts:23-35`). The Clocker check refuses to run in production without a configured origin (`setup.server.ts:33`). Make `correctionBoundary` do the same.
    - **(b) `must_change_password` is never enforced.** It is read (`employees.ts:90,103`) but login ignores it (`login/actions.ts:28-44`). Enforce it or remove it, so a future "temporary password" feature doesn't silently fail open.
    - *Impact* Low · *Effort* S · *Owner* Backend.

## What's good
- **Re-verified mutation proofs.** Mutation proofs come only from the server and are re-verified inside the same transaction after locks are taken, including wall-clock expiry (`src/lib/data/management-session.ts:26-35`). Timecard self-review is blocked in SQL (`db/migrations/0022_timecard_reopen_revision_authority.sql:16`), and payroll documents are scoped to the workspace and the employee's own statements (`src/lib/payroll/access.ts:44-50`).
- **Password recovery.** Tokens are 256-bit, stored hashed, single-use and expire after 15 minutes. They are delivered in the URL fragment (`#proof=`), so they stay out of server logs and Referer headers. A reset revokes all sessions and push subscriptions (`recovery.server.ts:78-83`). The public response is identical whether or not the account exists, and the work runs after the response is sent (`api/auth/recovery/route.ts:13-16`).
- **Redirects and CSRF.** `safeReturnTo` allow-lists the path and each query key, which blocks open redirects (`src/lib/notifications/destinations.ts:33-60`). JSON routes require a custom header, an exact `Origin`, `Sec-Fetch-Site` and a content type. Clocker tablet setup revokes the Owner's portal session on handover (`api/clocker/[location]/setup/route.ts:15-22`).

## Not checked / limits
- Code reading only; per the brief, no browser and no live requests. I did not confirm the Next.js server-action origin behaviour behind the production proxy (`x-forwarded-host`).
- I did not audit database roles, grants or row-level security, the inner logic of `executeShiftChange`, the payroll grant model, or the communications service beyond its entry checks.
- The F10 multi-tenant code (`portal-request.server.ts`, `portal-credential-session.*`) is marked unused. Today's authorization assumes a single workspace: login looks up a globally unique `employees.id` with no workspace binding (`employees.ts:108`, `session.ts:88-93`). Any move to a shared multi-tenant database will need workspace binding on login, sessions and every lookup by ID.
- No dependency or CVE scan.
