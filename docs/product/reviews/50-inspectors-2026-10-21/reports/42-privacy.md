# 42 Privacy Engineer — employee personal data, end to end

## Verdict
NEVORA collects little sensitive data, and the engineering around it is careful. There is no GPS, no biometrics, no IP or user-agent capture, no SSN or bank data, no third-party analytics, push text that is safe on a lock screen, and payroll documents locked to the Owner or an explicit grant. The gaps are in governance, not code quality. There is no retention or deletion policy, and most history tables are append-only forever. There is no employee-facing privacy notice in English or Spanish. Role and profile changes leave no audit trail. Managers see every location's people and phone numbers even though the product already models "assigned" locations. These need decisions from Jose and counsel before real employee data grows.

## Recommendations

1. **Decide and implement a retention and deletion schedule, including a path to strip personal data from former employees.**
   *Why:* Nothing purges or redacts personal data. Employees can only be deactivated ("History is preserved", QAOWNER-person-390.png). Immutability triggers block every UPDATE and DELETE on `payroll_documents` (stored PDFs with pay), `payroll_export_receipts` (payload up to 1 MB, `0019_payroll_export_mappings.sql:8-16`), `calendar_subscriptions`/`calendar_operations` (`0025_calendar_subscriptions.sql`), `shift_change_events` and the clocker events tables. Expired `employee_sessions` and recovery proofs are never cleaned up; the only session deletes are on logout, recovery and deactivation. The PRD already proposes durations (`docs/architecture/phase-f-approved-prd.md:21-22, 218-224`: 7/30/90 days, communications 12/24 months), but no code implements them, and communications explicitly "awaits D04 retention approval" (`0024_contextual_communications.sql:2`). Timecards and payroll have legal minimums (US FLSA record keeping; Puerto Rico Department of Labor rules); **confirm the periods with counsel**. Then add a scheduled purge for operational data and an "anonymize former employee after N years" step that keeps totals and hashes but removes phone, email and free-text notes.
   *Impact:* High · *Effort:* L · *Owner:* Product (policy) + Backend

2. **Publish a bilingual (EN/ES) employee privacy notice and link it from activation, login, Profile and the Clocker.**
   *Why:* The UI and `public/` contain no privacy policy, notice or terms. The only privacy copy is small notes on pay (`components/payroll/my-pay.tsx:33`) and the calendar link (`calendar-subscription-panel.tsx:41`). Employees are never told what is collected: name, phone, email, availability, punches and breaks, which Clocker device was used, pay statements, illness reasons on callouts, and push device registration. They are also never told who sees it, how long it is kept, or who to contact. **To confirm with counsel:** Puerto Rico's constitutional privacy right (Const. Art. II §8) is generally understood to apply between private parties, including employers. State laws on employee notice and access vary for US customers. Who is the controller (the business) and who is the processor (NEVORA/VELANI)? The customer contract/DPA should say so and list the sub-processors (Neon, Vercel, the SMTP provider, Apple/Google push services).
   *Impact:* High · *Effort:* M · *Owner:* Product (text, counsel) + UI

3. **Audit every profile, role and access change, and consider requiring the Owner to grant Manager.**
   *Why:* `updateEmployeeProfile` overwrites `employees` in place with only `updated_at` (`src/lib/data/employees.ts:302-420`), and no event or revision table exists for profiles (grep found no role-change history). A Manager can promote an Employee to Manager, which grants access to every coworker's phone and email, the Team list, reports and CSV export. A Manager can also demote or deactivate other Managers and edit contact details (`employees.ts:322-335` blocks only Owner targets and the Owner role). Add an append-only `employee_profile_events` table (actor, time, fields changed, old→new for role/active/location, masked values for phone/email) and an Owner-visible "Access changes" list. Recommend Owner-only promotion to Manager.
   *Impact:* High · *Effort:* M · *Owner:* Backend + UI + Product (who may grant Manager)

4. **Make a Manager's view of people match their location scope, and add a workspace filter to `listEmployees` before multi-tenant.**
   *Why:* The management profile already distinguishes `scope:'all'|'assigned'` (`src/lib/data/management-profile.server.ts:26`). However, `listEmployees()` (`employees.ts:31-59`) has no workspace or location filter, and the Team directory (QAOWNER-team-1440.png) and the reports CSV (`src/lib/reports/service.ts:87`, workspace-wide) show every location's people. The unfiltered query is safe today only because `getWorkspace` throws unless exactly one workspace exists (`src/lib/data/workspaces.ts:27`). With a second tenant in the same database, it would leak names, phones and emails across companies.
   *Impact:* High (latent) · *Effort:* M · *Owner:* Backend

5. **Log every export and personal-data download, and warn on export.**
   *Why:* The payroll-export flow writes receipts, but the reports CSV (`src/app/api/reports/export/route.ts`), payroll PDF downloads (`src/app/api/payroll/documents/[id]/route.ts`) and period-close artifacts (`src/app/api/period-close/artifact/route.ts`) record nothing about who downloaded what. The CSV holds per-employee hours, entries, attendance observations and callout/time-off rows. Store the actor, time, period, format and row count (not content). Add the My Pay style note ("Downloaded files contain personal information") to the Insights export and the Payroll document links.
   *Impact:* Medium · *Effort:* S–M · *Owner:* Backend + UI

6. **Shorten idle sessions for Owner/Manager and re-authenticate before payroll and exports.**
   *Why:* All roles get a 14-day cookie (`src/lib/auth/session.ts:12`) with no idle timeout or step-up. One unattended phone or shared office PC gives the whole roster's phone numbers, payroll PDFs and CSV export. The cookie is otherwise well built (httpOnly, SameSite=Lax, hashed token). Suggested: about a 12h idle limit for management roles, a fresh password check before payroll review or export, and a nightly purge of expired sessions.
   *Impact:* Medium · *Effort:* M · *Owner:* Backend + Product

7. **Minimize contact data on lists, and stop requiring a personal phone.**
   *Why:* `employees.phone` is `NOT NULL` (`db/migrations/0001_initial.sql:22`). The Team list shows every phone in a column at 1440 (QAOWNER-team-1440.png) and puts it in each row's screen-reader label (`src/components/employee-directory.tsx:80`), so a casual screen share exposes the roster. Show the phone only on the person page, make phone optional or "work contact", and say why it is collected.
   *Impact:* Medium · *Effort:* S · *Owner:* UI + Backend (nullable column) + Product

8. **Treat callout illness reasons as health-adjacent data: guide the input, limit who sees it, and redact it later.**
   *Why:* The callout form offers "Illness / sick" plus a free-text note ("What should your manager know?", `src/components/reviewed-callout-form.tsx:14,87`). Both are copied into append-only `shift_change_events.callout_reason_code/note` (`0010_shift_coverage_automation.sql:158-159`) and kept forever. The schema already restricts them to requester and management, never coworker candidates (confirmed in `src/app/app/exchange/page.tsx:155`, own callouts only). Add helper text in EN and ES ("Don't include medical details"), show the note only to the reviewing manager or Owner, and redact the note N days after resolution. **To confirm with counsel:** ADA confidentiality of medical information and Puerto Rico sick-leave documentation rules.
   *Impact:* Medium · *Effort:* S (copy) / M (redaction) · *Owner:* UI + Backend + Product

9. **Give employees a "Your information" view and a way to request corrections.**
   *Why:* The employee Profile shows read-only work details and app settings (`src/app/app/profile/page.tsx`). Employees cannot see what NEVORA holds about them (contact, availability, device alerts, calendar link, pay statements), cannot ask for a correction, and cannot download their own time records except by viewing My Time. A small section listing the data plus "Ask your manager to correct" and "Download my time (CSV)" covers most access expectations without new legal machinery.
   *Impact:* Low–Medium · *Effort:* M · *Owner:* UI + Product

10. **Delete the hard-coded "estimated earnings" rates.**
    *Why:* `src/lib/employee-compensation.ts:14-20` defines invented hourly rates by role (Owner $26 … Employee $16) and `calculateEstimatedEarnings`. Nothing calls it today. If it were ever wired up, it would show made-up pay as if it were personal pay data.
    *Impact:* Low · *Effort:* S · *Owner:* UI

## What's good
- **Very little sensitive data:** no geolocation (`navigator.geolocation` has zero hits), no biometrics, no IP or user-agent storage, and no SSN, tax or bank fields. `src/lib/payroll/contracts.ts:1` says "No … raw bank/tax data". The Clocker shows only the first name after the PIN and clears on `pagehide` (`clocker-pin-gate.tsx`).
- **Notification and link privacy are well built.** Push titles and bodies are generic and lock-screen safe (`src/lib/notifications/payloads.ts`). Push subscriptions store encrypted material plus `consent_at` (`0007_portal_web_push.sql`). Calendar feeds use a hashed, revocable token that stops working when the employee is deactivated (`src/lib/data/calendar-subscriptions.server.ts:24-25`). Recovery emails put the proof in the URL fragment. Deactivation revokes sessions.
- **No leaks through telemetry.** No analytics or error-tracking SDKs, no `console.*` in runtime `src` (tests only), and error pages and job errors carry codes, not data. The CSV export is protected against formula injection with `no-store`/`nosniff` headers (`src/lib/reports/csv.ts:3-7`). Payroll document access is Owner or explicit review grant, and employees can open only their own published statements (`src/lib/payroll/access.ts:9`).

## Not checked / limits
- Browser not allowed. All findings come from code, schema and the provided screenshots, not live requests.
- Neon backup and point-in-time-restore retention, Vercel log retention, data residency and region, and the SMTP provider were not inspected. Backups keep "deleted" data and must be part of item 1.
- The tenancy runtime (`src/lib/tenancy/*`, RLS on `nevora_tenancy.*`) was not verified against live roles.
- Spanish copy of the existing privacy notes and whether Lead roles get any extra contact access were not verified.
- Legal points (PR constitution, Ley 111-2005 breach notice scope, FLSA/PR record retention, ADA, US state laws) are **items to confirm with counsel**, not conclusions.
