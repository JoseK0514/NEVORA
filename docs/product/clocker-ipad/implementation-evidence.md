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
- Owned photo SQL:17 passed; focused unit/decoder/copy/migration:207 passed, including Spanish notice coverage; TypeScript and targeted lint passed. Synthetic Chromium/WebKit session:12 checks passed, with fictional camera/time transport and real IndexedDB. Actual Owner browser evidence is recorded below after verification.
- `npm audit --omit=dev` reports inherited nodemailer10.0.16 moderate addressparser advisories GHSA-8c8m-p3m8-cjg8, GHSA-m943-m63m-w62w and GHSA-85x2-q946-cp5h. No Clocker/sharp advisory was reported; no unrelated mail upgrade was attempted.

## T9 — Integrated candidate verification

- Real current application:36 Chromium/WebKit checks passed at768×1024,820×1180,1024×768,1366×1024,200% text, keyboard Enter/Escape and the actual12000ms lost-response deadline. Includes enrollment, all four clock/break transitions, cancellation, exact retry, closed-tab recovery, original-reference Owner handoff, Owner PIN/photo uncertain-save readback and disabled collection. The model/native fixture distinction remains explicit.
- Current Clocker SQL run covered569 cases across41 files:568 passed and one old Manager-positive PIN expectation failed. After aligning that expectation to approved Owner-only behavior and checking zero denied writes/events, its entire36-test file passed. The other40 files were unchanged and passed. Separate Owner/Company policy suite:65 passed.
- Broad initial unit run:9855 passed,5 failed,801 skipped. Two failures were obsolete Owner/Manager UI expectations, corrected with explicit preservation of non-Clocker Manager tools. Three process-custody harness failures cleared in an isolated111-test rerun without modifying its code/assertions. The whole unit suite is being rerun with file serialization to avoid competing ownership probes; actual final result follows below.
- Compiler and whole-repository lint passed after resolving event timestamp/ref-render lint errors. An optimized build passed without database credentials; final artifact verification follows code review.
- Fresh source reconciliation classified the new theme-default branch32ce3b5 as held, without merging it. Source check now has exactly one failure:7 active remote branches exceed the unchanged hard limit6. No branch was archived/deleted, and the guard was not relaxed. This is a repository release gate, distinct from local Clocker behavior.
- Physical iPad rows remain NOT RUN. No hardware model/version, accessible isolated HTTPS endpoint or verified cleanup/backup deployment binding has been supplied. Camera collection is unavailable. These release gates are not counted as automated passes.


## Final local candidate — review repair and verification

- Application code revision: `7b97a1b3418bdefebd6f864c7649f5c4f16ff272`. Final handoff commits may add documentation without changing application inputs. Local only; no push/PR, hosted migration, assembly, main merge or deployment.
- Whole unit suite after both privacy repairs: **9862 passed,801 skipped,0 failed** across600 passing/27 skipped files. This is the serialized full suite, not the earlier focused rerun. Initial failures remain recorded above and in raw evidence.
- Both Important findings from the [fresh review](reviews/2026-10-27-final-review.md) were reproduced through actual owned application browser flows before fixing. A backward wall-clock shift now cannot extend the original30-second screen; already expired replies cannot open identity; partial PIN/camera timing is bounded by elapsed time. Photo exit clears identity directly, uses one8-second receipt timer and reconciles its exact journal record independently of private presentation.
- Final Chromium/WebKit flow result: **42 passed** =36 actual application checks +6 explicitly synthetic photo-exit UI cases. The latter mock photo readiness/notice/status and exercise real UI/PIN/canonical local time writes; no lifecycle provider, camera or image collection is activated. Separate synthetic session model: **12 passed** after timing changes. Normal/enlarged/Spanish/Owner/recovery screenshots exist in the review-fixes-final batch.
- Current source-CSS composition inspection in both engines exposed the old recovery controls'16px/shadow overrides. The scoped V2-only correction now computes12px/no shadow for both controls. This inspection included the actual legacy shell CSS; it is not another full application run. No unrelated portal or legacy presentation was changed.
- Optimized build, TypeScript, whole-repository lint and whitespace check passed after that CSS-only correction. Executable application logic is unchanged from the9862-test passing revision.
- Current Clocker SQL:568 initial passes + one obsolete Manager-positive expectation corrected and its entire36-test file passed;569 unique cases verified across those runs. Separate Owner/Company SQL:65 passed. No new server/SQL logic changed during the final privacy/CSS repair.
- Fresh reviewer established0 Critical,2 Important,0 additional Minor findings. Both Important findings are covered by RED→GREEN and the complete suite; no second review/certification is claimed. [All decisions and costs](reviews/2026-10-27-decisions.md) are retained in ledger order.
- Raw logs, reviewer observations, before/after style measurements and verification-state.json are archived at the local task's `outputs/clocker/integration-acceptance/`. Original software-flow screenshots are at `outputs/clocker/review-fixes-final/`.
- Release remains blocked by physical-iPad acceptance, an actual lifecycle/deployment binding, and the unchanged source gate (7 active remote branches >6). Fresh fetch still shows development at the pinned base. No guard was relaxed or unrelated branch deleted. Task10's software work is verified; its physical/operational/source acceptance stays open.


## Follow-up — all iPad families and both launch modes

Jose clarified that Clocker targets all iPad families and must work in both Safari and Home Screen mode. The acceptance matrix now makes both modes required across compact, standard, Air/medium and Pro/large sizes, with current/previous/oldest proposed supported OS coverage. An untested minimum iPadOS version is not declared.

Application revision `97fef58a` adds a dedicated per-location Clocker launch manifest and page metadata, reusing the approved NEVORA icons. The shortcut starts at its exact `/clocker/<key>` URL, has a stable distinct identity, stays scoped to Clocker, permits both orientations and contains no enrollment/PIN/employee data. Both modern and legacy Apple capability metadata are emitted. The employee portal manifest/service worker and punch/Owner authority logic are unchanged; no offline time writer or automatic capture activation is added.

Validation for this follow-up:42 focused tests passed (including5 new launch/validation/configuration cases); TypeScript, targeted ESLint, whitespace check and optimized build passed. New tests first failed because launch support was absent. The first owned browser run also exposed the framework's modern capability tag replacing the legacy Apple tag; explicit compatibility metadata fixed that failure. The subsequent20 launch-contract checks passed across Chromium/WebKit: actual head metadata, all approved icon URLs, no-store/active-location manifest behavior, representative layouts, isolated fresh-context registration and absence of portal/notification initialization.

These20 checks do not install a real iPad Home Screen app or emulate its OS lifecycle/permissions. Actual Safari/Home Screen physical acceptance, minimum-version certification, photo operational readiness and source-hygiene gates remain open. The earlier9862-test whole-suite result belongs to its recorded prior revision; this bounded follow-up used the focused checks above.

Evidence is under the local task's `outputs/clocker/home-screen-launch-final/`; unit/build logs are in the local worktree's `.superpowers/sdd/clocker-home-screen-20261027/` and copied to that evidence folder. Platform references: [Apple's Home Screen web app guide](https://support.apple.com/en-mide/guide/ipad/ipad8f1f7a29/ipados), [WebKit's install behavior](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/#every-site-can-be-a-web-app-on-ios-and-ipados), and [Next.js Apple web-app metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#applewebapp).

## Isolated HTTPS staging continuation

The separate authenticated staging project now serves exact application469aa56e, with an empty-root fictional Neon database and migrations through0041. The platform-only worker and Company-bound lifecycle provider are staged; production capture remains unavailable.572 current Clocker SQL checks,328 focused unit checks, three explicit platform-role/expiry cases, typecheck/lint and the optimized hosted build passed. Final hosted checks covered both engines and exact lost-response recovery; only Chromium's camera input was synthetic. Actual deployed decoding, private Owner review/removal and scheduler-driven expiry were observed, with the original time receipt unchanged and no image bytes remaining.

See staging-environment.md for exact source/deployment/worker identities, credentials location, preserved reviewer findings and operational limits. Physical iPad rows remain NOT RUN; Vercel runtime-log reads remain permission-blocked. Earlier statements that photo operations/source hygiene were still open describe their historical checkpoints and are superseded only by the bounded staging evidence here. No production or native certification is inferred.
