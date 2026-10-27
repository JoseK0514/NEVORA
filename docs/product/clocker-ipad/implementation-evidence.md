# Clocker iPad implementation evidence

Implementation branch: `codex/clocker-ipad-integration-20261027`.
Base: `dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2` (origin/development).
Approved prototype: `d7204373a53e332332600ab0ffe01052801e550f2e3ad543d4fe26402d7df257`.

## Baseline, October 27

- TypeScript: passed.
- Focused Clocker unit suite: 6 files, 87 tests passed.
- Owned PostgreSQL PIN/transport/recovery: 3 files, 54 tests passed.
- Owned Company access PIN management: 16 tests passed.
- Owned Company access recovery/calendar: 27 tests passed.
- Development inventory: 61 classified sources, 6 active branches, passed.

All PostgreSQL checks used a newly owned loopback cluster; no application credentials.
No push, merge or deployment authorized or performed. Prototype evidence is separate
from application evidence. Physical iPad acceptance remains required.

## T1 — Owner-only administration

- PIN pages/actions/service admission and late SQL guards now require OWNER.
- Recovery page/API/receipt service require OWNER with current session and Company guards.
- Clocker links are hidden for Managers; account recovery, attendance and calendar permissions remain.
- Removed the hardcoded “Set” PIN status from the profile (now “Manage” until actual metadata is read).
- New tests first failed on Manager PIN access and forged Owner receipt access; then passed.
- Focused presentation/page/action checks: 41 passed. TypeScript passed.
- Owned Owner policy + PIN/recovery/calendar/Manager visibility SQL: 59 passed.
- Awaited revocation, DB-clock expiry and post-commit suppression coverage retained on the Owner path.

## T2 — Durable exact-action recovery

- IndexedDB keeps one atomic pending slot per location and opaque employee/device subject.
- Exact payloads commit and read back before a punch request; conflicting same-subject writes fail.
- Valid v1/v2 session records migrate after readback; corrupt/conflicting bytes remain for assistance.
- Resolution retains reference-only history. A failing cross-tab legacy resurrection test exposed a missing tombstone check; the fix now prevents that resurrection.
- 25 parser/journal unit tests passed; 24 Chromium/WebKit checks passed, including tab closure, competing saves, changed-record resolution, corrupt migration, quota and blocked database opening.
- TypeScript passed. No physical iPad durability claim is made.

## T3 — Approved presentation and locale

- Separate `NEVORA_CLOCKER_UI_V2=true` switch controls presentation only; default remains false and punch enablement stays independent.
- Scoped pale rail, system typography, regular Phosphor icons, 12px controls and 64px keypad/action geometry use the approved Clocker roles. Official wordmark, real location/timezone and explicit company branding remain.
- Complete English/Spanish setup, PIN, action, recovery and accessible labels replace the secondary glossary in V2. Locale survives in memory when storage is blocked.
- 12 render/copy/route tests and TypeScript passed.
- Real owned Next/PostgreSQL enrollment and PIN flows: 12 Chromium/WebKit checks passed at 768x1024, 1024x768, 1366x1024 and 200% text, with Spanish denial/success and no console errors.
- Two bounded visual rounds: corrected inherited action radius/shadow in the second; geometry assertions passed. Captures: `outputs/clocker/app-ipad-evidence` in the parent task workspace.
- 21st search used project context; existing primitives fit better than the returned time-picker/timesheet components. Review found seven informational palette-literal notices; these values define the approved scoped palette, not a new portal theme. No hosted AI generation used.

## T4 — Privacy and secure continuation

- Partial PIN entry clears after 20 idle seconds, retaining focus.
- Private views expire at the earlier of 30 seconds and the server identity deadline; last 10 seconds show a secure continuation action.
- Continuation clears identity first, awaits the existing serialized server clear, then requires a fresh PIN. Only an unchanged same-subject unsent task can resume; no PIN, name, command or old verification is carried.
- Existing epoch fences, Escape, background/pagehide and persisted-pageshow clearing remain.
- New partial-PIN browser test failed before the fix. Helper/copy tests: 8 passed. Existing actual PIN transport: 13 passed. TypeScript passed.
- Owned Chromium/WebKit: 16 checks passed, including unfinished PIN expiry, warning/hard clear and delayed verify response after Escape that cannot restore private content.
- Native sleep/lock/background acceptance remains on the physical-iPad checklist.

## T5 — Real actions and explicit recovery

- Uses existing state/allowed actions, configured breaks, strict receipts and PostgreSQL timestamps; no prototype outcomes enter the app.
- On-break clock-out has an accurate cancellation label. Success shows the exact reference and one eight-second clearing message.
- Unknown actions retain their original UUID/verification. Obsolete-context retirement now requires explicit review after guarded state and receipt reads, retaining reference-only history.
- Compact collapsed Owner help provides reference copy/manual-copy fallback without administration navigation.
- New browser expectation first failed on the old on-break cancellation. Then 24 owned Chromium/WebKit checks passed: all four writes, duplicate click, cancel, original-command retry, tab-close receipt recovery and explicit obsolete review without a new write.
- Unit receipt/command/copy suite: 51 passed. Current SQL punch/transport: 69 passed. Inherited punch/transport: 59 passed.
- Two additional SQL characterizations passed: combined PIN reset/device replacement rejects old authority, and recovery reads wait behind a real in-flight punch lock before reading its immutable receipt. TypeScript passed.

## T6 — Owner administration and exact PIN saves

- Owner navigation connects tablets, actual employee PIN metadata, breaks and recovery. Employee profiles now show Set/Not set/Unavailable from a protected read.
- Additive0038 adds a nullable unique operation UUID to append-only PIN events; historical events stay unchanged.
- PIN save clears secrets first, keeps only its exact reference on uncertain response and checks immutable event evidence. A newer PIN is explicitly reported as superseding the old save. Save stays disabled during blocked/incomplete input; metadata uses the current Company frame.
- SQL Owner/PIN/Company policy suite: 65 passed, including lost response, duplicate-operation rollback, superseded versions, late Owner loss and audit-preserving migration.
- Focused form/page/device/recovery/migration unit suite: 48 passed. TypeScript passed.
- Owned iPad application: 26 Chromium/WebKit checks passed, including lost PIN-save response and actual inventory; follow-up Chromium confirmation: 13 passed with the disabled Save/freshness change.
- Current break browser suite: 46 checks passed across Chromium/WebKit, including archived editing, stale tab, lost response, exact Owner-only notice and seven catalog/editor widths. The geometry failure exposed undersized filters, now44px touch targets scoped to Clocker.
- Removed unnecessary full-document reloads from responsive-rotation tests. A separate existing WebKit diagnostic reproduced native navigation-fetch output with zero window exceptions; the final real break run had no framework, hydration or console errors and needed no diagnostic exemptions.

## T7 — Explicit cross-device Owner review

- Additive0039 persists an employee-requested handoff only after an explicit action. Current tablet/PIN scope supplies requester, device, location and company; JSON cannot choose them.
- Exact request IDs are idempotent, changed payloads reject, and assistance without a readable clock UUID stays distinct from a time punch.
- Owner queue uses original Company/session fences, at most15-second observations and stable full-microsecond cursor ordering. Requester identity remains separate from canonical ledger evidence. The Owner alias delegates to the same protected handler as the older manager-named route.
- Collapsed tablet help provides same-ID retry, copied/manual references and dismiss without deleting history. No notifications or remote punch controls were added.
- SQL/transport: 14 passed, including response loss, invalid scope, foreign-person command, sub-millisecond pagination and late Owner loss. Body/parser/receipt/copy/migration unit: 15 passed; TypeScript passed.
- Owned application: 28 Chromium/WebKit checks passed, including actual cross-context request/receipt review and no duplicate or changed time.

## T8 — Owner photo policy and guarded capture candidate

- Selective adoption from reference ecd06408; current Company/home-location proof replaces its held F10 employee column contract. No tenant-cutover merge. Current session and workspace proofs are checked in SQL and again after transaction return; private tables use forced RLS, no PUBLIC access/functions, and transaction-local scope. A non-superuser/NOBYPASSRLS role verifies absent/foreign scope cannot read company preferences.
- Additive0040 stores Owner policy/profile revisions and private exact-command evidence separately from time. Off defaults with all four choices visible; all15 nonempty combinations persist. Empty On, stale/concurrent save and direct/late role loss reject. An uncertain save requires readback before resubmission. Owner assistance cannot certify cleanup/backup operations.
- `sharp`0.35.5 is now a direct locked dependency; actual native decoding and metadata stripping use fictional pixels. No real employee photos, public URLs or browser image storage. Native synthetic/session fixtures replace held source-shape/F10 activation tests; no claim of physical camera or deployment acceptance follows from them.
- The capture candidate uses the original PIN deadline and command UUID, awaits exact journal readback, revalidates policy/notice/identity around camera work, discards previews/tracks on invalidation, and reconciles time before photo-only retry. All four photo expectations are atomic with canonical punch/receipt writes when a verified provider is eventually bound. Existing canonical transport leaves this off while the provider is absent.
- Owner settings and private review are available through current SQL. Capture factory intentionally returns unavailable: real cleanup schedule, backup handling, deployment binding and physical iPad acceptance are unverified. Saved preferences do not activate collection. No invented provider, in-memory production fallback or analytics was added.
- Owned photo SQL:17 passed; focused unit/decoder/copy/migration:207 passed before the added Spanish notice case; TypeScript and targeted lint passed. Synthetic Chromium/WebKit session:12 checks passed, with fictional camera/time transport and real IndexedDB. Actual Owner browser evidence is recorded below after verification.
- `npm audit --omit=dev` reports inherited nodemailer10.0.16 moderate addressparser advisories GHSA-8c8m-p3m8-cjg8, GHSA-m943-m63m-w62w and GHSA-85x2-q946-cp5h. No Clocker/sharp advisory was reported; no unrelated mail upgrade was attempted.
