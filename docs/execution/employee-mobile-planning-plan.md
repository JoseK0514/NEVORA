# Employee mobile: time off and availability

Scope: extend the accepted Employee/Lead teal system to own full/partial time-off requests, history/details and pending withdrawal, plus usual/weekly availability, deadlines, multiple intervals, explicit all-week unavailability and mounted draft recovery. Desktop and management retain their existing surfaces. No new policy, role, location requirement, production data or deployment.

Source: accepted application 351e33a1 and documentation HEAD 4e622abd. Clean bounded continuation branch. Fresh origin/development 84c3fc35 differs from previous dfdcefa0 only in source-inventory/policy documentation/scripts; no relevant application changes. Reconciliation remains mandatory before assembly.

## Task 1: contracts and protected owners
Write failing tests for strict own-view/command projection, dates/intervals and immutable operation recovery. Implement bounded protected planning reads and structured actions over existing request/availability owners. Serialize availability baselines under existing locks, preserve all intervals and override semantics, and check time-off module admission atomically. Reads/writes use actual session authority without requiring a location for these own-account capabilities.

## Task 2: mobile task surfaces
Read the craft floor immediately before UI edits. Reuse approved header/body/notice/list/buttons and regular Phosphor icons. Add responsive full-page time-off request/list/detail/withdrawal and availability usual/week/day editors. Native labelled controls, consistent insets/targets, neutral notices, clear canonical status. Retain draft and immutable uncertain operations in memory only; release private facts on pause. New account lifetime resets entries. Never silently rebind an uncertain request or stale availability draft.

## Task 3: verification and acceptance
Add real SQL permission/concurrency/deadline/idempotency tests and real three-engine mobile/browser scenarios for both roles, light/dark, reflow, keyboard, unknown outcomes and desktop preservation. Use owned isolated fictional database/Next runtimes and freeze committed app input during runs. Run relevant existing regressions, lint and typecheck. One fresh whole-change code review plus independent UI and QA acceptance. Reviewers own findings/closure. Archive exact source and evidence in the handoff and update Phase2 status. No push/merge/deploy.

Interfaces: Task1 planning DTO/commands/operation -> Task2 UI; Task1 transaction admission -> existing owner lock order; Tasks1/2 -> Task3 real fixture/browser contracts. Current authority and immutable original intent are shared constraints. No conflicting interface found.
