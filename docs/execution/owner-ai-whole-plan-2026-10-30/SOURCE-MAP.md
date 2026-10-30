# Whole-plan source map and constraints

| Responsibility | Source |
| --- | --- |
| Synchronous management facade, cooperative canonical solver and final combined validation | `src/lib/scheduling/generation/planner.ts`: `planWeek`, `planWeekSteps`, `PlannerControls` |
| Cooperative search checkpoints, original facade retained | `generation/search.ts`: `boundedSearch`, `boundedSearchSteps` |
| Explicit day review/published review scope; unchanged default weekly scope | `generation/scope.ts`: `GenerationReviewScope`, `generationDates`, `selectGenerationScope` |
| Day measurement with full-week configured reservation identities | `generation/demand.ts`: `deriveGenerationDemand` |
| Existing eligibility, capacity and exclusions, reused without policy change | `validate-shift.ts`, `generation/{periods,reservations}.ts`, `generation-claims.ts` |
| Shared pure projection of one conservative scheduling source | `src/lib/data/schedule-generation-snapshot.ts`: `mapGenerationSource`; original read functions retained |
| Canonical source SQL/table inventory | `src/lib/data/generation-guards.ts`: `generationSourceSql`, `generationSourceTables`; writer guards unchanged |
| Bounded source read, cooperative runtime, two alternative projections | `src/lib/owner-advisor/coverage-plan.server.ts`: `readCoveragePlans`, `compareCoveragePlans` |
| Public source-owned evidence | `coverage-plan-contracts.ts`; `workflow-contracts.ts`: `coveragePlans` |
| Strict read-only command/tool and original guarded orchestration | `contracts.ts`, `tools.server.ts`, `service.server.ts`: `coverage_plan {date}` and `inspect` |
| Mandatory coverage-task evidence and model read-tool integration | `loop.server.ts`: `investigate`; structured plans are copied only from tool results |
| Existing-style compare control and results | `src/components/owner-advisor/{workflows,coverage-plans}.tsx` |
| Strict shape, scope, overlap/completion and output checks | `public-coverage-plans.ts`, `public-response.ts`; original controller/lifecycle retained |
| Canonical unit / real SQL / actual app regression cases | `generation/coverage-review.test.ts`, `owner-advisor/coverage-plan*.test.ts`, `coverage-plan.integration.ts`, component `coverage-plans.test.tsx`, `src/test/integration/owner-advisor-coverage-plan-browser.integration.ts` |
| Provenanced management fixture correction only | `generation-provenance.integration.ts`, `schedule-generation.integration.ts`; pre-register drains, yielding actual-block observation, permanent200ms case |

Paths abbreviated after the first directory refer to that same subsystem. No business executor is exposed by this feature. In particular, `generateWeekDraft`, shift creation/publication, notifications and payroll writers are not model tools or invoked by day-plan review.

## Actual bounds

- Source: at most80employees,20locations,80positions,2500raw shifts,200coverage windows,400position requirements,5000rows for any other source table,16000rows total,2000000serialized JavaScript string units before projection. SQL counts are bounded before constructing the conservative source; oversize declines the whole review. Mapped employee/location/position identifiers are at most128characters. Human names are projected to120characters.
- Each solve:64nodes,2000evaluations,128cumulative periods,12hypothetical additions. Up to2distinct allocation sets. Per-search soft compute stop2250ms within a shared5000ms search window. Checkpoints yield the event loop after a measured slice reaches4ms; this is not preemption or a4ms maximum. Final validation still runs for accepted additions after search stops. Cancellation discards private output. Tool deadline20s and inherited service/investigation limits remain.
- Output:40000serialized JavaScript string units, complete allocation sets, at most8remaining-block details with4position details each,20diagnostic categories per alternative, unique location setup categories, and retained omission totals. Final metadata is included before bounding. No completed-business, optimum, financial, confirmed-availability or background-monitoring assertion follows from these bounds.
- Scope: one explicit date across ready active locations. Published locations can receive hypothetical additions for review; archived targets stay excluded. All original assignments and the full dated ledger remain fixed. Whole-week configured need keys remain intact even when adjacent daily periods form one reserved need.

Runtime and evidence paths are indexed separately. Raw source rows, phones, rule-profile objects, generated claims and execution/authorization tokens are not serialized into plan cards. Exact source fingerprints are provenance only.
