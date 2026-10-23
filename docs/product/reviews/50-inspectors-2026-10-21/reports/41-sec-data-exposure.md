# 41 Application Security Engineer — data exposure (RSC payloads, JSON, props, URLs, storage)

**Verdict.** Employees get very little data, and that part is well built. In 38 pages and 6 APIs fetched as `AUDIT-E` there were no phone numbers, no email addresses and no other employee's ID. The risks are on the manager side and in the structure. Two shift pages send every person's phone and email to the browser even though the form doesn't use them. The "assigned locations" model shown to Managers is enforced in only 4 reads. Phone numbers, which these pages spread widely, are also half of what's needed to activate an account.

## Method (what was actually run)
- Read-only GETs to the preview with the stored `QAOWNER`, `AUDIT-M` and `AUDIT-E` cookies (values never printed). That covered 38 `/app/*` routes per role, 3 employee-profile routes, `/clocker/<key>` signed out, and about 25 JSON APIs. Where an API needs a header, I sent the session-derived value the page itself provides.
- Pulled the RSC flight data out of each HTML response, then searched it for emails, phone patterns, and keys such as `phone|email|pin|hash|token|rate|address`. I then checked each hit against the client component that receives it.
- Code review of the data loaders, route handlers, `next.config.ts`, session, activation, payroll access, push payloads and every `localStorage`/`sessionStorage` use.

## Recommendations

1. **Stop sending full `Employee` records to the shift form. Send a small "who can I assign" type instead.**
   - *Why:* `/app/schedule/new` (Manager and Owner) puts all 13 people into the flight data with `phone` and `email` (13 phone, 7 email values), including both Owners. It also sends each `Location`'s `clockerKey` and `workspaceId`. These go to the client component `CreateShiftForm` (`src/app/app/schedule/new/page.tsx:108,120`), which, like `ShiftAssignmentFields`, never reads phone or email (`src/components/create-shift-form.tsx:18-51`). `/app/schedule/edit` passes the same list to the client component `ShiftEditAssignment` (`src/app/app/schedule/edit/page.tsx:47,77`). `listEmployees()` also returns inactive people (`src/lib/data/employees.ts:31-59`, `ORDER BY e.active DESC`), so former staff's contact details would ship too. The weekly roster already does this correctly with a `RosterEmployee` projection (id, name, role, hours, shifts and no contact fields), so copy that pattern.
   - *Impact:* Medium · *Effort:* S · *Owner:* UI

2. **Enforce the Manager location scope on every manager read, or stop showing "Assigned locations" until it's enforced.**
   - *Why:* `managerScopeStatements` (F6 `ALL_TENANT`/`LOCATIONS` grants) is used only in `today.server.ts`, `clock-monitor.server.ts`, `action-request-facts.server.ts` and `management-profile.server.ts`.
   - It isn't used in:
     - `listEmployees` (directory, ⌘K finder `src/app/api/manager/finder/route.ts:16`, schedule new, edit and coverage, availability)
     - `getEmployeeManagementProfile` (`src/lib/data/employees.ts:213-241`)
     - timecards (`src/lib/timecards/service.ts:117`, where `$2::boolean OR e.id=$3` means a manager sees the whole workspace)
     - reports, attendance review, requests and availability submissions
   - The Manager profile already tells `AUDIT-M` "Assigned: Main Office, West Office" (`docs/product/specs/p35-profile/inspection/widths-roles.md:31`). Once location grants are installed, a manager limited to one location would still see every location's people (with phone and email), timecards and reports.
   - *Impact:* High when grants ship · *Effort:* M–L · *Owner:* Backend (Codex); Product decides whether location-limited managers are in this release

3. **Treat the phone number as a credential, because today it is one.**
   - *Why:* First-time activation needs only Employee ID + phone digits and sets the password (`src/app/activate/actions.ts`, `src/lib/data/employees.ts:155-183`).
   - Login with any password redirects any not-yet-activated ID to `/activate?employeeId=…` (`src/app/login/actions.ts:22-25`). That works as an oracle for "this ID has no password yet". I found no throttling on login or activation.
   - Employee IDs are the login names. They appear in URLs (`/app/employees/AUDIT-E`), in the finder JSON and in the directory. Phones are shown to all managers and sent in item 1's payload.
   - Anyone who knows a new hire's ID and phone (often coworkers) can claim the account before they do.
   - *Fix:* Activate with a one-time code the manager issues. Assisted recovery already has this flow (`src/components/assisted-recovery.tsx`). Also make login respond the same way whether or not the ID is activated, and add throttling. Until then, show only the last 4 digits of phone numbers in the directory list.
   - *Impact:* High · *Effort:* M · *Owner:* Backend + Product

4. **Make workspace scoping explicit in the legacy employee loaders.**
   - *Why:* `listEmployees`, `getEmployeeManagementProfile`, `getEmployeeActivationState`, `activateEmployeeCredential` and `findEmployeeCredential` query by `id` only, over the bootstrap `getDb()` connection, with no `workspace_id` filter. Newer code does filter by workspace (timecards `l.workspace_id=$1`, payroll `d.workspace_id=${ws}`).
   - This is safe under the single-company direction (`README.md:7`). The day SaaS resumes, though, it becomes cross-workspace leakage and lets anyone open a record just by guessing its ID (the directory, the finder and `/app/employees/[id]` would list or open any workspace's people).
   - *Fix:* Join on `locations.workspace_id` now, the same way timecards does, so it isn't missed later.
   - *Impact:* Medium now, High once multi-workspace · *Effort:* M · *Owner:* Backend

5. **Add baseline privacy headers to every signed-in page.**
   - *Why:* `next.config.ts` applies `no-store, private`, `Referrer-Policy: no-referrer`, `frame-ancestors 'none'` and `nosniff` only to the clocker and recovery paths. There's no `proxy.ts` or middleware.
   - Measured: `/app/employees` and `/app/schedule/new` (Manager) return none of those headers, and `Cache-Control` is `no-cache, must-revalidate` in this preview. JSON APIs already send `no-store, private` and `Vary: Cookie`.
   - *Fix:* Extend the same header block to `/app/:path*`, and confirm the values on the production build.
   - *Impact:* Medium · *Effort:* S · *Owner:* Backend (config)

6. **Clear per-user browser storage when a different person signs in on the same browser.**
   - *Why:* `localStorage` keys include employee IDs and pending command bodies:
     - `nevora-copy-pending:<actorId>` (`src/components/schedule-copy-form.tsx:21`)
     - `nevora-period-pending:<actorId>:<dates>` (`src/components/payroll-period-close.tsx:23`)
     - `nevora-payroll-operation:<scope>` (`src/components/payroll/use-payroll.ts:65`)
     - celebration and push-coordination keys
   - Nothing clears them at sign-out (no `Clear-Site-Data`, no purge found). On a shared back-office PC the next user's browser keeps them.
   - *Fix:* Purge `nevora-*` keys that belong to another actor at login. Keep the retry records for the same actor so retries stay safe.
   - *Impact:* Low · *Effort:* S · *Owner:* UI

7. **Confirm production hides server error text.**
   - *Why:* One Employee `GET /app/my-pay` returned 500, and its RSC payload carried the raw database error "Connection terminated unexpectedly". The retry returned 200.
   - This is dev-mode behaviour (the preview sends dev debug rows). Production Next should replace the message with a digest. Add a release check that the deployed build is a production build, and force one error to confirm.
   - *Impact:* Low · *Effort:* S · *Owner:* Backend

8. **Make Clocker location keys unguessable, or hide the location name before a tablet is enrolled.**
   - *Why:* A signed-out `GET /clocker/2` shows "Main Office" and the business timezone. The fixture keys are `2` and `110`. The default key is `location-<uuid>` (`src/lib/data/locations.ts:34`), but custom short keys are accepted.
   - *Impact:* Low · *Effort:* S · *Owner:* Backend

9. **Lock in what works with a payload-shape regression test.**
   - *Why:* The current Employee payloads are clean, and nothing stops that from regressing.
   - *Fix:* Add a small test that signs in as each role, extracts the flight data, and fails if:
     - `"phone":` or `"email":` appears outside allowlisted pages (directory, member profile, own profile)
     - an Employee or Lead payload contains another employee's ID
     - an Employee payload contains `clockerKey`
   - Also add a type-level rule that `"use client"` props never accept the full `Employee` type.
   - *Impact:* Medium · *Effort:* S · *Owner:* UI

## What's good
- **Employee side is tight.**
  - In 38 `AUDIT-E` pages there were 0 emails, 0 phones and no coworker IDs. Manager-only pages redirect before any data is sent.
  - The employee APIs return small views. For example, `/api/employee/profile` returns only name, role, workspace, timezone and locations, and communications include only your own read and acknowledgement state.
  - Timecards throw `Incorrect scope` if an employee result ever contains another person's card (`src/lib/timecards/service.ts:123`).
  - Payroll documents are checked by workspace and owner or payroll grant (`src/lib/payroll/access.ts`). A Manager gets 403 on payroll runs and settings.
- **APIs are defensively shaped.**
  - They require custom headers and session-derived authority hashes, reject cross-site requests, and send `no-store` with `Vary: Cookie`.
  - The ⌘K finder returns only id, name and role, by design.
  - The kiosk PIN reply returns only the first name.
- **Low-leak channels.**
  - Push payloads are generic, with no names, shifts or pay (`src/lib/notifications/payloads.ts`).
  - The reset-link proof travels in the URL `#fragment`.
  - The calendar feed contains only summary and location, and is excluded from request logs (`next.config.ts`).
  - Production code doesn't use `console.*`, and nowhere stores bank, SSN, address or pay-rate data.

## Not checked / limits
- No Lead session was available. Lead behaviour is inferred from code (`SELF_SERVICE_ROLES` share the Employee paths).
- No browser was used, so live `localStorage` contents, service-worker caches and client-side fetches made after the first paint weren't observed.
- I didn't inspect the response shapes of POST-only reads (reports, action center, manager timecards, communications history), because each needs a crafted request body.
- I didn't check production response headers, server error redaction or live rate limiting.
- Location-scope findings come from code. The preview appears to be on the legacy all-locations model, so I couldn't show a location-limited manager receiving out-of-scope data at runtime.
