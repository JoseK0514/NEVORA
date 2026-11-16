# Management restrictions, employee preferences and weekend rotation

Jose authorized backend implementation in the current chat after specifying the model below. This supersedes the availability portions of the earlier research proposal; extra-shift awards, premium-pay calculations, UI, production and provider activation are excluded. Development is the acceptance line. Baseline: `b5085edb33d1bccc440588f950e728566c8a79ac`.

## Approved product behavior

- Owner and authorized Managers record employees' agreed scheduling restrictions. Employees submit preferences or request an agreement change. A pending request changes no eligibility or assignment.
- Employee-entered normal/weekly hours and dated availability become preferences after management explicitly establishes an agreement. Preferences do not guarantee hours or time off.
- Agreed restrictions, approved leave, qualifications, eligibility, overlaps and existing maximum-hour/operational rules stay firm in every assignment path.
- Coverage is evaluated jointly across configured locations, time windows, positions and Lead requirements. No double counting across locations. The system returns an honest partial/invalid/budget-limited result with dated gaps when it cannot fill demand.
- Among otherwise feasible options, recent published scheduling history informs fair weekend allocation before accommodating individual preferences. Management reviews and publishes drafts.
- Existing published schedules are preserved. No existing employee preference is relabeled as a contract.

## Architecture and bounded defaults

Extend the existing `employee_scheduling_settings` row with a nullable versioned `management_restrictions` JSON document. This reuses its existing transaction locks, coherent generation source, application permissions and isolated-worker read/lock capabilities. The document contains append-only approved versions and employee requests with immutable decision receipts. No payroll/employment contract is inferred from this operational record.

The domain validates the entire document and all commands; malformed configured data fails closed. Each approved version has its ID, Monday effective week, recurring unavailable intervals, author, timestamp and reason. Empty unavailable intervals explicitly mean management confirmed no recurring restriction. `NULL` means unconfirmed legacy behavior, not unrestricted availability. Confirmation is per employee, never an automatic bulk conversion.

Commands carry an operation UUID and expected document revision. Exact replay returns the existing receipt after fresh authorization; reusing an ID with different contents conflicts. Mutations recheck live session, Company Access, target footprint and document revision after locks. A location-scoped Manager needs authority for the employee's complete location footprint; only Owner may manage an Owner's agreement. Employee commands are own-only and can only request a change.

Versions are immutable and appended chronologically. As the initial safe cutover rule, a new version must start in an open current/future week after every already published/archived or deadline-locked week it would affect, and after the last approved version. A later published week therefore prevents an earlier effective cutover; the API explains the required later week. This conservative choice preserves all closed weeks without rewriting publication custody or introducing a second historical snapshot protocol. It does not prohibit preferences changing because they never rewrite assignments or approved versions.

The shared day resolver produces firm eligibility windows separately from preferred windows. Before an approved version takes effect, existing legacy rules are retained. Afterward, firm windows are the complement of approved unavailable intervals; normal/weekly/dated employee inputs only affect preference fit. Overnight assignments evaluate both business dates. Period enumeration includes both restriction and preference boundaries so partial feasible/preferred periods remain representable.

Weekend default (implementation choice, not statutory policy): Saturday/Sunday in the workspace's existing business-date model; eight completed weeks of retained published/archived scheduling evidence. Deduplicate assignments, include overnight intersections, exclude released callouts and relevant approved leave, and do not penalize agreed weekend restrictions. Missing employee/history evidence receives a neutral comparison rather than an invented weekend off. Prefer an eligible person who recently had more weekends off when others have repeatedly worked. Continue balancing existing weekly-hour targets and caps. The result describes scheduled history, never claims actual attendance or payroll hours.

Rondo/Advisor and exchanges inherit the same source facts and validation. Preferences never become a second eligibility engine, and LLM wording never supplies authority. Existing hard rules cannot be bypassed to manufacture coverage.

## Backend/UI boundary

Provide protected manager and employee JSON endpoints for current restrictions, version history, pending requests, commands and receipts. Use existing same-origin, actor/view-lifetime, current-session and private no-store protections. Return typed invalid/denied/conflict/locked/unavailable states. No external notification sends are authorized.

Claude owns labels, profile/settings sections, request/review screens and the combined user journey. Backend-only verification is not full UI or hosted acceptance. The feature remains unconfirmed for existing employees until management uses the reviewed UI/API contract; no deployment/database migration is automatically authorized.

## Evidence and risks

Required: RED/GREEN domain and assignment regressions; PostgreSQL persistence, authority, replay, concurrent edit/revocation and closed-week tests; real planner cross-location coverage/weekend fixtures; full unit suite, relevant SQL cohorts, typecheck, lint, build and fresh independent code review. Keep failures and skipped cohorts visible.

0064 is reserved by the separate active Rondo company-knowledge work. This feature uses 0065; migration registry/fixture and Advisor consumer combination require the single development integrator. No shared ref is changed before ownership is resolved. Rollback closes feature writes/activation and restores compatible code while retaining approved history; never erase policy records or reset publication history.
