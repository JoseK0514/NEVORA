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

## Core workflows

1. Employee availability feeds the scheduling rules engine.
2. Approved time-off requests block conflicting shifts.
3. Managers build weekly schedules in draft.
4. The validator checks location eligibility, availability, approved leave, and overlapping shifts.
5. Managers publish a completed schedule.
6. Employees can offer a shift for coverage or propose a direct swap.
7. Another employee must meet the scheduling criteria.
8. Shift ownership does not change until manager approval.

## Primary routes

- /login
- /app
- /app/schedule
- /app/employees
- /app/availability
- /app/requests
- /app/exchange
- /app/settings

Employee-specific views will reuse the same domain model and responsive shell rather than creating a separate application.

## Roles

### Owner
Full access across locations.

### Manager
Schedule management, employee management, requests, approvals, and publishing. Exact scope can later be limited by location.

### Lead
Employee capabilities plus selected operational permissions. Approval authority is intentionally not hard-coded yet.

### Employee
Own schedule, own availability, time-off requests, offer shifts, claim eligible open shifts, and propose/accept swaps.

## Data model direction

The application will eventually persist:
- locations
- employees
- employee_location_eligibility
- availability_windows
- time_off_requests
- schedule_weeks
- shifts
- shift_exchanges
- notifications

Database and authentication providers are intentionally not coupled to the first UI commit. Neon/PostgreSQL remains the preferred database direction, but schema migrations and auth should be introduced as their own reviewed foundation step.

## Branch workflow

- development: active implementation and validation
- main: stable, production-ready changes only

Changes should be validated on development before promotion to main.
