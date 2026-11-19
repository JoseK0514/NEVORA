# Rondo AI backend handoff to Claude

November 18, 2026. Codex owns NEVORA backend and activation under SCRUM-200
and SCRUM-212. Claude owns the Owner and Manager UI. The existing integrator
owns the joined release under SCRUM-83, and the existing dependency owner
owns SCRUM-211. Jose approved the scoped Manager permission for Development
and chose to keep paid calls off. Development is the acceptance release.
Main and production require separate authorization.

## Source and hosted Development

- Local backend and regression checkpoint for Claude: `b9a90386e0458fe051d381f89c781182e82dfa55`.
  The runtime patch and sandbox are in `2e678c00565f3aff283840dea6f315f4a6e1c013`.
- NEVORA Development was fetched at `22107a24272f2347bbb59a3da1f54319632772a5`.
  [CI](https://github.com/JoseK0514/NEVORA/actions/runs/44088417642) and
  [Mobile Access](https://github.com/JoseK0514/NEVORA/actions/runs/44088417268) passed on that exact SHA.
- [NEVORA Vercel project](https://vercel.com/josekarlo-5933s-projects/nevora) is linked
  to `JoseK0514/NEVORA`. The newest listed deployment was the Ready November 10
  collaboration Preview at `572dde7e59f01dc29a7c8c181e3beb927f5026f1`.
  The old Development branch alias answered HTTP 200 on `/login`. A current
  qualified Rondo deployment URL is pending.
- Vercel lists branch-scoped Preview settings for `development` and for the
  collaboration branch. `DATABASE_URL` and `FUEL_PORTAL_ORIGIN` appear on the
  collaboration Preview only. No Rondo flag or provider setting appeared in the
  NEVORA project. The separate
  [Velani public Rondo project](https://vercel.com/josekarlo-5933s-projects/velani-rondo-development)
  lists its own `AI_MODEL`, `AI_API_KEY`, `DAILY_AI_REQUEST_LIMIT`, and
  `AI_BUDGET_AUTHORIZATION_ID`. Only setting names and targets were inspected.
- Hosted activation is held. The latest observed joined candidate
  `e7ed9923396a30a13228f4d2eddfc7fdf4a0f00c` failed the required dependency audit
  and evidence gate. The development source inventory reported branch drift for
  the release owner to reconcile. Git auto-deploy is disabled in `vercel.json`.
  Hosted activation needs the qualified joined SHA, a verified fictional
  Development database binding with current schema and Company Access adoption,
  and authenticated acceptance on the branch-scoped Preview.
  [Failed joined CI](https://github.com/JoseK0514/NEVORA/actions/runs/44159613866)

## What Claude can connect locally

| Screen | Provider-free behavior | Current Owner route and gate |
| --- | --- | --- |
| Owner Rondo AI | Snapshot, private workspace, and unavailable chat state. Prompt submission returns 503 without a provider. | `/app/ai-manager`, GET/POST `/api/owner/advisor`, parent switch |
| Company knowledge | List, edit drafts, review exact versions, publish, archive and delete fictional content. Model retrieval is separate. | `/app/ai-manager/knowledge`, GET/POST `/api/owner/advisor/knowledge`, parent and knowledge switches |
| Owner weekly plan | Compare, review, decline, save exact drafts and recover receipts. This uses the scheduler. | `/app/ai-manager/weekly`, POST `/api/owner/advisor/weekly`, parent and weekly switches |
| Business records | Catalog, stage, exact review/publication, direct finance/sales queries, withdrawal and erasure. UI owns the page. | GET/POST `/api/owner/advisor/business`, parent and imports switches |
| Manager Rondo AI | Location picker, four guided schedule questions and weekly plan summary. Claude owns the page. | GET `/api/manager/advisor`, parent and Manager switches. [Manager contract](2026-11-18-rondo-manager-ui-contract.md) |

Owner routes require a current Company Owner. The APIs use a current same-origin
cookie and private no-store JSON. Send the endpoint's intent header. Owner POSTs
also require matching `Origin` and `Content-Type: application/json`.
Preserve the exact operation ID and body after an uncertain write. Use each
module's original-operation recovery flow and explicit version/review controls.

## Owner API schemas and responses

- **Chat** uses `x-nevora-owner-advisor: 1`. `GET` returns
  `AdvisorSnapshot` with `state:"ready"`, `connection`, private profile,
  history, briefing and the access observation. Optional `?view=lease` is
  lightweight and `?view=detail` includes operational detail. `POST` accepts
  `AdvisorCommand`. Example `{"op":"ask","requestId":"11111111-1111-4111-8111-111111111111","message":"What changed in my schedule?"}`.
  With provider off this returns HTTP 503
  `{"state":"error","code":"unavailable"}`. A configured successful ask returns
  `{state:"answered", answer, authority, observedAt, validForMs}`. The optional
  `x-nevora-owner-advisor-schema: 2` expands answer context. Keep client
  parsing matched to the response version. [Wire types](../../src/lib/owner-advisor/contracts.ts)
- **Knowledge** uses `x-nevora-company-knowledge: 1`. Empty list example
  `{"state":"ready","revision":0,"entries":[]}`. POST supports
  `draft_document`, `draft_profile`, `publish`, `archive`, and `delete`.
  Exact private source read is
  `GET /api/owner/advisor/knowledge/entries/{documentId}/versions/{versionId}`.
  Use normal same-origin navigation for plain text or `Accept: application/json`
  for editor review. [Knowledge contract and exact payloads](2026-11-15-rondo-company-knowledge-ui-contract.md)
- **Weekly** uses `x-nevora-owner-advisor: 1`. Begin with
  `{"op":"compare_week","requestId":"22222222-2222-4222-8222-222222222222","weekStart":"2026-11-30","mode":"FILL_GAPS_ONLY","locationScope":{"kind":"ALL"}}`.
  A successful result carries state, nullable comparison/review/readReceiptId/
  receipt/progress, authority and observation lease. A ready comparison can
  have zero eligible alternatives. Example response excerpt
  `{"state":"ready","comparison":{"state":"ready","weekStart":"2026-11-30"},"review":null,"receipt":null}`.
  Exact apply requires the returned review ID,
  digest, receipt and `acknowledged:true`. [Weekly wire types](../../src/lib/owner-advisor/weekly-contracts.ts) ·
  [Weekly UI and recovery contract](2026-11-16-rondo-weekly-ui-contract.md)
- **Business records** uses `x-nevora-business-evidence: 1`.
  `GET` returns `BusinessApiResult` with `state:"ready"` and a catalog
  containing revisions, timezone, active named locations, sources, versions
  and maps. An empty fictional catalog can have two active locations and
  `sources:[]`, for example `{"state":"ready","catalog":{"activeLocations":[{"id":"loc-1","name":"Northside Main Office"},{"id":"loc-2","name":"Northside West Office"}],"sources":[]}}`
  (selected response fields). POST uses `BusinessCommand`. A missing admitted reporting
  perimeter returns `state:"unavailable"` with a reason such as `MISSING_MAP`.
  The inert exact-version path is
  `GET /api/owner/advisor/business/sources/{sourceId}/versions/{versionId}`.
  Keep money in minor-unit strings and use actual catalog IDs. [Business wire types](../../src/lib/owner-advisor/business/contracts.ts) ·
  [Business UI contract](2026-11-16-rondo-business-evidence-ui-contract.md) ·
  [Contract follow-up](2026-11-17-rondo-business-ui-contract-answers.md)

| UI state | Backend signal and behavior |
| --- | --- |
| Setup required | Weekly per-location `NEEDS_SETUP` or `NO_CONFIGURED_DEMAND`, or a business query missing the required reviewed map. Explain the missing step. A ready empty knowledge catalog is a first-use state. |
| Disabled | Owner chat and Manager routes use 404. Weekly, knowledge and business adapters can return 503 with `code:"disabled"`. Branch before generic 503 handling. Retain supported original-operation recovery. |
| Unavailable | Chat snapshot can be 200 with `connection:"unavailable"`. Source outages may return 503. Weekly and business can also return 200 with unavailable result/reason. Avoid treating either as zero or an empty catalog. |
| Forbidden | 401, 403, or an Owner page 404 from role gating. Clear private results after session/scope loss. Direct the user to sign in again when the session is missing. |
| Usage limit | 429 `daily_limit` is the chat workspace request allowance, resetting at UTC midnight. 429 `limit` in knowledge, business, or weekly can be a module capacity limit. Explain the relevant constraint. |
| Conflict or uncertain outcome | Review current source after 409. Resume through the original operation instead of repeating with a fresh write ID. |

## Local sandbox

From the detached backend checkout, install exact dependencies with `npm ci`.
Use Node 24 and PostgreSQL 17 binaries. The launcher creates a new disposable
loopback cluster, applies the repo's canonical fixture migrations, starts Next
on a free loopback port, and seeds an Owner and a Manager scoped to the first
location. The second location has fictional data for denial testing. There is
no provider binding. The launcher prints the URL and the seeded Monday. Use
`QAOWNER` or `QARONDOMANAGER` and the fixture's existing `TEST_PASSWORD` in
[owned-app-fixture.ts](../../src/test/integration/owned-app-fixture.ts).
Stop with Ctrl-C. Rerun from a clean committed checkpoint after changing UI source,
or integrate in a separate checkout against the running sandbox.

```sh
env -u DATABASE_URL -u FUEL_TEST_DATABASE_URL \
  NEVORA_TEST_PG_BIN="/absolute/path/to/postgresql/bin" \
  node --conditions=react-server --import ./scripts/node-server-context.mjs \
  --import tsx scripts/rondo-local.mts "$(mktemp -d)/rondo"
```

Use the source in
`/Users/josek0514/.codex/worktrees/nevora-rondo-activation-20261118`.
A running server only serves its own loopback origin. Use the same-origin app
session when testing browser integration. The backend runner mirrors the
committed application source and replaces only the local SQL transport plus
Next's generated development type references.

## Verification

- Final Owner and Manager PostgreSQL suite on the local checkpoint passed
  397 cases in 34 files. Manager cases include permitted location, denial
  for an unassigned location and a location in a separate fictional
  database, role and session revocation, in-flight grant revocation, and
  Owner regression coverage. The disposable database was stopped.
- Exact local checkpoint passed Next route type generation, TypeScript and
  lint on touched files. The focused feature/provider unit run passed 64 cases.
- Four authenticated Next browser cases passed for knowledge and business
  records, including access controls, exact publication review and recovery.
  A signed-in Chromium probe exercised Owner chat, knowledge, weekly comparison
  and business catalog independently, plus Manager context, week and answer.
  It observed 503 for an Owner ask, 403 for Manager use of the Owner API or an
  unassigned location, and zero non-loopback browser requests.
- The final sandbox was restarted from the backend checkpoint, checked with
  both actor sessions, and stopped. The owned fixture verified the exact Next
  source mirror and completed teardown.
- Reproduce the SQL checks from the checkout with a PostgreSQL bin path:
  `env -u DATABASE_URL NEVORA_TEST_PG_BIN="/absolute/path/to/postgresql/bin" node scripts/payroll-postgres.mjs vitest.owner-advisor-integration.config.mts`.
  Test logs and sanitized responses are in
  `/Users/josek0514/.codex/visualizations/2026/11/18/01a1ee53-1aab-7081-b259-6fc900ccd8bb/rondo-evidence`.

## Configuration custody and activation order

After the combined release runner clears the required checks and hosting confirms
the branch's fictional database/schema, enable these existing Development
Preview flags for Owner testing, scoped to Git branch `development`:

- `NEVORA_OWNER_ADVISOR_ENABLED`
- `NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED`
- `NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED`
- `NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED`

Keep `NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED` off while the model is off.
Enable `NEVORA_MANAGER_ADVISOR_ENABLED` only on the verified joined source with
the Manager contract. The expected Rondo migration tail is
`0065 → 0064 → 0066 → 0067`; follow the canonical migration order and record the
target and schema receipt. Run authenticated role, route, review, and recovery
checks against fictional data. Rollback is the prior same-environment deployment
and the affected branch-scoped switch. Retain the additive schema and receipts.

The intended historical provider path is direct Anthropic Messages with model
ID `claude-sonnet-5-5`. The source requires that model. The grant cutoff
was November 18 at 00:00 UTC, and the adapter rejects calls after cutoff. Jose chose paid calls off, so there is no
approved current allowance, model activation, or data release. A future separate
approval needs the provider workspace's permitted data and retention, dollar cap,
daily request count and end time. Review the expiry guard and enforce a funded
total cap before enabling. The existing runtime counts workspace-level asks per
UTC day and Anthropic usage logs estimate spend after the request. The daily
counter limits requests. The estimates are for reconciliation. Use the NEVORA Development
Vercel secret store after approval.

| Setting | Status |
| --- | --- |
| `NEVORA_OWNER_ADVISOR_PROVIDER`, `NEVORA_OWNER_ADVISOR_MODEL`, `NEVORA_OWNER_ADVISOR_API_STYLE` | Historical route confirmed in source. Unset in the NEVORA project. |
| `NEVORA_OWNER_ADVISOR_DATA_APPROVED` | Unset. Paid data transmission held. |
| `NEVORA_OWNER_ADVISOR_DAILY_LIMIT` | Unset. Runtime accepts 1–100 daily requests. Jose chose paid calls off. |
| `NEVORA_OWNER_ADVISOR_ANTHROPIC_CREDIT_EXPIRES_AT` | Unset. Historical window closed. |
| `ANTHROPIC_API_KEY` | Unset in the NEVORA project. |
| `NEVORA_OWNER_ADVISOR_REASONING_EFFORT` | Unset. This setting is for the OpenAI-compatible Responses path. |

[Anthropic model IDs](https://platform.claude.com/docs/en/models/overview) ·
[Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) ·
[Anthropic API data handling](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
