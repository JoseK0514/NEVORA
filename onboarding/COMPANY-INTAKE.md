# Company intake worksheet

**Blank template · NOT_STARTED.** Onboarding Lead completes a private copy with Customer Owner. Keep real contacts and employee details outside this repository. Decisions here do not apply settings or approve launch.

## Company and structure

| Question | Customer response |
| --- | --- |
| Company display name / business name if different | ___ |
| Customer Owner name / business email / business phone | ___ |
| Day-to-day Customer Manager / contact | ___ |
| NEVORA Onboarding Lead / Operations Lead / Engineering Lead | ___ |
| Number of employees to record / number needing login initially | ___ / ___ |
| Number of separate client businesses served or managed | ___ |
| Are all proposed locations part of this same company? | ___ |
| Do separate businesses need isolated records, independent Owners or billing? | ___ |
| Company timezone: exact IANA name / confirmed by | ___ / ___ |

**Structure decision:** ☐ One company with employees/locations: proceed. ☐ Separate businesses or unclear structure: **BLOCKED** pending Jose/Engineering decision. Thirty employees differs from thirty separate business clients. Source supports one company per database.

## Locations and work configuration

Repeat per location. Agree names/keys for roster matching; Engineering confirms application identifiers.

| Location name | Short name | Agreed key | Active at launch? | Staffing/coverage decision owner |
| --- | --- | --- | --- | --- |
| ___ | ___ | ___ | ___ | ___ |

| Configuration question | Response / owner |
| --- | --- |
| Operational positions required and qualification approver | ___ |
| Scheduling week/cycle and first operating period | ___ |
| Coverage, staffing and approval rules needing configuration | ___ |
| Devices/browsers, languages or accessibility needs | ___ |
| Existing records/setup constraints needing Engineering review | ___ |

Do not collect precise home addresses, personal demographics or credentials. Collect location addresses only separately if a confirmed workflow requires them.

## Access and activation decisions

Customer Owner approves application access using least privilege. Position qualifications never grant management permissions. Playbook responsibilities are separate.

| Access decision | Named person(s) / approved scope / reviewer |
| --- | --- |
| Initial Customer Owner and additional Owner need | ___ |
| Manager: Company or named selected locations, explicitly chosen | ___ |
| Lead / Employee cohort counts | ___ |
| Roster preparer / accuracy reviewer | ___ |
| Pilot participants / launch cohort / later cohort counts | ___ |
| Registered-email availability / missing-email resolution owner | ___ |
| Invitation delivery readiness evidence owner | ___ |

Verify Manager scope explicitly. Email is optional for employee records; invitation activation requires a valid registered email. Record resolutions for people needing login without one.

## Workflow and success agreement

Mark **IN_SCOPE**, **DEFERRED** or **NEEDS_REVIEW**. Choices do not enable features or verify hosted availability.

| Workflow/module | Choice | Required task / reviewer / evidence |
| --- | --- | --- |
| Employee records and access | ___ | ___ |
| Scheduling and employee schedule visibility | ___ | ___ |
| Attendance / clock workflow | ___ | ___ |
| Payroll preparation/review | ___ | ___ |
| Other request, including providers/notifications | ___ | ___ |

| Decision or handoff | Fillable record |
| --- | --- |
| Pilot location / period / success criteria | ___ |
| Configuration handoff owner / target-identification evidence | ___ |
| Open decision / impact / owner / needed-by / status | ___ |
| Customer Owner review / date / evidence reference | ___ |
| Next gate / owner / review date | ___ |

Use [roster guidance](ROSTER-GUIDE.md), [launch acceptance](../acceptance/LAUNCH-CHECKLIST.md) and [support procedures](../support-training/SUPPORT-PROCEDURES.md). Acceptance cases start NOT_RUN. Record production authorization separately.

## Secure handling agreement

Customer Owner and Operations agree the private transfer/storage channel, authorized recipients, retention/deletion review date and deletion evidence owner: **___ / ___ / ___ / ___**. Transfer only fields needed for the chosen workflow; retain sanitized evidence references in this pack. Do not email unprotected rosters or place passwords, invitation links/proofs, PINs, government IDs, bank/tax details or database credentials in intake notes. Follow the support procedure if sensitive information is received accidentally.

**Source basis:** `JoseK0514/NEVORA` at `8e9073974b52053e557382ec5199dbce9d5aa32c`; `README.md`, `docs/execution/single-company-20261012.md`, `src/components/company-access/new-employee-form.tsx`, and `src/lib/company-access/employee-profile.server.ts`. Customer answers remain unconfirmed.
