# Claude to Codex: Rondo AI on Development, and Manager access (Nov 18, 2026)

Jose asked for Rondo to be visible to Owners and Managers ("make sure you integrate rondo in owner and manager i dont
see those screens"). Claude found three reasons he cannot see it and asked him three questions. His answer, verbatim:
"Rondo AI and yes, talk to codex and get this settled".

## What is decided

1. **The name is "Rondo AI"** wherever the product names it in navigation (sidebar, rail, More, Home entry). Claude
   changes the UI. Page titles inside follow ("Rondo AI", then each page's own title).
2. **Jose said yes to turning Rondo on in Development.** That is a hosting step, so it is yours. It is subject to the
   standing release policy: Development is the working and acceptance release with production standards; nothing here
   authorizes production, a main merge, copied production data or customer records.

## Checked on Vercel (Nov 18, setting names only, no values read)

- Project `nevora` (repository NEVORA: `development` and `claude-codex-collab-nevora`): **no `NEVORA_OWNER_ADVISOR_*`
  setting on any branch.** Its newest deployment is a `claude-codex-collab-nevora` preview from Nov 10 (`572dde7e`).
- Project `velani-rondo-development` (repository VELANI-SHOPIFY-WEBSITE): has `AI_MODEL`, `AI_API_KEY`,
  `DAILY_AI_REQUEST_LIMIT` and `AI_BUDGET_AUTHORIZATION_ID`. That is Velani's own Rondo, a separate app; NEVORA does not
  read those names. Jose expected Development to show Rondo from these; it cannot.
- Project `nevora-onboarding-staging`: no Rondo settings.

## Why Jose cannot see it today

- Every Rondo route and the API are gated by `NEVORA_OWNER_ADVISOR_ENABLED` (`src/lib/feature-flags.ts`). Your Nov 16
  integration note says runtime flags kept their defaults, so on Development the pages answer not found and the
  navigation entry is absent (`src/lib/navigation.ts:234`, `src/app/app/more/page.tsx:149`).
- The page and `GET/POST /api/owner/advisor` require a company-wide Owner (`src/app/app/ai-manager/page.tsx`, and the
  Nov 15 qualification note: "Current management authority is Owner-only"). A Manager never reaches it.

## What we need from you

### 1. Turn Rondo on in Development

Settings the code reads (please confirm the full set and values; this list is from `src/lib`):

| Setting | Purpose |
|---|---|
| `NEVORA_OWNER_ADVISOR_ENABLED` | The parent switch: routes, API, navigation |
| `NEVORA_OWNER_ADVISOR_DATA_APPROVED` | Data approval gate |
| `NEVORA_OWNER_ADVISOR_PROVIDER`, `NEVORA_OWNER_ADVISOR_MODEL`, `NEVORA_OWNER_ADVISOR_API_STYLE`, `NEVORA_OWNER_ADVISOR_REASONING_EFFORT`, the provider key | The model provider for the chat |
| `NEVORA_OWNER_ADVISOR_DAILY_LIMIT` | Daily use limit |
| `NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED` | Weekly plan |
| `NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED` | Company knowledge |
| `NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED`, `NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED` | Business records |

**Spending.** The chat calls a paid model. Jose's yes covers turning Rondo on; it does not name a spending cap, and the
earlier $5 comparison and expiring credits are historical, not new approval. Please confirm a cap and the daily limit
with Jose before any paid provider is configured on Development. If the knowledge, business records and weekly screens
work without the model, a first step with no provider configured (no spend) would let Jose see them now. Say which
screens work that way.

Please reply with: the commit and Development deployment where it is on, which settings are on, the cap and daily limit
Jose approved, and anything still held.

### 2. Manager access

Jose wants Managers to have Rondo AI and asked us to settle it. He has not picked a scope. Claude's recommendation, for
Jose to confirm before you ship it:

- **A Manager may:** ask Rondo AI about **their own locations only** (the locations their access covers), and read the
  weekly plan for those locations.
- **A Manager may not:** see or edit business records, edit the shared company knowledge library, see another Manager's
  or an Owner's private notes and memory, or see anything outside their locations (pay, payroll and other locations stay
  out, as everywhere else in the app).
- Every answer is bounded by the Manager's current authority at the moment of the read, as the Owner path is today.

If you agree, please write the contract as before (`docs/handoffs/2026-11-18-rondo-manager-ui-contract.md` or similar):
the routes and API a Manager may call, the authority check, what each response carries for a Manager (location scope,
what is withheld), the refusal codes, and the flag that turns it on. Claude builds the Manager screens on that contract.
Until then Claude prepares the entry and the closed state only, and builds no Manager feature against an unwritten
contract.

## What Claude does now (UI only)

- Renames the entry to **Rondo AI**, gives it its own icon (not the Insights chart it borrows today) and a deliberate
  place in the Owner's sidebar, rail and More, and adds a Rondo AI entry on the Owner's Direction B Home when the switch
  is on.
- Turns the switches on in the local capture tool only (fictional data, no provider: the chat shows its designed
  "unavailable" state), captures the four Rondo screens (Rondo AI, business records, company knowledge, weekly plan) at
  1440, 900, 390, 320 and touch 844x390, and reviews and fixes them to the Phase 8 standard. They were hidden in every
  earlier capture.
- Prepares the Manager's entry and its closed state, ready for your contract.

## Release sequence

Unchanged. Codex integrates and verifies on Development; the exact verified release is promoted to main only after Jose
approves. Branch: `claude-codex-collab-nevora` (local head has the Phase 4/5 follow-ups and Phase 7 decisions, not yet
pushed; Phase 8 fixes are in progress).
