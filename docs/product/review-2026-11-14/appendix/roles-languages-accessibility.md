# Roles, languages, accessibility and states (source reading, Nov 14, 2026)

ROLES / DEVICES / LANGUAGES / ACCESSIBILITY / STATE COVERAGE — source inspection

Source: `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB`, branch `claude-codex-collab-nevora`, HEAD `ce4de4bc`. Read-only: nothing edited, built, installed or run. Every path below is relative to that root. No browser, device or screen-reader was used (see D). Counts come from grep/regex over `src` and are approximate.

Headline: Spanish is finished outside the signed-in app (sign-in family, kiosk, billing, 404, pay-statement PDFs) and absent inside it. Accessibility fundamentals are sound in source (native dialogs, named controls, real tables, live regions, reduced motion). The biggest gaps are the English wall after sign-in, the kiosk's failure/offline paths, the unbuilt Clocker decisions, session expiry, and fixed-px type in Direction B.

---

## A. Language coverage by surface

**How language is chosen and stored**
- Sign-in family: cookie `nv-lang`, 1 year, per device (`src/lib/auth-copy.ts:5`; set in `src/components/auth-premium/lang-switch.tsx:12-20`, `src/components/mobile-access/language-switch.tsx:13`; read in `src/lib/auth-lang.server.ts:5-12`). Default is English. Browser language is never read. No per-person language exists in the database (only the onboarding `locale`, `src/lib/onboarding/contracts.ts:26`).
- Clocker: `localStorage` key `nevora.clocker.locale`, per tablet (`src/components/clocker-language.tsx:21-26`), default `en` (`:28`).
- Billing pages: by URL (`src/app/pages/es-facturacion/page.tsx:4`, `es-pago/page.tsx:4` force `es`; `nevora-billing*/page.tsx:4` force `en`; `plans` uses the cookie) plus an in-page toggle (`src/components/commerce-recovery/central.tsx:57`).
- Pay-statement PDFs: company default plus per-employee override (`src/components/payroll/payroll-settings.tsx:180,241`).
- `<html lang="en">` is hard-coded (`src/app/layout.tsx:37`, `src/app/global-error.tsx:7`); Spanish pages set `lang` on `<main>` only (`src/components/auth-premium/auth-shell.tsx:34`, `src/components/clocker-shell.tsx:49`).

| Surface | EN / ES | Evidence and rough measure |
|---|---|---|
| Login, forgot, reset, activate | EN + ES | `src/lib/auth-copy.ts` (306 lines, type-enforced parity `:286`); titles localised (`src/components/mobile-access/metadata.server.ts:8-17`); 24 of 38 files use the helper |
| Welcome, access-help | EN + ES | `src/components/mobile-access/copy.ts` (435 lines, parity `:435`) |
| Server messages on recovery pages | Mixed risk | Mapped by exact English string, 9 entries, falls back to English (`src/lib/auth-copy.ts:290-306`) |
| 404 (public and Clocker) | EN + ES | `src/app/not-found.tsx:16-18`; `src/app/clocker/[location]/not-found.tsx:17` |
| Privacy, Terms, Support, Account deletion | EN only | No `lang` in `src/components/legal/legal-document.tsx` or `src/app/support/page.tsx`; footer admits it: "Privacidad (en inglés)" (`src/components/brand-legal.tsx:7`) |
| Public error, portal error, offline page | EN only | `src/components/public-error-screen.tsx:13-27`; `src/components/app-error-screen.tsx:11-24`; `public/fuel-portal-offline.html:2` |
| `/pages/plans`, billing, `es-*`, `/app/billing` | EN + ES | `src/components/commerce-recovery/central.tsx:9-10`, `billing.tsx:10-11`; metadata title is English for all (`central-page.tsx:6`) |
| Employee and Lead app | EN only | 2 of ~94 files touch language, and only to draw the switch; the hint says so: "Sign-in pages only. The rest of NEVORA is in English for now." (`src/components/employee-mobile/profile.tsx:25`) |
| Manager and Owner app | EN only | ~1 of ~229 files; vocabulary pinned to `.en` at 9 call sites (e.g. `src/app/app/layout.tsx:117`), 0 uses of `.es` although reviewed Spanish slots exist (`src/lib/workspace-presentation/words.ts:10-25`) |
| Settings | EN only | 0 of ~54 files |
| Payroll UI | EN only | 1 of ~32 files (the statement-language select); money formatter supports `es-PR` (`src/components/payroll/money.ts:5`) but callers default to `en` |
| Pay-statement PDF | EN or ES | `src/lib/payroll/native/paystub-document.ts:33,315,553`; `src/lib/payroll/native/document-mapping.ts:32` |
| Clocker kiosk | EN + ES, complete | 269 phrases in `src/components/clocker-copy.ts`; I checked every `t('…')` key in 9 kiosk components and none is missing; dates use `es-PR` (`clocker-language.tsx:41`); unknown server text stays English and is marked `lang="en"` (`:36-39`) |
| Clocker paused page | EN + ES, wrong source | Reads the sign-in cookie, not the kiosk's choice (`src/app/clocker/access/paused/page.tsx:12`) |
| Account emails | Both in one body, English first | `src/lib/auth/account-email-copy.ts:1-6` |
| Onboarding verification email | EN or ES | `src/lib/onboarding/verification-delivery.server.ts:16-17` |
| Push notifications | EN only, generic | `src/lib/notifications/payloads.ts:15-27`; service worker accepts only exact English pairs (`public/fuel-portal-sw.js:182-209`); native "Open NEVORA." (`src/lib/native-push/providers/apns.ts:58`, `fcm.ts:47`) |
| Form validation | EN, plus browser-locale fallback | `src/components/form-validation.tsx:41-52` (last line returns `field.validationMessage`) |
| Dates and numbers | `en-US` hard-coded | 205 literals in 105 files; 7 `toLocaleString()` with no locale in Owner advisor (`src/components/owner-advisor/advisor.tsx:35,114`, `attention.tsx:11,33`, `notebook-panel.tsx:67,85`); about 262 English plural/ternary sites |
| Manifests | EN | Shortcut names "Schedule", "Time off" (`src/lib/notifications/manifest.ts:8-9`); no `lang` |

**Spanish that exists but is pinned to English in the app:** the employee onboarding guide (`src/app/app/page.tsx:81`, `lang="en"`), passkey copy (`src/components/passkeys/passkey-section.tsx:10`, `passkey-offer.tsx:9`, `passkey-desktop-view.tsx:6`), and the vocabulary presets above.

**Against the 8–11 week estimate:** everything around the app is done; the signed-in product is essentially untouched and has no dictionary or locale seam. About 40 client sites display server text directly and about 25 server sites return literal English errors. The estimate still describes the remaining work.

---

## B. State coverage matrix

Loading is universal under `/app` because `src/app/app/loading.tsx` falls back to a route-to-skeleton table (`src/app/app/root-loading.tsx:11-51`). The portal error boundary (`src/app/app/error.tsx`) covers every `/app` route and now re-reads the server on retry. "Silent" means `requireRoles` sends the wrong role to Home with no message (`src/lib/auth/permissions.ts:36-44`).

| Page | Loading | Empty | Error | Success | Restricted | Recovery |
|---|---|---|---|---|---|---|
| **Owner** | | | | | | |
| Home `/app` | yes (`owner-b/home-b.tsx:104`) | yes | yes (`home-b.tsx:43`) | n/a | n/a | yes: retry, sign-in (`:105`), offline line (`app-shell.tsx:554`) |
| Things to do | yes (`inbox/loading.tsx`) | yes | yes (`owner-b/inbox-b.tsx:41`) | partial (`:66`), no undo | Employee redirected to Requests (`inbox/page.tsx`) | partial |
| Schedule | yes | yes (`manager-weekly-roster.tsx:245`) | partial: no own boundary; one failed read fails the page | yes (toast) | sub-routes silent | partial: week-copy retry (`schedule-copy-form.tsx:79-95`) |
| Timecards | yes (`timecards.tsx:167`) | yes (`:27`) | yes (`:539`) | yes (`:455`) | role-aware view | yes: poll, offline hold (`:228-239`), sign-in (`:204`) |
| Payroll | yes (`payroll-runs.tsx:102`) | yes (`:6`) | yes (`use-payroll.ts:43-45`) | yes (`:402`) | yes, notice (`payroll-route.tsx:25`) | yes: saved action reference (`use-payroll.ts:121-167`) |
| Team | yes | partial (no explicit empty found) | yes (`employees/error.tsx`) | yes | silent (`employees/page.tsx:19`) | yes |
| Insights | yes | yes (`reports.tsx:312`) | yes (`:166`) | n/a | yes, notice | yes |
| Settings (13 pages) | yes, older skeleton | yes | partial: only Locations has its own (`settings/locations/error.tsx`) | partial | yes, notice (`settings/layout.tsx:12-15`) | partial |
| Billing | partial: Home-shaped fallback | n/a | yes (`billing.tsx:10`) | partial | yes | yes |
| **Manager** | | | | | | |
| Same pages as Owner | same | same | same | same | Payroll and Settings show the notice; `/app/clocker-recovery` is silent (`clocker-recovery/page.tsx:13`) | same |
| **Employee and Lead** | | | | | | |
| Home | yes (`employee-b/home-b.tsx:253`) | yes (`:120,250`) | yes (`:194`) | n/a | n/a | yes |
| Schedule | yes | yes (`schedule-b.tsx:117-138`) | partial: portal boundary only | yes (`:100`) | manager sub-routes silent | partial |
| Time | yes (`time-b.tsx:151`) | yes (`:98,165`) | yes (`:54`) | yes (`:66`) | n/a | yes (`:56`) |
| Requests and time off | yes (`timeoff-b.tsx:117`) | yes | yes (`:116`; `requests-b.tsx:132`) | yes | Owner opening swap/callout is redirected | yes |
| Pick up and swap | yes (sheet `loading.tsx`) | yes (`exchange-b.tsx:137-139`) | partial | yes (`:85`) | n/a | yes (`:65`) |
| Pay | yes (`pay-b.tsx:74`) | yes (`:75`) | yes | n/a | 404 when the module is off | yes, with return path (`pay-corp.tsx:98`) |
| Notifications | yes (`messages-b.tsx:117`) | yes (`:126`) | yes (`:38-47`) | yes | n/a | yes (`:41`) |
| Profile | yes (`account-b-client.tsx:115`) | n/a | yes (`:41`) | yes (`:55`) | n/a | yes |
| **Clocker** | | | | | | |
| Setup | yes (`clocker-setup.tsx:85-92`) | n/a | partial: inline only | yes | n/a | yes |
| PIN | yes (`clocker-pin-gate.tsx:139,157`) | n/a | yes (`:152`) | yes | lockout (`:134`) | yes (`:137`); auto-clear (`:76-89`) |
| Punch and receipt | yes | n/a | yes (`clocker-punch-panel.tsx:26,195-196`) | yes (`clocker-receipt.tsx:38-47`) | re-verify PIN mode | yes: recovery journal (`:50,71`) |
| Paused, not found | n/a | n/a | yes | n/a | yes | partial |
| Render failure | **no** | n/a | **no kiosk boundary** | n/a | n/a | **no** |
| **Signed-out** | | | | | | |
| Login | yes (`login-submit.tsx:19`) | n/a | yes (`login/page.tsx:58`) | yes (`:59`) | rate-limit message | **no** session-ended message or return |
| Forgot, reset, activate | yes | n/a | yes | yes | n/a | yes |
| Legal, support | n/a | n/a | public error screen | n/a | n/a | n/a |
| 404 | n/a | n/a | yes | n/a | n/a | yes |

---

## C. Findings (most severe first)

Owner key: Codex = backend/hosting, Claude = UI, Jose = decision. Effort: S ≤ 2 days, M ≤ 2 weeks, L more.

| ID | Finding | Type | Evidence | Affected | Customer impact | Severity | Recommended improvement | Effort / deps | Owner | Already addressed? |
|---|---|---|---|---|---|---|---|---|---|---|
| RA-1 | The signed-in product is English only; Spanish stops at sign-in | Proposed feature | `src/components/employee-mobile/profile.tsx:25`; `src/app/app/layout.tsx:117`; A table | Spanish-speaking employees, managers, owners; all devices | A Spanish speaker signs in in Spanish and lands in English for schedule, time and pay | High (release blocker only if launch promises Spanish) | Decide scope and order (employees first); build one dictionary and format module before translating | L; needs RA-2 | Jose, then Claude | Partly: PB-009; `FIXED-AND-REMAINING.md` decision; `11-ui-layer.md` #7 |
| RA-2 | No locale seam and no stored language per person | Observed defect | Cookie only (`src/lib/auth-lang.server.ts:5-12`); 205 `en-US` literals; ~262 English plural sites | All roles; emails and push cannot know the language | Each new device starts in English; server-side text can never match the person | High | Store language on the employee record; one format module; honour browser language on first visit | M groundwork; Codex adds the field | Codex + Claude | Partly: PB-020; `11-ui-layer.md` #7, #8 |
| RA-3 | Clocker still PIN-only; lockout says "about five minutes" and always blames the tablet | Observed defect | `src/components/clocker-pin-gate.tsx:107` sends `{action:'verify',pin}`; `:134`, `:148`; client reads only `data.error` (`:24`) | Every employee at the kiosk | A person-level pause reads "This tablet is paused"; no real wait time; the approved Employee ID step is missing | High | Build the approved ID + PIN step; read `limitScope` and `retryAfterSeconds`; show the clock time | M; server contract already delivered | Claude | Partly: decisions in review `README.md`; `PLAN.md` Phase 6; `backend-gaps.md:255-260`. Not built |
| RA-4 | The kiosk has no error or loading boundary of its own | Observed defect | No `error.tsx` under `src/app/clocker`; falls to `src/app/error.tsx:6` → `src/components/public-error-screen.tsx:13-27` (English, "Go to sign in") | Shared tablet, both languages | A render failure leaves a shared tablet on an English page inviting someone to sign in | High | Kiosk `error.tsx` in the kiosk language: "Try again" and "Ask a manager"; no sign-in link | S | Claude | Partly: `11-ui-layer.md` #11, still open |
| RA-5 | Session end goes to a bare `/login`: no message, no way back | Observed defect | `src/lib/auth/session.ts:125,133,135`; login already accepts `returnTo` (`src/app/login/page.tsx:34`); 77 of 80 in-page sign-in links are bare `/login` | All roles, mid-task | Lost place and lost typed work; no explanation | High | Redirect with a reason and a safe return path; say "Your session ended"; pass `returnTo` from in-page links | S–M | Claude (Codex if the redirect helper is theirs) | Yes, planned: PB-005; `PLAN.md` Phase 5 |
| RA-6 | The kiosk has no offline shell | Proposed feature | Service worker is portal-only, scope `/app` (`public/fuel-portal-sw.js:1`; `src/lib/notifications/device-client.ts:414-415`); loaded page shows "No connection" (`clocker-pin-gate.tsx:127-137`) | Shared tablet on weak Wi-Fi | A reload or relaunch while offline shows the browser's error page; no punch can be held | High | Decide whether offline punches are allowed; at minimum a kiosk service worker with an offline screen that names the manager fallback | M (shell) or L (queued punches); Codex for server rules | Jose, then Codex + Claude | No (UI backlog #9 covers the portal only) |
| RA-7 | Wrong-role links mostly drop the person on Home with no word | Observed defect | `src/lib/auth/permissions.ts:36-44`; e.g. `src/app/app/employees/page.tsx:19`, `schedule/publish/page.tsx:54`, `timecards/corrections/page.tsx:20`, `clocker-recovery/page.tsx:13`; only 8 pages use `src/components/owner-only-notice.tsx` | Employee, Lead, Manager following a shared link | "The link did nothing"; inconsistent with Payroll and Settings, which explain | Medium | Use the closed-page notice on the ~14 non-settings routes, naming who can help | S–M | Claude | No. MG-001/002/009 cover the notice's look, not the silent routes |
| RA-8 | Direction B type is fixed px, so a larger default text size has no effect | Observed defect | `src/app/b-tokens.css:41-46`; 0 `rem` font sizes across 7 B sheets (e.g. `owner-b-desktop.css` 58 px sizes); older layers scaled (`src/app/app/portal-gusto.css:89`); skeletons still scale (`src/app/layout.tsx:27`) | Low-vision users, all roles | Text-size preference ignored (zoom still works); skeleton and page can disagree | Medium | Express B type roles in rem; re-test 200% | M; fits Phase 1 type work | Claude | No. Looks like a regression of the "large-text layouts" claim in `FIXED-AND-REMAINING.md`; needs a browser check |
| RA-9 | Shared form validation is English-only, can fall back to the browser's language, and is not announced | Observed defect | `src/components/form-validation.tsx:41-52`; `aria-describedby` added only on first creation (`:58-66`); no live region | Every portal form; screen-reader users | Mixed-language errors; blur errors unannounced; message can lose its link to the field | Medium | Re-assert the association each time; add `role="alert"`; route text through the dictionary | S | Claude | Known, open: `11-ui-layer.md` #6 |
| RA-10 | Empty-cell "+ Add" in the schedule grid is hover-only; the grid has no arrow-key movement | Observed defect | `src/components/manager-weekly-roster.tsx:371` (`tabIndex={-1} aria-hidden`); `src/app/app/clean-manager/schedule.css:234-235`; no Arrow handlers in the file | Owner and Manager; keyboard and iPad | Cannot add a shift for a given person and day without a mouse; one Tab per shift | Medium | Make the cell action focusable and visible on touch; add roving focus | M | Claude | Partly: UI backlog #4 (arrow keys). Hover-only is new |
| RA-11 | Push text is English, generic and locked to exact English strings | Observed defect | `src/lib/notifications/payloads.ts:15-27`; `public/fuel-portal-sw.js:182-209`; `src/lib/native-push/providers/apns.ts:58` | Employees on phones | "Your request has an update" in English for a Spanish speaker | Medium | Per-language payloads; widen the worker's allow-list | M; needs RA-2 | Codex + Claude | Known: backend item 10 in `FIXED-AND-REMAINING.md` |
| RA-12 | Policies, Support, Account deletion, error screens and the offline page are English only | Observed defect | A table rows; `src/components/brand-legal.tsx:7` | Spanish speakers, signed out | Terms and deletion steps unreadable; mixed-language footer | Medium | Translate Support, deletion and error screens; decide on Spanish policies with counsel | M | Jose (policies), Claude | Yes, planned: PB-001, PB-025; Phase 5 |
| RA-13 | Kiosk language is English by default, sticks for the next person, and the paused page ignores it | Observed defect | No `initialLocale` passed (`src/app/clocker/[location]/page.tsx:33`); sticky store (`clocker-language.tsx:21-26`); toggle only on PIN and setup (`clocker-pin-gate.tsx:161`, `clocker-setup.tsx:119`); `paused/page.tsx:12` | Shared tablet | Puerto Rico tablets start in English; a Spanish tablet can show an English paused page | Medium | Owner setting for the tablet's default; decide whether it resets after each punch; read the kiosk choice on paused and 404 | S–M | Jose (default), Claude | No |
| RA-14 | Contrast pairs still below target | Observed defect | Recomputed from `src/app/b-tokens.css:7-21`: grey on quiet 4.41, on teal-50 4.37, on red-50 4.33; band second white on glass 3.80; coral dot on band 2.07; field edge 3.12 | Low vision; outdoor phone use | Small grey text and band sub-lines hard to read | Medium | Apply the proposed token fixes (`--b-grey-on-fill` has only 4 uses today) | S | Claude | Yes, planned: SY-008; Phase 1 |
| RA-15 | Error screens always blame the connection and give no reference | Design preference | `src/app/app/error.tsx:9-27` (digest unused); `src/components/app-error-screen.tsx:11-24` | All roles | A server fault reads as "check your connection"; support has nothing to quote | Medium | Separate offline from server fault; show a short reference | S for UI; Codex for logging | Claude + Codex | Partly: backend item 3; `11-ui-layer.md` #1 retry is fixed |
| RA-16 | Notification times use the device time zone and `en-US` | Observed defect | `src/components/notification-inbox.tsx:45-48,144`; `src/lib/notification-inbox-view.ts:11` | Anyone whose device zone differs from the workplace | Times and day groups differ from the rest of the app | Medium | Pass the workplace zone in the snapshot | S | Codex + Claude | Known, half-fixed: `11-ui-layer.md` #4 (payroll part fixed, `payroll-settings.tsx:36`) |
| RA-17 | Focus rings drawn with box-shadow disappear in Windows High Contrast | Observed defect | `src/components/clocker.module.css:231-232`; `src/app/app/owner-b-desktop.css:360-361`; `src/components/quiet/quiet.css:103-106`; `src/app/app/b-foundation.css:161,512-516`; no `forced-colors` rule in any B sheet or the kiosk | Keyboard users in High Contrast | No visible focus on the PIN field, team search, sidebar | Medium | Add a transparent outline that forced colours can paint | S | Claude | Partly: `11-ui-layer.md` #9; older layers fixed |
| RA-18 | Draft and published shifts differ only by two near-identical pale fills | Observed defect | `src/app/app/b-foundation.css:95`; legend is `aria-hidden` (`manager-weekly-roster.tsx:379`); the words are screen-reader only (`:88`) | Owner and Manager; colour-deficient or bright-light use | Hard to tell what is not yet published | Medium | A non-colour cue on draft blocks (dashed edge or a "Draft" tag) | S | Claude | No; rendered result not checked |
| RA-19 | The offline page only exists for people who turned on alerts; installed app's sign-in is outside the manifest scope | Observed defect | Registration only in the alerts flow (`device-client.ts:412-416`); scope `/app` (`src/lib/notifications/manifest.ts:18`) while `/login` links the same manifest (`src/app/login/layout.tsx:8`); offline page is the older look | Phone users | Most people get the browser's offline page; installed app may show browser bars at sign-in | Medium | Register for every role; widen scope; restyle and translate the offline page | S–M | Claude | Known, open: UI backlog #9 |
| RA-20 | Success messages vanish after about 5 seconds and there is no Undo anywhere | Design preference | `src/app/app/portal-motion.css:176-181`; no undo in real flows | Owner and Manager decisions | A missed confirmation cannot be re-read; a wrong approve needs a manual reversal | Low | Keep the last result reachable; add Undo for approve/decline | M | Claude (+ Codex for reversal) | Partly: UI backlog #1 |
| RA-21 | Press animation ignores reduced motion on portal buttons | Observed defect | `src/app/app/b-foundation.css:180` (kiosk is correctly gated, `clocker.module.css:345-351`) | Reduce-motion users | Buttons still shrink on press | Low | Gate behind `no-preference` | S | Claude | Yes: SY-018 |
| RA-22 | Spanish that already exists is switched off in the app | Design preference | `src/app/app/page.tsx:81`; `passkey-section.tsx:10`; `words.ts:10-25` unused | Spanish-speaking employees | Finished translations unused | Low | Turn on only with RA-1, to avoid half-Spanish screens | S once RA-1 starts | Jose | No |
| RA-23 | `<html lang>` is always `en` | Observed defect | `src/app/layout.tsx:37`; `src/app/global-error.tsx:7` | Screen-reader users in Spanish | Page chrome and title may be read with English pronunciation | Low | Set from the chosen language | S | Claude | Partly: `11-ui-layer.md` #7 |
| RA-24 | Some routes show a Home-shaped skeleton announced as "Loading your workspace…" | Observed defect | `src/app/app/root-loading.tsx:11-51` omits `/app/billing`, `/help`, `/more`, `/ai-manager`, `/account/delete`, `/timecards/corrections` | All roles | Wrong shape, then a jump | Low | Add entries or own `loading.tsx` | S | Claude | Partly: `11-ui-layer.md` #11; SY-022 |
| RA-25 | Delegated time-correction page has no title | Observed defect | No metadata in `src/app/app/timecards/corrections/new/[employeeId]/page.tsx` | Owner and Manager | Tab and screen reader say only "NEVORA" | Low | Add the title | S | Claude | No |
| RA-26 | PIN pad and a hardware keyboard | Observed defect | Only Escape is handled globally (`clocker-pin-gate.tsx:73`); pad keys take focus (`:155`) | Kiosk with a keyboard or switch device | After tapping a pad key, typed digits go nowhere | Low | Return focus to the PIN field after each pad press | S | Claude | No; not verified |
| RA-27 | Two breakpoint families overlap between 761 and 767px | Observed defect | 760/761 used ~349 times, 767/768 ~287 times; B uses `src/lib/b-viewport.ts:7-13` | Narrow tablets and split view | Mixed phone and desktop rules in a 7px band | Low | Retire the 760/761 family as old sheets are removed | M (CSS debt) | Claude | Known: `11-ui-layer.md` #3 |
| RA-28 | No automated accessibility gate | Proposed feature | `package.json` has no axe; contrast script only tests its own maths (`scripts/browser-contrast.check.mjs:1-30`) | All | Regressions arrive unnoticed | Low | Add an axe pass to the browser suites and the stricter lint rules | S–M | Claude | Partly: `11-ui-layer.md` #9 |
| RA-29 | Account emails carry both languages, English first | Design preference | `src/lib/auth/account-email-copy.ts:1-6` | New hires, password resets | Long plain email | Low | Send one language once RA-2 exists | S after RA-2 | Codex | Known: PB-022 |
| RA-30 | Owner advisor dates use the browser's locale and zone | Observed defect | `src/components/owner-advisor/advisor.tsx:35,114`; `attention.tsx:11,33`; `notebook-panel.tsx:67,85` | Owner | Date format differs from the rest of the app | Low | Use the shared formatter with the workplace zone | S | Claude | No |

**Checked and sound in source, so not findings:** no positive `tabindex`; no click handlers on static elements; zero unnamed icon-only controls and zero images without `alt` (regex sweep); sheets are native modal dialogs (`src/components/quiet/quiet-sheet.tsx`), action-menu sheets make the page inert (`src/components/action-menu.tsx:97-108`); no drag-and-drop exists; schedule, timecards, reports and pay use real tables with a caption and scoped headers; skip links in the portal and kiosk; viewport does not block zoom (`src/app/layout.tsx:21-25`); dark mode is deliberately off (`src/lib/theme.ts:10`); the kiosk clears a verified screen after 30 s, a typed PIN after 20 s, the receipt after 8 s, and on tab-hide or Escape (`clocker-pin-gate.tsx:69-89`, `clocker-privacy.ts:2-8`), with portrait and landscape layouts and 48px+ targets; portal private readers clear when the person steps away (`src/lib/offline-hold.ts:14-19`). GSAP is installed but imported nowhere in `src`; all motion is CSS or Web Animations, with 139 reduced-motion queries.

---

## D. What source reading cannot establish

- **Screen readers:** nothing was heard. Announcement order, duplicate announcements from the many live regions (about 426 `role="status"`, 131 `role="alert"`), and whether phone and desktop copies of a title are both exposed (several pages render two or three, e.g. `owner-only-notice.tsx:27-35`) need VoiceOver and TalkBack.
- **Which CSS rule wins:** about 20 stylesheets load on `/app` with heavy `!important`. Real font sizes, target sizes, focus-ring visibility, the draft/published look (RA-18) and the legacy sub-12px rules in `globals.css` are unknown until rendered.
- **Contrast on screen:** ratios are computed from token values only; text over the gradient band and glass needs rendered sampling.
- **Zoom, 200% text, 320px reflow, Spanish overflow:** not observed. There are 360 `nowrap` and 80 ellipsis rules, and Spanish runs longer; tab labels, segmented controls and chips are the likely breaks.
- **Real devices:** safe areas, iOS keyboard behaviour, tablet rotation, screen sleep, installed-app scope (RA-19) and hardware-keyboard behaviour (RA-26).
- **Private data after sign-out on a shared device:** sign-out destroys the session and redirects (`src/app/login/actions.ts:66-68`). Explicit `no-store` headers are set only for kiosk and recovery routes (`next.config.ts:24-33`); `/app` relies on the framework default. Whether Back restores a private page after sign-out must be tested in Safari and Chrome. No portal idle timeout or expiry warning was found.
- **Server behaviour:** session length, lockout windows and whether the settings layout truly prevents the child page from running for a Manager.
- **The earlier reviews' CK and XP findings** (Clocker and missed pages) were never saved, so overlap with RA-3, RA-4, RA-6 and RA-13 cannot be ruled out.
- **Not opened individually:** each Settings sub-page, `/app/help`, `/app/ai-manager` and the `native/` wrapper; their matrix cells rest on shared boundaries and grep counts.
