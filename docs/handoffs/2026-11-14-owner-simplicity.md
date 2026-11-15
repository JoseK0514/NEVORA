# NEVORA Owner simplicity — backend and Claude handoff

Date: November 14, 2026. Owner: Codex backend; Claude UI.
Source: development base `af62e26bc886a6c77a7039c0313fb8243e51b40f`, importer `d4e6a333e`, clarity `860186464`.

Development is Jose's primary operating/acceptance line, held to production standards. This delivery does not activate signup, modify main/production, change provider credentials, send real invitations or authorize live charges. No new schema, dependency, queue or service. Work was isolated in the detached `nevora-owner-simplicity-20261114` worktree. Other chats were inspected read-only, without messages or interruption.

## Bounded finish line

1. Review and import a roster using the existing employee model.
2. Keep missing data and scheduled pay dates truthful.
3. Connect the existing setup/invitation/daily flows in Claude's UI.
4. Verify the combined UI/backend with one fictional 30-staff company.

The broader 13-item wishlist stays in the backlog. This is not a dashboard redesign or a new automation platform.

## Import API contract (schemaVersion 1)

These routes belong to the **current company's portal origin**, using its existing authenticated Owner session. They are not anonymous APIs on the marketing website. Send `Content-Type: application/json`, `Origin: <same portal origin>` and the existing session cookie. Cross-origin requests, query strings and cross-site fetches are refused. Responses are private/no-store; do not log roster text, names, emails or full request bodies.

### 1. Preview: POST /api/onboarding/roster/preview

```json
{
  "schemaVersion": 1,
  "format": "csv",
  "text": "id,firstName,lastName,phone,email\nE-001,Ana,Pérez,7875550103,ana@example.invalid",
  "defaults": {
    "primaryLocationId": "<actual active company location ID>",
    "eligibleLocationIds": [],
    "positionIds": []
  }
}
```

`format` is `csv` or `tsv` (pasted spreadsheet cells). `defaults` is optional, but every person must have a valid primary location. CSV/TSV may supply `primaryLocationId`, `eligibleLocationIds` and `positionIds`; multi-value IDs use semicolons. Defaults come from the current setup configuration; never invent catalogue IDs or match ambiguous display names automatically.

Supported headers: `id`/`employeeId`/`id empleado`; `firstName`/`nombre`; `lastName`/`apellido`; `phone`/`teléfono`; `email`/`correo`; `role`/`rol de acceso`; and the three catalogue ID columns above. Case, spaces, underscores, hyphens and accents in headers are normalized. Unknown columns are returned in `ignoredColumns` for explicit review. Names keep their accents. IDs become uppercase. Phone numbers follow the existing single-person format (`787-555-0103`); email is optional. No new phone/email policy.

Success: HTTP 200, including an invalid review with row errors:

```json
{
  "state": "ready",
  "schemaVersion": 1,
  "expectedVersion": "<current setup version>",
  "valid": true,
  "ignoredColumns": [],
  "rows": [
    {
      "rowNumber": 2,
      "values": {"id":"E-001","firstName":"Ana","lastName":"Pérez","phone":"7875550103","email":"ana@example.invalid"},
      "person": {"employee":{"id":"E-001","firstName":"Ana","lastName":"Pérez","phone":"787-555-0103","email":"ana@example.invalid","role":"EMPLOYEE","primaryLocationId":"<location ID>","eligibleLocationIds":["<location ID>"],"positionIds":[]}},
      "fieldErrors": []
    }
  ]
}
```

`rowNumber` is the logical spreadsheet/CSV record number including its header. `valid` means row/current-catalogue checks passed; it is not a reservation of capacity. Commit rechecks capacity, authority and catalogues. Preview writes nothing and is not stored. Block confirmation while `valid=false`; show every row error and ignored column. Syntactically invalid rows have `person:null`; catalogue/duplicate errors may accompany a populated person, so do not infer validity from `person` alone.

Required columns: ID, first name, last name, phone. Email is optional. Role defaults to EMPLOYEE. OWNER cannot be imported. MANAGER requires an explicit Owner-chosen `defaults.initialManagerScope`, either `{"mode":"COMPANY","locationIds":[]}` or `{"mode":"LOCATIONS","locationIds":["<active location ID>"]}`. Scope is applied only to Manager rows; position/job title never grants management access. LEAD retains its existing policy and is not a Manager.

Limits: 50 non-empty rows, 20 columns, 65,536 UTF-8 bytes of raw table text. The existing company's employee limit still applies (currently 15 or 30 non-Owner active staff). The parser ceiling is not an increased plan allowance. Both request bodies have a 131,072-byte HTTP limit.

### 2. Confirm: POST /api/onboarding/roster

Take only reviewed, valid `rows[].person` into `payload.people`:

```json
{
  "schemaVersion": 1,
  "operationId": "<one new UUID retained across retries>",
  "expectedVersion": "<version returned by preview>",
  "payload": {"people": ["<replace with reviewed person objects above>"]}
}
```

The array contains person **objects**, not strings. There is no file upload, automatic merge/update or invitation side effect. All profiles, eligibility, positions, explicit Manager scopes and canonical receipts commit in one transaction or none. No passwords are created.

Saved response: HTTP 200 `{state:"saved", receipt, snapshot, createdEmployeeIds:[...]}`. `receipt` and `snapshot` use the existing onboarding types in `src/lib/onboarding/contracts.ts` and `setup.ts`; refresh from the returned snapshot rather than calculating a new version. All 30 creations advance the shared setup version once.

Handle the standard result states:

- `invalid` / HTTP 400: `fieldErrors:[{field,code}]`. Parser/preview codes include REQUIRED_COLUMNS, MALFORMED_TABLE, DUPLICATE_COLUMNS, TABLE_TOO_LARGE, ROW_COUNT, REQUIRED, INVALID_TEXT, INVALID_PHONE, INVALID_EMAIL, DUPLICATE_ID, DUPLICATE_EMAIL, ID_IN_USE, EMAIL_IN_USE, OWNER_NOT_IMPORTABLE, INVALID_ROLE, MANAGER_SCOPE_REQUIRED, LOCATION_REQUIRED, INVALID_LOCATIONS, INVALID_POSITIONS, LOCATION_UNAVAILABLE, POSITION_UNAVAILABLE and COLUMN_COUNT. Commit can return INVALID_ROSTER, CANONICAL_VALIDATION_FAILED (indexed `people.<i>.<field>`), ID_OR_EMAIL_IN_USE, EMPLOYEE_LIMIT or CATALOGUE_CHANGED. Show localized field/row text; retain the Owner's input.
- `conflict` / HTTP 409: `version_changed` means reload/re-preview before a new confirmed command. `changed_replay` means that operation ID was already used with different input; never silently replace its body.
- `outcome_unknown` / HTTP 202: keep the same command and operation ID; retry that exact body to recover the original result. Never announce failure or submit with a fresh ID while outcome is uncertain.
- Authentication failure is HTTP 401; origin/request admission failure HTTP 403; method 405; body size 413; media type 415. Unavailable services return HTTP 503 with sanitized reason codes. Do not turn unavailable/unknown states into empty data or success.

Identical replay recovers one original import even if the initial commit response was lost. A changed replay conflicts. Two tabs using one version cannot both commit. Every commit revalidates a live Owner and the routed company; cross-company/revoked proofs are refused. Plan capacity and location/position guards remain authoritative inside the transaction. Request-local preflight sharing reduces repeated network reads without removing those guards.

### 3. Invitations remain separate

After profiles save, show the resulting people for an explicit invitation review. Use the existing `POST /api/onboarding/invitation-batches` contract and `GET /api/onboarding/invitation-batches/<operationId>` from the current app. Targets bind `employeeId`, `expectedEmployeeVersion` and `expectedInvitationRevision` from refreshed setup state. The existing batch processes five prepared targets per POST; continue with the **same original command** as appropriate. GET reports/reconciles status and does not send. Do not describe provider acceptance as inbox delivery. Never automatically retry unknown sends. Missing email remains uninvitable, not a failed profile import.

## Data clarity and Claude's remaining UI work

- The employees directory now shows its existing unavailable state when its positions source fails. A real empty catalogue can still show the access role; source failure can no longer masquerade as no positions or normal search results.
- A calendar-derived pay line now says **Scheduled payday**, never **Paid**. It is a schedule, not bank-payment evidence. No payroll amount/calculation/access policy changed.
- Keep three populations distinct: active people includes Owners/Managers; availability submissions cover eligible EMPLOYEE/LEAD people; plan capacity counts active non-Owners. Use clear labels/help on existing screens; do not change counting rules to force totals to agree. Relevant producers: `data/availability-submissions.ts`, scheduling availability eligibility, `0054_onboarding_commerce_binding.sql`.
- Reports' recorded time includes breaks and is before payroll deductions. Keep the existing definitions and make a concise qualifier visible beside the figure. Missing source data stays unavailable; a genuine zero is allowed only when its source succeeded. Show period, timezone, unit and scope where needed to interpret a number.
- Full application locale selection is still Claude UI work: several consumers explicitly select `.en` and `en-US`. Use existing language preferences for labels/date/number formatting; do not introduce a second locale system. Maintain the same meaning and error recovery in EN/ES.
- Build one roster workflow inside existing Owner setup/People: choose defaults → paste/upload locally → review rows/errors → confirm profiles → separately review/send invitations. Reuse existing setup state and section readiness. No new daily-dashboard backend is needed for this bounded release.
- Existing Owner Rondo remains an adviser with sources and reviewed actions. This delivery adds no model/provider or autonomous publishing. Keep measured figures, date ranges, coverage and uncertainty clear in its UI.

## Evidence and remaining release gates

Local synthetic evidence (no customer data or real mail): parser and page regression tests; owned PostgreSQL people suite including 30-staff import, scoped Manager, 30 local invitation acceptances, capacity rejection, replay/lost response, rollback, concurrent tabs and workplace isolation. Exact final totals and review verdict are appended below once complete.

This is backend/source acceptance. Claude must implement and browser-test the actual import UI on desktop/mobile, keyboard/focus, EN/ES and all error/loading/recovery states. Hosted end-to-end delivery, actual inbox receipt and live model quality are separate gates and are not asserted by local test doubles. No additional AI charges were incurred. Promote the exact integrated release to main/production only with Jose's explicit approval.

### Local verification receipt

- Owned PostgreSQL: people **17/17**, setup **11/11**, invitations **14/14**, journey **4/4**. Each runner started only its own loopback cluster and removed it afterward. Invitation delivery used a stub or owned loopback SMTP; no external inbox was contacted.
- Rondo: **25 files, 258/258 offline tests**. No provider authentication, live Spanish answer or paid-model quality claim.
- `npm run typecheck`, `npm run lint`, `npm run build`: exit 0. `check:development-sources`: 73 classified sources, three active branches, pass. Historical inspection custody: 409 files/50 reports/310 shots verified, not present-day audit acceptance.
- Initial complete `npm test -- --maxWorkers=2`: 12,975 passed, 936 skipped, one failed (stale source-qualified guide publication). The skipped tests are not claimed as coverage; the owned suites above provide the relevant database execution. Guide regeneration and final complete run are required before integration.
- No changes to main, hosting, real data, provider access, paid services or billing. Final code-review and protected CI/development integration receipts follow separately.

### Review disposition

A fresh read-only reviewer inspected `af62e26bc..860186464` and ran 20 focused tests. Its important finding—case-sensitive email preview against the database's `lower(email)` uniqueness—was reproduced in both parser and real owned PostgreSQL tests, then corrected in file/command/existing-company comparisons. Email spelling is retained. No second review substitutes for the regression rerun.

Deferred minor: an unsupported `constructor` header is resolved through the alias object's inherited property and can miss its ignored-column warning. It does not become a profile field or execute code; use the documented columns/template. This is a follow-up parser warning defect, not a changed access or plan policy.

Implementation decisions: retain canonical phone formatting; reuse existing atomic receipts with no schema/service; share only request-local preflight while keeping transaction guards; preserve distinct headcounts; leave browser/localization integration to Claude and hosted inbox/live-model acceptance as separate gates. These avoid extra infrastructure and unproved launch claims. Final validation/CI/development state will be recorded separately in `2026-11-14-owner-simplicity-validation.md`; this interface document remains immutable once the source-qualified guides are generated.
