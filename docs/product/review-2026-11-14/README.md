# NEVORA inspection and recommendations (Nov 14, 2026)

Branch `claude-codex-collab-nevora` at `ce4de4bc`, identical to `origin/claude-codex-collab-nevora` on GitHub (checked with `git fetch`). This pass inspects and recommends. It changes no app code. The only new files are this folder.

**Update, Nov 15:** fix round 1 is built and waits for review, uncommitted. Start with [fixes/README.md](fixes/README.md).

Read this page first. The findings for each of the seven review areas are in [findings-by-category.md](findings-by-category.md). Six full specialist reports are in [appendix/](appendix/). Thirty-seven screenshots are in [evidence/](evidence/).

## The short version

1. **The core product works and looks good.** I signed in as Owner, Manager, Lead and Employee on a local copy and used the kiosk end to end. Home, Schedule, Timecards, Time corrections, the Employee app, sign-in and the Clocker are clear, calm and consistent. Nothing overflowed at 320, 390, 900 or 1440 pixels.
2. **What blocks a release depends on which switches you turn on.** Scheduling and time tracking are close. Payroll, trial and billing, and self-service signup each carry their own blockers (table below).
3. **Payroll does more than you intend, and says more than it does.** The code calculates Puerto Rico tax withholding, net pay and year to date under a provisional policy no accountant has validated. The pay statement PDF says "Paid on" and "sent to the government for you". NEVORA knows neither.
4. **A new customer cannot get through the front door alone.** Velani sends every trial request to a contact form. NEVORA has no signup, verification, workspace or Owner activation screens. The backend for all of it exists and is off.
5. **Invitations fail on a default deployment.** Email delivery is off by default, the Owner still sees "Send invitation", and employees have no other way to get a sign-in.
6. **Spanish stops at sign-in.** Sign-in, the kiosk, billing and pay statement PDFs are bilingual. Every screen after sign-in is English.
7. **The premium plan from Nov 11 has not started in code.** I spot-checked 59 of its findings: 56 are still present, 3 need a rendered check, none are fixed. The plan is still the right plan. It needs three additions (below).
8. **Nothing records server errors.** If a punch, an approval or a payroll step fails in production, nobody can look up what happened.

## What I ran, and what I only read

Every finding carries one of these tags.

| Tag | Meaning | Covers |
|---|---|---|
| **[B]** | Seen in a running browser | Real sign-in through `/login` as four roles, plus tablet enrolment, PIN and punches at the kiosk. About 1,000 screenshots at 320, 390, 900 and 1440 px, English and Spanish, with keyboard focus, offline and error states. |
| **[C]** | Read in code | File and line given. Not executed by me. |
| **[R]** | Research | Source link given. Vendor claims are labelled as vendor claims. |
| **[U]** | Could not verify | Stated in each category and in the appendices. |

How the browser run worked: the repository's own test harness started the app from this commit against a throwaway Postgres 16 on this Mac, seeded by the repo's fixtures with fictional people (Northside Café, 12 staff). The harness swaps the Neon database driver for a local one. That is the repo's approved test substitution, and it is the only difference from the shipped code. Payroll was switched on. Trial and billing, the Owner AI advisor, passkeys and mobile access were off, so I did not exercise those in a browser. Punches were on for the kiosk runs only. No email, SMS, push or Stripe call left the machine.

So [B] means "this screen behaved this way with real sign-in and a real local database of fictional data". It does not prove hosted behaviour, real email delivery or real payments. Signup, billing recovery and trial expiry are [C] only.

I did not run the unit test suite or a production build. The Nov 11 README reports 2,862 passing tests; I did not re-check that number.

Two things the capture tool caused, which are not product defects: two `403` console lines on Notifications (the tool's own extra request), and the bottom tab bar drawn across the middle of full-page phone screenshots.

## Release blockers, by switch

Severity is "blocker" only for the release that turns that switch on. Development is the acceptance release; promoting to main needs your approval.

| Gate | ID | Blocker | Evidence | Fix | Effort | Owner | Existing work |
|---|---|---|---|---|---|---|---|
| **Any customer release** | AR-1 | The web app has no server error log. No `src/instrumentation.ts`; 54 bare `catch {}` blocks in API routes; one log call in all of `src/app` and `src/lib`. | [C] `src/instrumentation-client.ts:1-7` | Add `instrumentation.ts` with `onRequestError`, one structured logger, and a short reference on error screens. | M | Codex | Known and open since Oct 21 (`FIXED-AND-REMAINING.md` Backend #3) |
| | JR-5 | "Send invitation" shows when email delivery is off (the default). It fails with "Invitation email is unavailable. Refresh current information before trying again." Staff then have no way to get a sign-in. | [C] `src/lib/auth/invitations/service.server.ts:127,155`; `.env.example:79` | Configure delivery in each environment. Report delivery status to the screen and disable the button with a plain reason. | S | Codex + Claude | New |
| | AR-8 | Seven deployment flags decide which features exist. Punches and payroll are off by default. `.env.example` omits six of the flags. The only flag table is stale. | [C] `.env.example:50,75-79`; `src/lib/payroll/service.ts:571-573` | One typed flag module and one checked table of values per environment in the release handoff. | S to M | Codex | Partly (Oct 30 handoff table) |
| **Payroll on for a customer** | PY-2 | Pay statement PDFs state payment and tax remittance as fact: "Paid on", "You take home", "Taken from your pay and sent to the government for you." | [C] `src/lib/payroll/native/paystub-document.ts:479-503` | Reword and issue as a new template version. Wording in the payroll appendix. | S to M | Codex + Claude, your approval, counsel | Open item in the Nov 2 statement handoff |
| | PY-1 | The engine calculates PR income tax withholding, FICA, SINOT, employer contributions, net and year to date under an "Owner-authorized provisional policy" that says it "does not ... authorize production". | [C] `src/lib/payroll/native/calculate.ts:117-141`; `docs/payroll/owner-provisional-policy-20261014.md:3` | Decide: gross-only statements, taxes shown as estimates, or CPA validation before release. | L | You, CPA, counsel, Codex | Flagged Oct 20, undecided |
| | PY-6 | Payroll refuses any payday outside 2026 and shows the raw code `RULESET_NOT_APPLICABLE`. With a Friday payday, the first 2027 payday is Jan 1. | [C] `src/lib/payroll/native/calculate.ts:45` | 2027 rules (same validation question as PY-1) and a plain message with notice. | M to L | Codex + Claude | Flagged Oct 21, not fixed |
| | PY-3, PY-4, PY-7 | Nothing after "Payroll approved" tells the Owner to pay people and send taxes. Approving shares statements with staff at once, while the screen says "Approve payroll, then share pay statements". Employees see "Next payday Fri, Nov 20" with no line saying who pays. | [B] phone Payroll, Employee Home and Pay; [C] `src/lib/payroll/worker.ts:121-122` | A "What's next" card after approval, the truth about sharing at the Approve step, and "Scheduled payday. Your employer pays you." on Employee screens. | S | Claude, your approval | Recommended Nov 1, not built |
| | AR-4 | A blocked payroll sends the Owner to Time exports, where the fix sits in the last collapsed section under "Reload population", "Period disposition", "Exclude with audited reason". | [C] `src/components/payroll/payroll-runs.tsx:485-487`; `src/components/payroll-period-close.tsx:154-166` | Give it its own Payroll step, "Who's in this payroll", in plain words. | M | Claude | Routing gap is new |
| **Trial and billing on** | JR-2 | "Open billing in Velani" has no working destination. Velani ships with no billing API address; NEVORA's own billing page resolves an API only in local or staging mode. | [C] `src/app/api/commerce/handoff/route.ts:41-57`; Velani `scripts/build.mjs:67` | Pick one billing page, configure its API origin, test it end to end against the Stripe sandbox. | M | You, Codex, Claude | Partly (Nov 13 billing entry plan) |
| | JR-3 | No trial countdown, payment-failed notice or reminder email. The first signal is a lockout that also blocks new clock-ins. | [C] trial text exists only in `src/components/commerce-recovery/` | Owner Home banner from day 23 and during grace, plus reminder emails. | M | Codex + Claude | Named as future policy only |
| | JR-4, UI-2 | No menu entry leads to billing. The billing pages use a retired look: beige canvas, system font, the word "NEVORA" in place of the wordmark. | [B] Settings has no billing row; `/pages/plans` screenshot | Add "Plan and billing" to Settings. Rebuild the billing pages on the sign-in frame. | S + M | Claude | README lists the pages; no phase owns them |
| **Self-service signup open** | JR-1 | No screens for signup, email verification, workspace creation, provisioning or Owner activation. The verification email links to `/onboarding/verify`, which does not exist. | [C] `src/lib/onboarding/verification-delivery.server.ts:15`; no `/onboarding/*` page | Build the five screens in English and Spanish against the existing API. | L | Claude, your go or no-go | Stated as a requirement Nov 9, not built |
| | AR-2 | After first sign-in the Owner gets a two-step setup card about scheduling only. Team, Clocker tablet, PINs and pay schedule are left to discovery. | [B] new-workspace Home; [C] `src/components/owner-setup-card.tsx:51-55` | One "Get set up" list on Home that links to each existing page. | M to L | Claude | Roster import is planned; the rest is not |
| **Spanish promised at launch** | RA-1, RA-2 | The signed-in app is English only, with no dictionary and no stored language per person. | [B] Spanish sign-in lands on English Home; Profile says "Sign-in pages only. The rest of NEVORA is in English for now." | Decide scope and order, employees first. Build one dictionary and one format module before translating. | L (the Oct 21 estimate of 8 to 11 weeks still holds) | You, then Claude + Codex | Known, undecided |

## Decisions only you can make

1. **Payroll scope.** Keep tax withholding and net pay in the product, show them as estimates, or cut back to gross pay. This decides PY-1, PY-2, PY-6 and PY-8.
2. **The word "Payroll".** Keep the name with a standing line ("Calculate pay and share statements. You pay your team outside NEVORA.") or rename it. Payroll copy is locked, so each wording change needs your sign-off, and counsel should read the tax lines.
3. **The front door.** Stay with assisted setup (contact form, then an operator creates the workplace) for the first customers, or build self-service now. The backend is ready either way.
4. **One billing page.** Velani's or NEVORA's. Two exist and they behave differently.
5. **Prices.** Velani shows $19 and $29 and a 30-day no-card trial. The backend calls these proposed. The repo once suggested $39 and $79. Homebase charges $30 and $70 per location; 7shifts about $40 and $80; several rivals are free up to 10 or 15 staff.
6. **Spanish.** When, and whether employees go first.
7. **Employees without email.** Today they can never sign in. Require email, or add an Owner-handed activation code.
8. **Location-scoped Managers.** In the release or hidden. Today that role gets an older interface and cannot publish, approve hours or decide time off.
9. **Status colours.** Green for done and amber for waiting everywhere, or keep teal for done in the Employee app. The documents disagree and so does the code.
10. **One design source of truth.** `DESIGN.MD` says Direction B, Inter, bold icons and a teal band. `TEAM-RULES.md` still says Signature, system font, regular icons and a deep band. The billing pages were built to the wrong one.

## The journey today

| Step | Status | On by default? | Where a customer gets stuck |
|---|---|---|---|
| Discovery (Velani) | Implemented, static pages | Yes | "Request a free trial" is a contact form with no status afterwards. |
| Signup | Backend only | No | No screen. |
| Email verification | Backend only | No | The emailed link opens a missing page. A used or expired link returns a bare "invalid". |
| Company setup | Operator script and in-app Settings work; the wizard is backend only | Settings yes | No guided path. The trial clock starts before the Owner can sign in. |
| Owner sign-in | Implemented | Yes | Sign-in uses an Employee ID that no email contains. A wrong password clears both fields. |
| Invite and activate staff | Implemented one at a time; bulk import is backend only | Screens yes, email no | See JR-5. An invalid link shows the same screen as no link. |
| Scheduling | Implemented | Yes | Team availability has no menu entry for an Owner. |
| Clock in, breaks, clock out | Implemented, kiosk only | No (flag and PIN key) | PIN only; the approved Employee ID step is not built. Lockout says "about five minutes" and blames the tablet. |
| Corrections and approval | Implemented | Yes | "Approve" and "Finalize" name one step in different places. Nothing leads from finished timecards to Payroll. |
| Pay calculation and statements | Implemented | No (flag) | See the payroll gate. |
| Trial expiry | Gate implemented | No (flag) | No warning before lockout. |
| Subscription and billing recovery | Incomplete integration | No | See JR-2. The page never says why access is paused. |

Full trace with file references: [appendix/customer-journey.md](appendix/customer-journey.md).

## How this relates to work already done

- **Nov 10 review** (329 findings): 298 fixed, 25 partly, 6 open, per its `status.json`.
- **Nov 11 premium review** (about 170 findings, `PLAN.md` with eight phases): not started in code. Step 0 is partly done; there is no `status.json`, and the Clocker and missed-pages reviews were never saved.
- **This pass adds** what those reviews did not cover: the payroll scope and wording, the customer journey and its switches, invitations, error logging, market fit, and a measured count of the CSS and component families.
- **Three additions to the Nov 11 plan:** (1) settle the design source of truth before Phase 1; (2) name the pages still on older markup in Phase 3 (eleven Settings pages, Insights, Scheduling rules, Week templates, Payroll settings, Update compose and detail) and give the billing pages an owner; (3) add a lint and a count budget so Phase 1 holds.

## Files

| File | Contents |
|---|---|
| [findings-by-category.md](findings-by-category.md) | All findings for the seven review areas, with near-term improvements and future features separated |
| [appendix/architecture-and-navigation.md](appendix/architecture-and-navigation.md) | Route inventory, navigation per role, 26 findings |
| [appendix/customer-journey.md](appendix/customer-journey.md) | Step-by-step trace across Velani and NEVORA, 31 findings |
| [appendix/market-research.md](appendix/market-research.md) | Homebase, Gusto, ADP and six others; Puerto Rico rules; 66 sources |
| [appendix/payroll-scope-and-language.md](appendix/payroll-scope-and-language.md) | What the payroll code does, a string-by-string language table, 21 findings |
| [appendix/roles-languages-accessibility.md](appendix/roles-languages-accessibility.md) | Language coverage, state matrix per role, 30 findings |
| [appendix/ui-system-audit.md](appendix/ui-system-audit.md) | Nov 11 plan status, measured CSS and component counts, document contradictions, 25 findings |
| [evidence/](evidence/) | 37 screenshots cited in the findings |
| [fixes/](fixes/README.md) | Fix round 1: what changed, how it was checked, ten per-area reports, 15 after screenshots |

The appendices are code reading or research. Each one says so at the top and lists what it could not verify.

## Re-running the captures on this Mac

The harness in `tools/ui-scan/` expects a Linux container. On this Mac it ran with three changes, none of them in the repository:

1. Postgres 16 binaries from the npm package `@embedded-postgres/darwin-arm64@16.15.0-beta.19`, installed in a scratch folder, passed as `NEVORA_TEST_PG_BIN`.
2. Playwright from `tools/ci-browser-runtime` (`npm ci --prefix tools/ci-browser-runtime`), passed with `NODE_PATH`.
3. The archive `tools/ui-scan/zz-scan.tar.gz` unpacked at the repository root for the run and removed afterwards, calling `node zz-scan/pg-runner.mjs vitest.zz-scan.config.mts` directly in place of `desk.sh`.

I added the billing pages to the public-page list, a language cookie option, and selectors that work on the Spanish sign-in page. Those edits lived in the unpacked copy and are gone. `node_modules` and `tools/ci-browser-runtime/node_modules` remain on disk; git ignores both.

Nothing in this folder is committed. Fix round 1 changes application files too; those are also uncommitted.
