# NEVORA Workforce — Product Architecture

NEVORA Workforce is the workforce operations module owned by VELANI LLC. Fuel Coffee Drive is a configured customer/workspace. Workspace timezone, locations, eligibility, operational positions and scheduling policy are stored configuration; the product is not limited to two locations.

## Current product

The Next.js application separates server actions, domain rules, data access and UI. Employee ID/password authentication uses scrypt hashes and opaque sessions whose token hashes are stored in PostgreSQL. Server mutations enforce current active actor, workspace, role and applicable location/position authority; visibility in the UI does not grant authority. Owner and Manager perform authorized operational management. Employee and Lead use self-service workflows; an operational lead designation is separate from an access role.

The portal connects availability and approved leave to location schedules, validates eligibility/qualifications and conflicts, generates reviewable schedule proposals, publishes schedule revisions, and supports guarded shift offers, coverage and swaps. Schedule generation follows configured business time, positions and overnight boundaries. Calendar and Monday-week inputs are validated before date arithmetic. Archived templates cannot be applied; an active empty template remains distinguishable from a missing template.

Time Off submissions use a stable request ID with actor/payload-bound replay. Request changes and notification intents commit together. Delivery is a separate controlled outbox/provider workflow; a recorded intent does not establish external delivery.

Persisted Clocker operations cover device setup/authorization, employee PINs, punches and breaks. The manager monitor uses recorded presence; published assignments alone do not establish clocked-in status. Employee Home and My Time use recorded punch data and distinguish unavailable data from an empty result. Physical devices, hosted database transport and external providers require their own release evidence.

## Architecture references

- [Workspace, locations, positions and policy](architecture/nevora-workspace-foundation.md)
- [Automatic scheduling](architecture/nevora-auto-scheduler.md)
- [Scheduling rules and customer configuration](architecture/fuel-scheduling-rules.md)
- [Clocker persistence foundation](architecture/time-clock.md)
- [Clocker punch service and canonical Phase C migrations](architecture/clocker-punch-service.md)
- [Notification activation boundaries](architecture/fuel-phase-3-activation.md)
- [Automation authority and release controls](architecture/fuel-automation-charter.md)
- [NEVORA UI contract](ui/fuel-ui-contract.md)

Migrations `0001`–`0010` retain their established lineage. Canonical Phase C is `0011`–`0015`; the migration integrity tests verify historical source bytes and final PostgreSQL constraints. Old `fuel` paths, cookies and PWA names remain compatibility identifiers, while product identity is NEVORA.

## Primary surfaces

The portal provides Home, Schedule, My Time, Availability, Time Off, Shift Changes, employees/profile lifecycle, schedule templates/rules, workspace/location/position/policy settings and Clocker administration. `/clocker/[location]` is the device surface. Role-specific navigation reflects server authorization, including Owner-only workspace settings.

## Integration and release

`development` is the single permanent integration branch. Temporary phase and PR source branches preserve exact inputs. `main` is production-only; integration, successful CI, a Preview build and local tests do not authorize production. Release requires the frozen destination SHA, independent QA/UI and executive findings closure, hosted/security gates and Jose's production approval. NEV-AUD-002 and final Codex review follow verified development consolidation.

Historical Fuel specifications and handoffs remain source records; their former layouts, scope and acceptance statements do not replace the current architecture or release evidence. The [consolidation ledger](handoffs/2026-10-05-nevora-consolidation.md) records exact source identities and dispositions.
