# Fuel Scheduler — Product Architecture

## Product focus

Fuel Scheduler is an employee scheduling system for two Fuel Coffee Drive locations. The first release stays focused on scheduling and the workflows that directly affect it.

## Employee record

Required:
- Employee ID
- First name
- Last name
- Phone number
- Role: Owner, Manager, Lead, Employee

Optional:
- Email

Scheduling attributes:
- Primary location
- Eligible locations
- Active/inactive status

Passwords and sessions are intentionally stored separately from the employee profile.

## Core workflows

1. Employee availability feeds the scheduling rules engine.
2. Approved time-off requests block conflicting shifts.
3. Each location has its own weekly draft/published schedule.
4. Cross-location conflict checks still operate globally by employee.
5. The validator checks location eligibility, availability, approved leave, overlapping shifts, and weekly hours.
6. Employees can offer a shift for coverage or propose a direct swap.
7. Another employee must meet the scheduling criteria.
8. Shift ownership does not change until manager approval.

## Authentication

- Employee ID + password.
- Passwords are hashed with Node.js scrypt and a random salt.
- Browser sessions use random opaque tokens.
- Only a SHA-256 hash of the session token is stored in PostgreSQL.
- Session cookies are HTTP-only and use SameSite=Lax.
- Authentication credentials are not part of the employee profile table.

## Primary routes

- /login
- /app
- /app/schedule
- /app/employees
- /app/employees/new
- /app/availability
- /app/requests
- /app/exchange
- /app/settings

## Roles

### Owner
Full access across both locations, including owner settings.

### Manager
Schedule management, employee management, requests, approvals, and publishing.

### Lead
Employee capabilities plus selected operational permissions. Approval authority is intentionally not hard-coded yet.

### Employee
Own schedule, own availability, time-off requests, offer shifts, claim eligible open shifts, and propose/accept swaps.

## PostgreSQL model

The initial migration creates:
- locations
- employees
- employee_location_eligibility
- employee_credentials
- employee_sessions
- availability_windows
- availability_exceptions
- time_off_requests
- schedules
- shifts
- shift_exchanges
- notifications

Schedules are unique per location and week, allowing one Fuel location to remain in draft while the other is already published.

## Branch workflow

- development: active implementation and validation
- main: stable, production-ready changes only

Changes are validated on development before promotion to main.
