# Clocker physical iPad acceptance

Date prepared: October27,2026. Scope clarified by Jose: **all iPad families, Safari and Home Screen required**. Target: **iPads only**, shared by employees and administered only by the Owner. Status: **NOT RUN**. Automated WebKit results are not substituted for physical iPad results.

## Record before the session

| Field | Actual value |
|---|---|
| Tester / date | Not supplied |
| iPad model and hardware keyboard/accessories | Not supplied |
| iPadOS and Safari version | Not supplied |
| Viewport/orientation/text-size setting | Record each run |
| Mode | Safari tab and Home Screen web app both required |
| Test URL and environment owner | https://nevora-clocker-staging-qa.vercel.app/clocker/clocker-staging ; isolated staging in Jose’s existing Vercel/Neon accounts. Requires Vercel authentication and a new Owner-issued iPad setup code. |
| Application branch/commit and migration state | Staging candidate469aa56e on codex/clocker-ipad-integration-20261027; Vercel dpl_8dVeorn7WS4cQAqTd6qFeDH78qUe; approved schema through0041. See staging-environment.md. |
| Company/location/device/sample employees | Nevora Clocker · Fictional Staging / Clocker Test Studio; CLOCKEROWNER, CLOCKEREMP1, CLOCKEREMP2. Automated browser stations retired; add a named physical iPad. |
| Server timezone / expected local time | America/Puerto_Rico; compare actual server time during each run. |
| Runtime/network/DB evidence location | Record before testing; redact credentials and PINs |

The Mac's `127.0.0.1` URL does not identify the Mac when opened on a separate iPad. Provision an approved isolated test endpoint with its exact expected Origin/HTTPS/cookie settings; no public tunnel, production credentials, customer time entries or permission weakening is assumed. Collect device/version availability from actual hardware; no unsupported minimum iPadOS version is declared here.

Photo settings and expected outcomes follow [Owner-controlled photo policy](photo-policy.md). Use fictional test images or a specifically authorized tester; do not collect real employee photos for QA without explicit authorization.

## Acceptance matrix

Each row starts NOT RUN. Record PASS only from observed behavior; otherwise FAIL or BLOCKED with the exact step/evidence. Failure never becomes “not applicable” merely because automation passed.

| ID | Scenario / action | Required observation | Status |
|---|---|---|---|
| IP01 | Owner registers named iPad, transfers code and enrolls at correct location | One-use code, correct device/location, cookie-confirmed connection; portal session removed only on that iPad | NOT RUN |
| IP02 | Wrong/expired/replaced code; cookies/storage blocked | No false ready/success; actionable retry/check path; original Owner session elsewhere remains valid | NOT RUN |
| IP03 | Off-clock PIN→Clock in→Done | No roster before PIN, correct employee/action, recorded server time/reference, private return | NOT RUN |
| IP04 | Working→break type→End break; clock out while on break | Reference minutes never end break automatically; accurate Stay on break/Cancel copy; correct atomic receipt | NOT RUN |
| IP05 | Invalid PIN→temporary limit→recovery; unset/inactive/ineligible person | Masked input, no employee enumeration, real Retry-After respected; no indefinite local lock | NOT RUN |
| IP06 | Two partial digits then20 idle seconds | Digits clear; keypad/focus remain usable | NOT RUN |
| IP07 | Read slowly across warning and30-second deadline; Continue securely | Warning visible/announced, hard cap kept, fresh PIN required; same actor resumes safe unsent mode only | NOT RUN |
| IP08 | Different employee enters after prior expiry / pending action | No previous identity/mode leakage; their own permitted actions work; original reference unchanged | NOT RUN |
| IP09 | Switch tabs, lock/unlock, sleep/wake, background/restore, back/forward cache | No visible verified identity on return; no late response restores it; pending evidence retained where storage persists | NOT RUN |
| IP10 | Lose response after commit; repeated status check and exact retry | One time entry/break only; original UUID; unknown remains unknown until authoritative evidence | NOT RUN |
| IP11 | Close/reopen Safari tab; quit/reopen the Home Screen web app | Journal survives supported same-origin lifecycle; no offline send. If OS cleared storage, explicit support/Owner recovery, no invented receipt | NOT RUN |
| IP12 | Two tabs/rapid double tap / app backgrounded during request | At most one accepted command; no overwritten pending record or identity transfer | NOT RUN |
| IP13 | PIN reset or tablet replacement while original unresolved | Old access invalidated; canonical receipt checked; explicit review returns current state without replay; old reference available to Owner | NOT RUN |
| IP14 | Ask Owner to review from employee terminal; Owner opens separate device | Confirmed request appears only in Owner portal; copied reference exact; dismiss changes presentation only; no employee admin access | NOT RUN |
| IP15 | Owner lost PIN-save reply; Check status; newer PIN settings | Exact operation confirmation or truthful unknown/superseded result; never guesses from version or repeats save | NOT RUN |
| IP16 | Non-owner deep links/direct API for PIN/devices/breaks/review | Server denial and no private data/write; other legitimate manager features still work | NOT RUN |
| IP17 | English and Spanish full employee loop including setup/errors/recovery | All visible/accessible labels in selected language, readable wrapping, no secondary glossary dependency | NOT RUN |
| IP18 | Portrait↔landscape; visible Safari bars; split-screen if supported/used | No clipped action/scroll trap; consistent spacing and64px keypad targets; compact station when needed | NOT RUN |
| IP19 |200% text; VoiceOver; external keyboard Tab/Enter/Escape | Task visible before excess rail, coherent reading/focus order, focus indicator, announced feedback and private return | NOT RUN |
| IP20 | Software keyboard/autofill, long device/company names, copy unavailable | Correct password masking, no saved/shared PIN suggestion, actions reachable; reference selectable when clipboard unavailable | NOT RUN |
| IP21 | Owner unavailable/empty/search states, archived edit/restore | Correct empty versus unavailable distinction; no accidental restore; current break can end | NOT RUN |
| IP22 | Custom brand/increased contrast/reduced motion; timezone/overnight | Legible labels/focus and preserved logo; no decorative motion dependency; actual server time and clear date context | NOT RUN |
| IP23 | Owner selects Off / clock-in only / clock-in+out / custom break events; second company uses different settings | Selected events only; Off never requests camera; company policy isolation; saved preferences distinct from runtime availability | NOT RUN |
| IP24 | Owner changes policy while camera opens or photo is uploading | Stale versions/notice do not collect under old settings; preview cleared and no duplicate punch | NOT RUN |
| IP25 | Camera denied, delayed permission, unavailable front camera, cancel, tab switch/lock | Clear English/Spanish guidance and supported exception/assistance; tracks/previews cleared; no prior-employee image leak | NOT RUN |
| IP26 | Photo response lost after clock commit; exact photo retry | Time receipt preserved; separate truthful photo status; no second clock action or cross-command attachment | NOT RUN |
| IP27 | Owner-only photo review/removal; Manager/direct URL/other-company attempts | Private authorized review only; no public cache/link access; refusal after authority expires; time records intact | NOT RUN |
| IP28 | Owner shortens/increases retention, turns Off, then late upload/retry or backup restore | Expiry never extended for old images; removed/expired photos do not reappear; no false immediate-deletion claim; actual cleanup/backup evidence | NOT RUN |

## Evidence and completion

Capture one bounded normal/exception/enlarged batch, plus logs/record counts for actual failures. Avoid recording PIN digits, setup secrets, cookies, real employee data or replay telemetry. The test record identifies exact model/version/mode/commit. Independent QA/UI reviews the final integrated artifact and findings before release; no “zero error” or native certification is inferred from prototype tests.

Required acceptance: every applicable row observed; failures resolved and rerun, blockers explicitly recorded. If only one iPad model is available, report that limit rather than claiming all iPads. Run every applicable row separately in Safari and Home Screen mode; both are required. Production remains disabled until separately authorized.

## Automated boundary

Owned Chromium/WebKit runs, current PostgreSQL and synthetic camera/image fixtures are documented in [implementation evidence](implementation-evidence.md). Every physical row above remains NOT RUN. A physical model/version and an approved isolated HTTPS endpoint have not been supplied; this Mac’s loopback app is not an iPad acceptance environment. Saved Owner photo preferences do not remove that gate or bind a cleanup/backup provider.


## Compatibility target clarified by Jose

The product targets iPad mini, standard iPad, iPad Air and iPad Pro across sizes. Both Safari and the Home Screen web app are required release paths. A specific customer's current model does not define the support target. A minimum supported iPadOS version is pending an API/browser audit and physical evidence; no promise covering every historical iPad or obsolete browser is made.

| Representative class | Automated layout targets (CSS pixels) | Safari physical | Home Screen physical |
|---|---|---|---|
| Compact / mini |744×1133 and landscape | NOT RUN | NOT RUN |
| Standard / older aspect ratio |768×1024 and landscape | NOT RUN | NOT RUN |
| Medium / Air |820×1180 and landscape | NOT RUN | NOT RUN |
| Large / Pro |1024×1366 and landscape | NOT RUN | NOT RUN |

OS coverage must include the current supported release, previous supported release, and oldest proposed supported release. Record exact model/OS/build for each actual run. Passing current desktop WebKit does not establish an older iPadOS floor. Existing200% text, VoiceOver, keyboard, rotation, safe-area, PIN/privacy, recovery and photo scenarios apply in both launch modes.

### Mode-specific acceptance

- Add the actual location's Clocker page to Home Screen and open it as a web app. Its launch target stays `/clocker/<location>` with its own stable install identity, approved icon and unrestricted orientation; it must not open the employee portal.
- Verify registration in each actual browser/app context. Never assume enrollment cookies, PIN identity, journal data or permissions transfer between Safari and a Home Screen installation. Reconnect through Owner controls when that context needs enrollment; never copy credentials manually.
- Quit/reopen, switch modes, sleep/wake and rotate. Each context must clear verified employee identity, retain only its own valid recovery evidence, and reconcile a lost time response without another punch.
- Exercise camera permission, capture cancellation and policy changes independently in both modes once the real capture provider is verified. Automation/metadata checks do not close these physical rows.

Platform basis: [Apple Home Screen web app guide](https://support.apple.com/en-mide/guide/ipad/ipad8f1f7a29/ipados) and [WebKit Home Screen behavior](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/#every-site-can-be-a-web-app-on-ios-and-ipados). Home Screen support does not require introducing an offline time writer or service worker.
