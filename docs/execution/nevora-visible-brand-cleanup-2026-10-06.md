# NEVORA visible-brand cleanup handoff

Base: `development` at `3a6a1438c891df9013428b4cefc2d589d42a3942`.
Branch: `fix/nevora-visible-brand-cleanup-20261006`.
Live entry head inspected: `0b50ce94e2d5e6fdcbc01283f4baab2620ad2456`.
Owner: Codex, engineering verification. Jose's visual approval is separate.

## Scope and cause

Ordinary Availability deadlines and pending submissions consumed the attention
palette. The cleanup uses primary/secondary neutral text, white/soft-blue
surfaces and blue actions; available/submitted states remain green. Individual
unsubmitted team members are neutral. The team missing total remains an
attention indicator for management. Employee requests awaiting review and
ordinary recorded-break chips are informational and neutral. Actions, state
transitions, deadlines, permissions, data access and Clocker behavior are unchanged.

The existing warning token remains the UI contract's amber attention pairing;
the interim global orange recolor is removed. Actual exceptions, required
acknowledgements, unfilled coverage and management review retain attention
styling. The obsolete cream login-copy fallback now uses the surface token.

The latest entry commit already repaired the ES2017 issue using negated character
classes, which match line breaks without dotAll. Those assertions remain intact.
Additional tests cover pending surfaces, actual rendered request/status markup,
manifest identity, offline copy and rendered push envelopes. Five newly added
rendered-status assertions failed on the entry head and passed after the fix.

## Fuel-reference classification

### A: legitimate customer data

Workspace names such as `Fuel Coffee Drive` and configured location labels such
as `FUEL – 2`, `FUEL – 110` and the historical ASCII equivalents remain stored
customer data. Shells, employee/location lists, schedule slots and Clocker render
the supplied labels. No customer labels, SQL seeds or persisted identities are
renamed. The manager regression test explicitly preserves `FUEL – 2`.

### B: intentionally retained compatibility identifiers

| Identifiers | Reason retained |
| --- | --- |
| `--coffee`, `--coffee-dark`, `--caramel`, `--soft-caramel`, `--fuel-*`, `--nuvora-*`, `NUVORA_BRAND` | Invisible aliases mapped to NEVORA blue/midnight/surface/canvas or semantic colors; changing them would broaden the CSS/component contract. |
| `/fuel-portal-sw.js`, `/fuel-portal.webmanifest`, `/fuel-portal-offline.html` | Existing registration, installation and offline URLs; preserve `/app` scope and update lifecycle. The manifest and offline page display NEVORA. |
| `/icons/fuel-192.png`, `/icons/fuel-512.png`, `/icons/fuel-maskable-{192,512}.png`, `/icons/fuel-apple-180.png` | Installed PWA/push/Apple icon references. Their pixels contain the NEVORA blue/cyan symbol. |
| `fuel-portal-public-*`, `fuel-portal-owner` | Service-worker cache and IndexedDB ownership protocol; renaming risks lifecycle/private-data handling. |
| `fuel-portal-owner-generation`, `fuel-portal-account-fence`, `fuel-portal-coordination-probe`, `fuel-portal-subscription-operation`, `fuel-portal-subscription-lifecycle`, `fuel-portal-dismissed:*` | Cross-tab ownership, subscription locking and dismissal storage; invisible protocol identifiers. |
| `fuel_session`, `fuel_push_installation`, `fuel_push_cleanup`, `fuel-push:*:v1` | Existing auth cookie, installation proof, cleanup receipt and cryptographic derivation/AAD contracts. |
| `fuel-<hash>` notification tag | Push validation and event deduplication contract. Visible title/body use NEVORA. |
| `FUEL_PORTAL_ORIGIN`, `https://fuel.invalid` | Deployment configuration and internal URL-validation sentinel; never visible product copy. |
| `workspace-fuel`, Fuel fixture/test/script names and database prefixes, package/repository/Vercel project names | Persistence, test-ownership safeguards and deployment compatibility; they do not define the visible product. |
| `docs/ui/fuel-ui-contract.md`, `fuel-scheduler-ui` skill path | Existing reference links; contents define NEVORA. |

### C: visible product remnants

The source audit covers runtime TS/TSX, global/module CSS, metadata, manifest,
offline page, assets and rendered notification copy. No hardcoded Fuel Scheduler
product copy, coffee photography/cup/bean artwork or old Fuel product icon remains.
Ordinary pending/Availability/break treatment is corrected as described above.
The runtime occurrence inventory and screenshots are retained in the external
evidence directory below. Final visual disposition depends on the verification
reports, including exact-SHA hosted portal checks.

## Verification and integration gate

Evidence directory:
`/Users/josek0514/.codex/visualizations/2026/10/06/nevora-visible-brand-cleanup/`.

Its release report records the final candidate SHA, command logs, source hashes,
CI run/PR URLs, browser matrix, screenshots, findings and hosted limitations.
Do not substitute earlier-SHA evidence. Required gates: focused branding tests,
full unit suite, ES2017 typecheck, lint, production build, production dependency
audit, owned Clocker PostgreSQL, release PostgreSQL, responsive UI and navigation
QA, plus an exact-candidate Vercel Preview.

The original dirty checkout is preserved. No production, customer-data writes,
main merge, repository visibility change, paid upgrade or control waiver is
authorized. Hosted authenticated testing requires proven isolated database
custody; an unavailable Preview secret is a blocker, not permission to use a
local connection as the deployment identity.

CTO position: presentation-only correction with unchanged application contracts.
Product/experience position: NEVORA owns the product; Fuel remains workspace data.
Security/governance position: preserve auth/PWA/notification identifiers and
database custody; all required gates remain mandatory. Technical assurance:
source scans alone do not certify rendered states or a hosted Preview.

Controlled integration target is `development`. A PR may be opened for review;
merge readiness requires all applicable gates green on one exact candidate SHA
and complete visual verification. No merge is performed by this task. Any later
development merge requires destination gates on its new SHA.
