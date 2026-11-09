# Codex: finish NEVORA Release 1 on `claude-codex-collab-nevora`

From Jose (via Claude), 2026-10-29. This is the first official NEVORA release. Do one complete finishing pass on the
shared branch, then hand it to Claude for inspection. Do not deploy.

## 1. Release 1 scope

**In scope (must be complete):**
1. **Clocker:** the location tablet app (`/clocker/[location]`), plus Owner tablet enrollment, PINs, photo review
   and Clocker recovery.
2. **Owner, mobile and desktop:** every Owner page in the real app, at phone, tablet and desktop widths.
3. **Employee, mobile:** every Employee page, including Access and sign-in, account deletion, Pay and PDFs,
   Updates, requests, availability, hours and calendar.

**Out of scope (future updates): Lead and Manager.** Build nothing new for them. They share code with Employee and
Owner, so keep their existing pages working and their tests passing. No regressions. Do not remove their code. If
release safety needs their entry points hidden or disabled, propose it; Jose decides.

**Also out:** Spanish (a later release), real notification/email/SMS/payment providers, and production
deployment.

## 2. Branch and starting point

- Three branches only: `development`, `main`, `claude-codex-collab-nevora`. Work only on
  `claude-codex-collab-nevora`. Create no branches; use detached worktrees for isolation.
- **Starting point:** the collab head after Claude publishes the Employee Phase 2 assembly (head `2f87e038`,
  merge `99e1dbe5` = Phase 2 `4a68e5c8` + collab `0f375dd7`). Confirm the head contains `2f87e038` before you start.
  If it doesn't, stop and tell Jose.
- Push to collab only. No merge into `development` or `main`, no deploy, no production database or production
  migrations.
- Delete the stray remote branch `claude/employee-mobile-phase2-20261027` only after Jose's explicit OK.

## 3. Read first (local paths on this Mac)

- Design bar:
  - `DESIGN.MD`, `.21st/DESIGN.md`, `CLAUDE.md`;
  - the approved corporate look (ADP/Gusto/Homebase): mockups in `docs/product/specs/corporate-mockups/`
    (`DESIGN-SPEC.md`, `project/*.dc.html`, and boards 1–5; board 6 is Lead/Manager, so only its sign-in part
    applies).
- Jose's UI rules:
  - Phosphor icons only;
  - one type scale;
  - exact spacing;
  - equal sizes for like controls;
  - every element has a purpose;
  - calm;
  - Apple-smooth;
  - don't overwhelm: one primary action and at most three cards per screen, no Approve buttons in lists, and
    crowded screens split into more pages;
  - the real NEVORA wordmark with "Workforce" centred under it, and no flame icon.
- Business rules review (Claude Doc, decisions per row): https://claude.ai/artifact/1MMX8cYVDsKgSgqLdKKAYU.
  Jose's answers there are binding. Any blocking rule still unanswered: stop and ask.
- Payroll decisions (2026-10-25):
  - overnight shifts count on their start day;
  - meal warnings only (no penalty pay);
  - plain payroll setup with an automatic audit trail.
- Employee Phase 2 records in `docs/execution/employee-mobile-phase2/`: `CLAUDE-ASSEMBLY-2026-10-28.md`,
  `REMAINING-WORK.md`, `CHECKLIST.md`, `STATUS.md`, `evidence/`.
- PR34 reconciliation, read-only: `.claude/worktrees/pr34-reconcile/docs/handoffs/2026-10-27-pr34-reconciliation/`
  (README, BATCHES, FOLLOW-UPS, HANDOFF-CODEX). Port fixes in batches; do not merge PR34 whole.
- Owner desktop verified prototype, used as the behaviour spec for Home, navigation, search, the AI manager and
  account: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/owner-desktop/`
  (`owner-desktop-final-review.md`, `group-14…16-*-review.md`) and `work/owner-desktop/`. It's fictional and
  in-memory, so build it against the real server and data; don't copy it.
- Release register: `docs/execution/final-release-checklist.md` (FR-AUTH-001 and the rest).

## 4. Decisions for this release

Recommended answers. Treat them as confirmed only once Jose confirms them in his reply.

1. Phone clock-in stays unavailable in Release 1: clock-in on location tablets only. The Owner option comes later.
2. Account deletion: re-check the password at the final confirm step (Deletion CR-4).
3. Account deletion: add the line "Changed your mind? Contact support before the request is processed."
4. Support identity check before withdrawing a deletion request: a verified reply from the account's email plus
   the Employee ID, written into `docs/compliance/account-deletion-runbook.md`.
5. QA-OWN-3 leftovers are accepted for Release 1; a server-side guard is tracked as a follow-up.
6. Owner desktop:
   - a window blur clears an unsaved edit to the Owner's own details, with a message;
   - Home names scheduled people but shows no profile links while the Team read is unavailable;
   - Inbox keeps coverage first.
7. Logo (Jose to confirm):
   - His Oct 26 rule is the NEVORA wordmark with "Workforce" centred under it.
   - The app header currently shows the wordmark over the company name.
   - Access shows the wordmark alone, which matches the approved Oct 27 Access mock.
   - Recommended: the wordmark plus "Workforce" on Access, and the company name in the in-app header.
8. Still open, so ask Jose if they aren't answered in the review doc:
   - "Publish changes" for edits to a published week;
   - the 40 h cap and manual-scheduling warnings;
   - "No target";
   - the Owner look.

## 5. Work list

### A. Clocker
- Fix the Clocker SQL coverage allocation (it lists 35 of 42 files), which causes the 7 default-suite failures.
- FR-AUTH-001 verification:
  - the 46 expiry/control cases and the 14 Phase B/C reconciliation cases;
  - tablet recovery;
  - receipt scoping;
  - break snapshots;
  - a hosted Preview against an isolated, non-production database with fictional data.
- Bring the tablet UI to the approved look in landscape and portrait: PIN entry, success, errors, offline, an
  unenrolled tablet, and a photo prompt.
- No phone punch route. Clock-in stays tablet + PIN only.

### B. Owner, mobile and desktop
- Build the approved Owner corporate mockups across every Owner page:
  - Today/Home;
  - Schedule (including the grid at narrow widths);
  - Inbox;
  - Team and profiles;
  - Timecards;
  - Payroll and pay settings;
  - Exports;
  - Insights;
  - Updates and notifications;
  - Settings (company, locations, positions, devices/Clocker, PINs, branding, policies, breaks);
  - AI manager;
  - account, security, support, privacy and deletion.
- Remove every phone Clock in / Start break / Clock out control from Owner and Employee UI. The mockups show them
  wrongly.
- Match the Owner desktop prototype's verified behaviours:
  - Home counts bound to the same sources (overnight shifts included);
  - each row opening its exact record and returning focus;
  - five roots;
  - browser Back/Forward returning to the opener;
  - search with combobox semantics.
- Owner mobile: build what's missing (AI manager, account/support, navigation/search) using the same look.
- Fix the payroll Monday 00:01 workweek blocker from the PR34 reconciliation.
- Port the PR34 fixes: Safari Tab inside sheets, rem-based sizing with reflow at large text, and Schedule grid
  sideways scroll.

### C. Employee mobile (Phase 2 close-out)
- Implement decisions 2–4.
- Find and fix the WebKit flake where Home (`.q-home`) renders twice after a 390→1440 resize, with repeat-run
  proof.
- Landscape replay with full assertions for all 8 batches; fix the full-page capture helpers.
- Run the Access suite (`test:mobile-access:owned`) in WebKit and Firefox; make the CI `runner.temp` path run in
  GitHub Actions.
- Commit the results file for the 11 Employee journeys. Run the journeys on the final head.
- Close the open reviewer items with evidence:
  - Deletion UI 19–22 and CR-4/6/8;
  - Pay PAY-UI-13;
  - Communications CR-4, UI-COM-002 and UI-COM-003.
- Check Lead still passes after the More and header changes; it shares the code.
- UI fixes from Claude's inspection of `2f87e038`, 2026-10-29. Captures are in Claude's evidence; ask if you need
  them.
  1. **Must fix before the mobile Access flag is turned on:** the Home "Quick guide" is unreadable in Dark.
     - The cause is hard-coded light colours in `src/components/mobile-access/onboarding-guide.css:3,8,10`.
     - Row titles are #172622 on #0C1817, and the link contrast is about 2.98:1.
  2. Access at 844×390 landscape (touch): sign-in falls back to the old desktop form, because the card applies only
     under 768px. On Welcome, the illustration pushes the title below the fold. Apply the coarse-landscape rule
     (`max-height:500px`) as in `926439c9`.
  3. At most three cards per screen:
     - Home has 4 (5 with the Quick guide open); Pay has 4.
     - Remove or merge Home's old Clock status card. It uses 15px type and repeats Hours.
  4. Profile:
     - the "P" of the "Passkeys" heading is clipped (`overflow:hidden`, -0.38px tracking, `.em-passkeys-mobile`);
     - "Add a passkey" has a stray 1px grey inset ring.
  5. Make error and loading states consistent:
     - Pay's coral alert (`pay.tsx:127`) differs from every other page's notice;
     - Notifications reuses the Updates "unsent draft" copy (`messages.tsx:49`) and shows a disabled "Try again"
       while loading instead of "Checking…";
     - Hours and Time off say "unsent entries are kept" when nothing has been typed (`hours-frame.tsx:15`,
       `planning-frame.tsx:13`).
  6. Type scale: use only 32/19/16/14/12, plus 22 for shift times.
     - Remove the stray 15px (Home clock card, Profile work-detail values, "What changed in your schedule").
     - Back links are 17/620 (`.em-request-back`).
     - Reduce the eight font weights in use.
  7. Header rule: the brand header and bell should be either on every page or a defined set of pages.
     - Time off, Open shifts, Availability, Hours and Timecards show them.
     - Notifications, Updates, Profile, Alerts and Delete don't.
     - Updates says "‹ Home" while the More tab is lit.
  8. Loose elements:
     - Open shifts stacks three bare teal links; give them row structure.
     - "Quick guide" floats alone above "Your shift".
  9. Not yet inspected; check them too:
     - 200% text;
     - the swap, cover and time-off form and detail pages, and the Calendar disclosure;
     - deletion after submission;
     - Pay with no statements;
     - Employee pages in Firefox.

### D. Release readiness (prepare, don't run in production)
- A migration plan for 0038–0042 plus PR34's 0038/0039 (numbers overlap; the files are independent), in exact
  order, rehearsed on a disposable database. 0042 is required for invitations.
- An ops checklist: support mailbox, deletion runbook, identity check, Clocker tablet setup guide.

## 6. How to work

- Failing test first, then the fix. Keep RED and GREEN logs, and keep failed attempts in the record.
- Never weaken an assertion. If an inherited test has to change, keep a before-copy and write down the reason.
- Fictional local data only. No production credentials, real notifications, real payments or real payroll.
- Three engines (Chromium, WebKit, Firefox). Widths:
  - phone: 320, 390 and landscape 844×390;
  - tablet: 768 and 1024, plus the Clocker tablet in both orientations;
  - desktop: 1280 and 1440.
  - Light and Dark at every width.
- Use viewport captures only; full-page captures drop touch.
- Accessibility at every width:
  - keyboard and focus;
  - 44 px targets;
  - 200% text;
  - reduced motion.
- Commit in small, named batches on collab. Each batch should keep the default suite green.

## 7. Definition of done

- Default suite and every owned suite at **0 failures** on one final collab SHA, in three engines.
- All 11 Employee journeys pass, plus Owner journeys, and Clocker journeys for enroll, clock in, break, clock out,
  recovery and an expired PIN.
- `npm run build` (production build) passes.
- FR-AUTH-001 evidence is complete.
- No phone clock-in UI anywhere.
- Lead and Manager tests still green.
- Every in-scope page matches its approved mockup, with captures at all widths and both themes.

## 8. Hand back to Claude

Write `docs/handoffs/<date>-codex-to-claude-release-1-finish.md` with:

- the final collab SHA;
- every command and its result count;
- evidence paths;
- the decisions applied;
- anything still open, with an owner.

Then tell Jose. Claude will then run an independent inspection: a business analyst and a UI analyst across
Clocker, Owner (mobile and desktop) and Employee mobile. Claude will reply with a verdict and a fix list. After
that come Jose's real-device pass, then Jose's go, then you run the release migrations and deploy.
