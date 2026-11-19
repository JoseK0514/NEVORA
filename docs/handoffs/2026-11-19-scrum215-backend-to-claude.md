# SCRUM-215 backend handoff to Claude

Backend commit `a5a3d2b1659733774cdf394759d0f1ed383bf9ab` is based on Development `e0e8efe9ce1aeee8a2961cd92684ff1a38f95550`. The integrator can cherry-pick the backend commit for the joined candidate. Claude owns the Manager’s per-location controls and the bilingual refusal copy. The existing integrator owns combined UI and backend acceptance on Development. The exact accepted build can be promoted to main and production with Jose’s approval.

## Schedule publication

- Open `/app/schedule/publish?week=<YYYY-MM-DD>` using the existing Monday week key. For a Manager, `readManagerSchedulePublish` returns `data.publishLocationIds` and `data.locations` with `id`, `name`, `shortName`, `status`, and `shiftCount`. Both lists are restricted to active locations in operational scope with a current `PUBLISH_SCHEDULE` grant. This applies to company-wide Managers as well. The page returns `access_denied` when the Manager has zero such locations or requests warning details for an ungranted location.
- Bind each Manager draft button to the existing `publishScheduleAction` from `src/app/app/schedule/actions.ts`. Submit `weekStart`, exactly one `locationId`, and `from=publish`. The origin flag selects the warning return route. The server resolves the actor and checks the grant again in the same transaction that publishes, captures the revision, and queues notification intents.
- A warning redirects to `/app/schedule/publish?week=<week>&review=1&location=<locationId>#publish-review`. The scoped read puts that draft’s warning summary in `data.review`. The matching confirmation form resubmits the same location and week with `confirmWarnings=yes`.
- Success redirects to `/app/schedule?week=<week>&location=<locationId>&published=<locationId>`. The existing errors include `ACCESS_DENIED` for lost or insufficient authority, `INVALID_PUBLISH` for multiple location fields, and `NO_SCHEDULE` when there is no schedule to publish.
- Wire the location-scoped Schedule entry to the same publish page when adding the Manager controls. The current locked view uses the shared company-access copy.
- `publishDraftsAction` backs the Owner’s existing bulk form. The Owner still sees all locations, the build controls, and the held-change workflow. Moves that publish changes across locations still require an Owner. `readSchedulePendingChanges().data.canPublish` continues to signal eligibility for the whole-week held-change form.

## Refusal contract

| Surface | Response | Meaning |
| --- | --- | --- |
| `GET /api/manager/time-corrections` | HTTP 200 with `{state:"ready",requests:[],...}` | The Manager can review time exceptions and has an empty scoped queue. |
| `GET` or `POST /api/manager/time-corrections` | HTTP 403 with `{state:"unavailable",reason:"permission_required"}` | The Manager has valid operational access and zero current `REVIEW_TIME_EXCEPTION` grants in that scope. The responses carry `X-Nevora-Failure: access_denied`. The typed client exposes the body reason on both paths. |
| `POST /api/manager/time-corrections` | HTTP 409 with `{state:"blocked",reason:"self_review"}` | The request concerns the reviewer or was submitted by the reviewer on someone else’s behalf. The command has to pass its location check before this reason is returned. |
| `reviewTimeOffAction` | `/app/requests?tab=team&error=permission_required` | The Manager has zero current `APPROVE_LEAVE` grants in scope. |
| `reviewTimeOffAction` | `/app/requests?tab=team&error=self_review` | The reviewer is the employee who requested leave. |
| `reviewTimeOffAction` | `/app/requests?tab=team&error=leave_scope` | At least one location on the leave footprint is currently granted and another is outside the grants. An independent reviewer with complete coverage is required. |

The leave refusal redirects carry only the reason. Unknown or wholly out-of-scope request IDs receive the same generic refusal for each review flow. A legacy leave request without a location footprint remains Owner-only. The correction API retains the existing authority binding, receipt and conflict shapes. On `outcome_unknown`, retry the same operation ID and body. Existing leave decision and cancellation retry rules still apply.

## Verification and ownership

Before changing the code, the scoped Manager publish page rendered the unavailable view, the correction queue returned generic `access_denied`, and leave decisions only exposed generic authorization errors. The repository tests cover both operational Manager scopes, the Owner bulk form, Calle Loíza publication with Condado’s schedule and shift rows unchanged, direct foreign targets, and revocation immediately before the publication batch. Review tests cover the empty queue, typed reasons, an inaccessible request versus an unknown ID, independent review, and replay of the original receipt.

- 220 focused tests and 126 owned PostgreSQL integration tests passed on the backend commit. TypeScript and changed-file lint passed.
- The full test run reported 15,831 passed and 1,000 skipped. Its sole failure was `manual-publication.test.ts` because the checked-in guide bundle has the previous application hash.
- Local Chromium verified the 390 px Manager read, the denied Condado warning request, and the correction API’s `permission_required` response. At 1440 px the Owner saw both drafts and the bulk control. Both used fictional accounts in the disposable application.

Engineering reused the existing publication transaction. Security checks current grants before disclosure and in the write and keeps foreign request IDs opaque. The existing database and environment contracts apply. Rebuild the web manuals from the joined source during Development acceptance. The publication test checks the manuals against the application content hash.
