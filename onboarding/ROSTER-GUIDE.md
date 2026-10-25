# Employee roster collection guide

**Template ready for review; collection and entry NOT_STARTED.** [EMPLOYEE-ROSTER.csv](EMPLOYEE-ROSTER.csv) is a header-only collection worksheet for manual entry, **not a supported application import format**. Make a private copy in agreed secure storage; never commit real rows here.

## Fields and validation

Use one row per company employee and preserve nine headers. Labels describe this worksheet. Separate multiple names/keys with semicolons; quote cells containing commas. Keep ID/phone columns as text to preserve leading zeros. Never execute cell formulas.

| Column | Required? | Meaning and review rule |
| --- | --- | --- |
| `employee_id` | Yes | Unique sign-in identifier chosen by the company; maximum 128 characters. Trim whitespace; creation uppercases it. Check uniqueness after normalization and preserve leading zeros. No customer prefix is required. |
| `first_name` | Yes | Employee's first name; trimmed, nonempty, maximum 160 characters. |
| `last_name` | Yes | Employee's last name; trimmed, nonempty, maximum 160 characters. |
| `phone` | Yes | Contact number accepted by current source: ten digits, optionally preceded by country code 1. App normalizes to XXX-XXX-XXXX. Other international formats require Engineering review. |
| `email` | No for saving | Valid unique registered address, maximum 254 characters. Confirm the employee controls it; avoid shared mailboxes. Required for the invitation activation path. Blank is permitted for record creation. |
| `access_role` | Yes | OWNER, MANAGER, LEAD or EMPLOYEE. Customer Owner approves; only an Owner grants Owner access. Record explicit Manager management scope in [intake](COMPANY-INTAKE.md). |
| `primary_location` | Yes | One approved active company location, using the intake name/key. Operator maps it to the actual application choice. |
| `eligible_locations` | Yes | Approved active locations where this employee can work; include primary. Additional locations are optional. Server always includes primary. Work eligibility is separate from Manager management access. |
| `position_qualifications` | No | Approved active optional position names/keys the employee is qualified to perform. Leave blank when none. Qualifications are separate from access role. |

Reject hidden control characters. Resolve duplicates and unknown location/position mappings with Customer Owner before entry. Never silently alter existing records.

## Review and manual entry

1. Customer Owner confirms company structure, active locations, qualifications and access decisions; roster preparer checks required cells and normalized duplicates. Reviewer records counts and approval reference privately.
2. Authorized Owner or Manager with Company management access opens Employees → New employee (`/app/employees/new`). If unavailable, escalate; do not bypass access. Managers cannot create Owners.
3. Enter reviewed names, phone, Employee ID, role and primary location. Expand Positions for qualifications and eligible locations; add optional email. For a Manager, an Owner explicitly assigns Company or selected-location management scope; if a Manager created the record, an Owner must assign management access afterward.
4. Save once, reopen the employee and compare every field with the reviewed row. Creation sets the employee active in source. Keep later/withheld cohorts outside entry until approved; record creation alone is not account activation. On a conflict, reload and review current data. On an uncertain save, reconcile the displayed action outcome before retrying.
5. Customer Owner uses Account invitation separately. Registered email and available delivery are prerequisites; delivery is disabled by default. Track receipt, activation and sign-in separately from issuance. Follow [the playbook](ONBOARDING-PLAYBOOK.md) and [support procedures](../support-training/SUPPORT-PROCEDURES.md) for exceptions.

Do not add passwords, activation proofs/links, PINs, birth dates, government IDs, medical details, home addresses, bank/tax data or unrestricted notes. Employees choose passwords themselves. Keep private entry progress outside this header-only template, using only necessary identifiers; evidence shared in this pack should be sanitized counts/references. Apply the intake's agreed retention/deletion review.

**Source facts:** `JoseK0514/NEVORA` at `8e9073974b52053e557382ec5199dbce9d5aa32c`; `src/components/company-access/new-employee-form.tsx`, `src/components/company-access/commands.ts`, `src/components/employee-scheduling-fields.tsx`, `src/lib/company-access/employee-profile.server.ts`, `src/lib/phone.ts`, `src/components/company-access/employee-invitation-panel.tsx`, `src/lib/auth/invitations/{service,delivery}.server.ts`. Worksheet formatting, private review and manual reconciliation are proposed procedures; current hosted behavior requires [acceptance evidence](../acceptance/LAUNCH-CHECKLIST.md).
