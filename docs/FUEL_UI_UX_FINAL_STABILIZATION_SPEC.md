# Fuel Scheduler — Final UI/UX Stabilization Specification

**Status:** Phase 1 — Approved Master Specification  
**Working branch:** `dash-refine`  
**Protected branch:** `development` — DO NOT MODIFY OR MERGE UNTIL FINAL USER APPROVAL  
**Product:** Fuel Coffee Drive Scheduler  
**Primary goal:** Finish the current redesign as a polished, production-ready application across desktop, tablet, iPhone, and Android without visual inconsistency, broken responsive behavior, fake controls, accidental zooming, overflow, lag, crooked alignment, or role-specific regressions.

---

## 1. Non-Negotiable Quality Standard

The redesign is not complete because it "works" or because a desktop screenshot looks good.

A screen is complete only when it:

- looks intentionally designed at its target viewport;
- feels like the same Fuel product as every other screen;
- is aligned, balanced, and visually clean;
- has correct capitalization and copy hierarchy;
- has no horizontal overflow, white edges, clipped controls, or accidental scrolling;
- does not zoom unexpectedly when focusing inputs on iPhone/Safari;
- does not hide content behind sticky UI, browser chrome, or the mobile navigation;
- is responsive by design rather than by shrinking the desktop layout;
- has no fake buttons, fake filters, dead links, or misleading controls;
- has correct loading, empty, populated, success, warning, error, and disabled states;
- works for the allowed role(s);
- remains usable with long names, many employees, many shifts, long labels, and realistic data;
- is performant and does not feel laggy or janky;
- passes build, typecheck, lint, and tests before merge.

**Visual defects count as bugs.** If a component is technically functional but looks crooked, crowded, oversized, undersized, inconsistent, awkward, unfinished, or visually broken, it is not finished.

---

## 2. Branch and Change-Control Rules

1. All Phase 2–6 work stays on `dash-refine`.
2. Do not modify `development`, `main`, or production.
3. Do not merge without explicit user approval after final review.
4. Preserve current business logic unless a functional defect is identified.
5. Do not redesign approved pages into a different visual direction.
6. Reuse the established Fuel design system instead of introducing new styles page by page.
7. If a control cannot be made functional during this pass, remove or clearly disable it rather than leaving fake UI.
8. Do not add unrelated product features during stabilization.
9. Do not add "Reports" or other navigation items merely because they appeared in a concept image.
10. Avoid introducing a large dependency unless it has a clear testing or production benefit.

---

## 3. Product Visual Direction

The application must continue the approved Fuel Coffee Drive visual system:

- dark coffee sidebar on desktop;
- warm ivory / cream application canvas;
- restrained caramel accents;
- dark coffee primary actions;
- premium but practical operational cards;
- subtle borders and shadows;
- rounded geometry without excessive "bubble" styling;
- custom line-icon language;
- coffee imagery used selectively;
- cinematic/brand artwork primarily in hero and brand-support areas;
- strong information hierarchy;
- clean whitespace without large dead areas;
- minimal nested borders;
- no cheap gradients, excessive decoration, or generic SaaS-card overload.

The Dashboard may remain the most branded screen. Operational pages should be cleaner and more task-focused.

---

## 4. Capitalization and Copy System

This is a mandatory repo-wide audit.

### 4.1 Eyebrows and micro section labels

Use **ALL CAPS** for short category/eyebrow labels.

Examples:

- `TEAM`
- `OWNER CONTROLS`
- `SCHEDULING RULES`
- `WEEKLY SCHEDULE`
- `REQUEST OVERVIEW`

Use restrained letter spacing. These should never overpower the page title.

### 4.2 Page titles

Use **Title Case**.

Correct:
- `Add Employee`
- `Shift Exchange`
- `Schedule Health Rules`
- `Time Off`
- `Weekly Schedule`

Avoid inconsistent sentence case such as `Add employee` when the rest of the product uses Title Case.

### 4.3 Section titles and card titles

Use **Title Case**.

Examples:
- `Employee Information`
- `Role & Assignment`
- `Account Activation`
- `Request Overview`
- `How It Works`
- `Employee Weekly Targets`

### 4.4 Navigation

Use consistent **Title Case**:

- Dashboard
- Schedule
- Availability
- Time Off
- Shift Exchange
- Employees
- Templates
- Scheduling Rules
- Settings

Mobile may use deliberately shortened labels where space requires it:
- Dashboard → Home
- Shift Exchange → Shifts
- My Schedule → Schedule

Do not allow accidental wrapping or inconsistent capitalization.

### 4.5 Buttons and primary actions

Use **Title Case**.

Examples:
- `Add Employee`
- `Create Employee`
- `Manage Locations`
- `Manage Access`
- `Manage Rules`
- `Save Availability`
- `Back to Schedule`
- `Generate ID`
- `Submit Request`

### 4.6 Descriptions, helper text, errors, and body copy

Use normal **sentence case**.

### 4.7 Table column labels

Use short **ALL CAPS** or the approved compact uppercase table style consistently across the product. Do not mix uppercase on one table with sentence/title case on another without reason.

### 4.8 Status chips

Use consistent concise status text and casing across screens:
- Pending
- Approved
- Denied
- Published
- Draft
- Available
- Unavailable

Do not create duplicate terms for the same state.

### 4.9 Locations and brand text

Location naming must remain exact and consistent everywhere. Use the same canonical display string returned by the data model, e.g. `FUEL - 2`, `FUEL - 110`.

Brand phrases must remain consistent:
- `Fuel Coffee Drive`
- `People Fuel Possibility.`

---

## 5. Core Design Tokens

Phase 2 should consolidate repeated values into a maintainable token system.

### 5.1 Color roles

Use existing Fuel variables as the base:

- Canvas: warm ivory
- Surface: off-white / cream
- Surface Strong: white
- Ink: deep brown/near-black
- Muted: warm gray-brown
- Line: warm neutral border
- Coffee: primary action brown
- Coffee Dark: sidebar / strong action
- Caramel: restrained accent
- Green: success
- Amber: warning
- Blue: informational only where useful
- Red: destructive/error only

Remove random one-off colors that do not have a semantic role.

### 5.2 Typography

Use the current system font stack for operational UI.

Recommended hierarchy:

- Hero/Page Title desktop: ~38–46px depending on page
- Hero/Page Title mobile: ~30–34px
- Section H2: ~20–26px
- Card H3: ~15–18px
- Body desktop: ~13–15px
- Helper/meta: ~10–12px
- Button: ~12–14px
- Eyebrow: ~10–11px

Do not use tiny text simply to make a layout fit.

All input/select/textarea text that can receive focus on mobile must render at **16px minimum** to prevent iOS Safari input auto-zoom.

### 5.3 Spacing

Normalize a shared spacing scale such as:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48

Avoid arbitrary one-off gaps unless the design requires them.

### 5.4 Radius

Standardize:
- Compact control: ~9–12px
- Cards/panels: ~14–18px
- Hero/large surface: ~18–22px
- Pills/avatars: full radius

Do not mix many unrelated radii.

### 5.5 Shadows

Keep shadows subtle and warm. Reduce expensive or heavy shadows on mobile. Avoid every card having a large shadow.

### 5.6 Borders

Use thin warm-neutral borders. Avoid deeply nested bordered containers.

---

## 6. Button System

All buttons must be audited across desktop and mobile.

### Primary

- dark coffee filled;
- white text;
- clear hover, active, focus, disabled, and loading states;
- no excessive gradient;
- consistent height and padding.

### Secondary

- cream/white surface;
- neutral border;
- dark text.

### Ghost

- transparent or very light;
- only for lower-priority actions.

### Destructive

- restrained red text/border;
- never visually confused with a primary action;
- confirmation required when destructive.

### Compact action

- only when space is constrained;
- touch target still remains large enough on mobile.

### Minimum touch target

Interactive controls should target approximately **44×44 CSS pixels** where practical on touch devices, even if the visible icon is smaller.

### Button rules

- Icons aligned optically with text.
- No button text wrapping unintentionally.
- No stretched full-width desktop buttons unless appropriate.
- Mobile full-width actions should be intentional.
- Loading buttons must not jump in width.
- Disabled buttons need visible but readable disabled styling.

---

## 7. Icon System

Continue using `NavIcon` / the established line-icon language.

Audit:

- stroke weight consistency;
- icon bounding-box alignment;
- icon size;
- circular icon backgrounds;
- text/icon spacing;
- optical vertical centering;
- duplicate icon meanings;
- unnecessary decorative icons.

Do not introduce emoji or mismatched third-party icon styles into the polished UI.

---

## 8. Imagery and Artwork

1. Hero art must never crop important copy or key visual focal points.
2. Desktop and mobile may use different `background-position` rules.
3. Avoid placing text over visually busy areas.
4. Do not stretch raster imagery.
5. SVG art should remain lightweight.
6. Avoid decorative artwork on every single section.
7. Brand art must never make operational content harder to scan.
8. Mobile should reduce or hide decorative imagery when it harms readability or performance.
9. Verify artwork in light/dark browser rendering and on high-DPI devices.

---

## 9. Desktop Layout Standard

Desktop should be treated as its own intentional layout.

### General

- Sidebar remains stable and visually balanced.
- Main content should use a controlled max width.
- Wide screens should not create giant empty canvases.
- Side rails should only appear when they provide useful context.
- Tables should use available width intelligently.
- Heroes should be shallow enough to preserve task density.
- Sticky save bars should not obscure content.
- Page bottoms should have deliberate spacing.

### Sidebar

Audit:
- logo and brand alignment;
- nav icon/text alignment;
- active indicator;
- hover/focus state;
- employee profile area;
- sign-out action;
- mantra;
- long user names;
- all role nav sets;
- viewport heights where items could collide.

---

## 10. Mobile and Tablet Standard — Priority #1

Mobile is not a reduced desktop view. It is an independently designed experience.

### Required viewport audit

At minimum test:

- 320px
- 360px
- 375px
- 390px
- 393px
- 414px
- 430px
- 768px
- 820px / common tablet portrait
- 1024px / tablet landscape
- 1280px
- 1440px+
- at least one large desktop width

Also test portrait and relevant landscape cases.

### 10.1 No horizontal overflow

There must be zero unintended:
- sideways page scrolling;
- white strips;
- clipped cards;
- buttons outside containers;
- table overflow into page chrome;
- sticky elements wider than viewport.

Use `min-width: 0`, wrapping, responsive grids, and purposeful mobile views rather than hiding bugs with `overflow-x: hidden`.

### 10.2 No unwanted input zoom

Do not disable user accessibility zoom globally.

Instead:
- input/select/textarea/search/date/time/phone controls must use at least 16px rendered font size on touch/mobile Safari;
- verify focus does not zoom the viewport;
- closing the keyboard restores layout correctly.

### 10.3 Safe areas

Use safe-area insets where necessary:
- bottom navigation;
- sticky action bars;
- top header on notched devices.

Content must remain reachable above:
- iPhone Home indicator;
- Safari bottom chrome;
- Android navigation UI.

### 10.4 Mobile navigation bar

The mobile nav is a critical component and receives its own QA pass.

Required:
- no label collisions;
- no wrapping;
- no clipped active state;
- consistent spacing;
- stable icon/label alignment if icons are added;
- correct active route detection for nested pages;
- enough bottom padding on every page;
- appropriate safe-area spacing;
- no overlap with sticky save bars;
- no viewport-width overflow at 320px.

If five destinations are too crowded, use a deliberate compact design rather than shrinking text below a readable size.

### 10.5 Mobile header

Audit:
- logo;
- Fuel Scheduler label;
- role chip;
- height;
- sticky behavior;
- blur performance;
- safe-area/top browser interactions;
- long role/name edge cases.

### 10.6 Keyboard behavior

For every form:
- focused field stays visible;
- viewport does not jump horizontally;
- keyboard does not permanently alter layout;
- sticky bars do not cover the focused field;
- submit action remains reachable;
- switching between fields is stable.

### 10.7 Sticky controls

Availability, Add Employee, Scheduling Rules, and future sticky actions must calculate bottom spacing relative to the mobile nav.

Do not hard-code a bottom offset that works only on one iPhone.

### 10.8 Tables

Do not squeeze desktop tables until unreadable.

On mobile:
- convert to purpose-built cards/rows where appropriate;
- retain the most important information;
- expose secondary information in a clean second line or expandable area;
- keep actions reachable.

### 10.9 Tap behavior

Avoid tiny chevrons, overflow buttons, toggles, and checkboxes. Increase hit areas without necessarily increasing visible icon size.

---

## 11. Responsive Breakpoint Strategy

Replace scattered ad-hoc responsive rules with a coherent strategy.

Suggested functional zones:

- Small phone: <= 359px
- Standard phone: 360–430px
- Large phone / small tablet: 431–767px
- Tablet: 768–1024px
- Compact desktop: 1025–1279px
- Desktop: 1280px+
- Wide desktop: 1440px+

These are design zones, not a requirement to create six separate media queries for every component.

Use component/container behavior where practical and global breakpoints where the app shell changes.

---

## 12. Forms and Input Controls

Audit every form control.

### Required

- consistent label style;
- required markers;
- optional labels;
- helper text;
- focus ring;
- error message;
- success state where relevant;
- disabled state;
- valid mobile font size;
- consistent height;
- consistent radius;
- phone formatting;
- date/time controls;
- select behavior;
- textarea resizing;
- autocomplete;
- keyboard type/input mode when useful.

### Validation

Prefer field-level validation for specific errors.

Use page-level banners for:
- permission errors;
- save/network failures;
- multi-field failures that cannot be attached to one input.

Never rely only on color to communicate an error.

---

## 13. Feedback and State System

Standardize:

### Toast or lightweight confirmation
Use for transient actions:
- Availability Saved
- Employee Created
- Settings Updated
- Shift Offered
- Request Submitted

### Inline/page feedback
Use for persistent or contextual messages.

### Loading
Add skeletons or reserved loading states to avoid layout shift for:
- Dashboard metrics/cards
- Schedule data
- employee list
- request lists
- settings summaries where needed

### Empty states
Every list/table/workspace must have:
- clear title;
- short explanation;
- useful next action when available;
- no giant blank panel.

---

## 14. Functional Integrity — No Fake UI

Any element that appears interactive must work.

Known areas to verify/fix:

### Employees
- Search must filter.
- Role filter must filter.
- Location filter must filter.
- Status filter must filter.
- View Profile must lead to a real profile/detail experience OR be removed.
- Overflow/three-dot action must work OR be removed.
- Add Employee must remain functional.

### Settings
- Manage Locations must navigate to a real location-management experience OR be removed/disabled until implemented.
- Manage Access must point to the correct real destination.
- Manage Rules must point to Scheduling Rules.

### Add Employee
- Generate ID must not rely on a random client-only value for uniqueness.
- Do not ship a fake prefilled ID such as `FC-0021`.
- Employee ID generation/validation must be backend-safe or uniqueness-checked.
- Primary location must always be included in eligible access correctly.
- Owner creation permissions must remain enforced.
- Phone number behavior must remain correct.
- Account activation copy must match real behavior.

### Schedule
- all add/edit/delete/publish/template interactions must remain real;
- no redesigned link may lose query parameters or week context.

### Availability
- presets, toggles, clear/reset, time controls, and save state must remain functional.

### Time Off
- full/partial-day behavior;
- validation;
- history;
- manager approval/denial;
- request state.

### Shift Exchange
- offer;
- trade;
- callout/coverage;
- request review;
- history;
- empty states.

---

## 15. Page-by-Page Stabilization Checklist

## 15.1 Login

Route: `/login`

Audit:
- desktop image/copy balance;
- card width;
- Employee Portal capitalization;
- Employee ID / Password labels;
- input font 16px minimum;
- autofill appearance;
- password manager behavior;
- error state;
- activated success state;
- Activate Account link;
- 320–430px layout;
- landscape;
- no keyboard zoom;
- brand artwork performance.

## 15.2 Activate Account

Route: `/activate`

Bring visually into the refined product family.

Audit:
- brand treatment;
- title capitalization;
- Employee ID;
- Phone Number;
- Create Password;
- Confirm Password;
- password requirements;
- phone formatting;
- field-level mismatch feedback if practical;
- mobile no-zoom;
- Back to Sign In;
- success redirect.

## 15.3 Dashboard

Route: `/app`

Preserve the approved premium dashboard direction.

Audit:
- hero crop;
- metric balance;
- priority/attention list;
- locations;
- current week;
- zero states;
- bottom brand card;
- long data;
- mobile card order;
- mobile density;
- loading state;
- links.

Do not overload with additional decorative widgets.

## 15.4 Weekly Schedule

Route: `/app/schedule`

Desktop:
- schedule grid alignment;
- row/column sizing;
- current-day treatment;
- weekend treatment;
- shift readability;
- total hours;
- template/add-shift actions;
- no unnecessary horizontal page overflow.

Mobile:
- dedicated day-card/day-workspace layout;
- no squeezed desktop grid;
- clear employee/date/time/location hierarchy;
- easy edit/add actions;
- week navigation;
- no collision with mobile nav.

Test:
- no shifts;
- many shifts;
- overlapping/conflict states;
- long employee names;
- publish status.

## 15.5 Availability

Route: `/app/availability`

Audit:
- hero;
- quick setup;
- weekdays/weekend grouping;
- availability toggles;
- time fields;
- duration labels;
- clear/reset;
- dirty/saved state;
- sticky save bar;
- keyboard;
- iOS time controls;
- Android time controls;
- no input zoom;
- mobile nav collision.

## 15.6 Time Off

Route: `/app/requests`

Audit:
- hero;
- tabs;
- request form;
- Full Day / Partial Day control;
- dates;
- partial time;
- character counter/reason;
- Request Overview;
- request history;
- manager review cards;
- approval/denial actions;
- empty states;
- mobile stacking;
- sticky/mobile nav safety;
- capitalization.

## 15.7 Shift Exchange

Route: `/app/exchange`

Maintain the simplified clean direction.

Audit:
- hero;
- My Shifts / Coverage / Requests / History tabs;
- tab count badges;
- upcoming shifts;
- offer/trade actions;
- request overview;
- How It Works;
- empty states;
- history;
- no excessive cards;
- mobile tab behavior;
- button wrapping;
- dense data.

## 15.8 Employees

Route: `/app/employees`

Audit:
- hero;
- summary metrics;
- search;
- filters;
- employee table;
- avatars;
- locations;
- status;
- profile/actions;
- bottom brand card;
- long names;
- many employees;
- no-data state.

Mobile:
- intentionally designed employee cards/rows;
- filters must be usable;
- no hidden essential status;
- no table squeeze.

## 15.9 Add Employee

Route: `/app/employees/new`

Apply the approved onboarding layout.

Capitalization updates:
- Add Employee
- Employee Information
- Role & Assignment
- Account Activation
- Employee Setup
- Location Access
- Create Employee

Audit:
- backend-safe Employee ID;
- no fake default ID;
- Generate ID;
- phone;
- optional email;
- role permissions;
- primary location;
- eligible location logic;
- account activation explanation;
- setup side rail desktop;
- setup below form mobile;
- sticky footer;
- keyboard/no zoom;
- error retention/field values after failed submit if feasible.

## 15.10 Templates

Route: `/app/schedule/templates`

This page has not received the same premium refinement level and must be brought into the system.

Audit/refine:
- shallow branded header or consistent task header;
- Save This Week;
- template name;
- Saved Templates;
- Apply;
- Archive;
- success/warning/error states;
- empty state;
- confirmation before archive if destructive;
- mobile stack;
- week context preserved;
- capitalization consistency.

Keep this page operational and relatively simple.

## 15.11 Scheduling Rules / Schedule Health

Route: `/app/schedule/settings`

Audit:
- hero;
- summary;
- staffing by location;
- employee weekly targets;
- coverage windows;
- empty state;
- Add Coverage Window;
- save/reset bar;
- all form alignment;
- long employee lists;
- mobile form stacking;
- sticky save bar/mobile nav interaction;
- delete/remove confirmation as appropriate.

## 15.12 Settings

Route: `/app/settings`

Preserve approved control-center direction.

Capitalization:
- OWNER CONTROLS
- Settings
- Locations
- Roles & Permissions
- Scheduling Rules
- Manage Locations
- Manage Access
- Manage Rules

Audit:
- three-card alignment;
- actual active-location count;
- role copy;
- navigation behavior;
- brand panel;
- desktop balance;
- mobile one-column layout;
- Manage Locations functionality.

---

## 16. App Shell QA

The shell affects every route and gets tested before page-specific bugs are considered fixed.

### Desktop sidebar
- width;
- sticky behavior;
- full-height behavior;
- overflow on short-height displays;
- nav count for Owner vs Manager vs Employee;
- active route;
- nested active route;
- profile truncation;
- sign out;
- icon consistency.

### Mobile header
- sticky;
- role chip;
- logo;
- backdrop blur;
- no content jump.

### Mobile navigation
- route-specific active state;
- five items;
- label fit;
- safe areas;
- keyboard;
- sticky savebar coexistence;
- page bottom spacing.

---

## 17. Performance Requirements

The redesign must not make the scheduler feel slower.

Audit:

- avoid oversized images;
- prefer optimized SVG where appropriate;
- reduce unnecessary backdrop filters and heavy box shadows on mobile;
- reduce unnecessary client components;
- prevent avoidable rerenders;
- reserve layout space for async content;
- avoid animation-driven layout shift;
- avoid large CSS duplication;
- avoid repeated network requests caused by client UI state;
- keep interactions immediate.

Animation rules:
- subtle;
- short;
- useful;
- no bouncing/jarring motion;
- respect `prefers-reduced-motion`.

---

## 18. Accessibility

Required:

- visible keyboard focus;
- logical tab order;
- semantic form labels;
- button vs link semantics;
- aria labels for icon-only controls;
- sufficient contrast;
- status not conveyed only by color;
- minimum touch targets;
- no disabling pinch-to-zoom/user-scalable accessibility;
- headings in logical order;
- dialogs focus-managed if dialogs are added;
- checkboxes/toggles keyboard-accessible.

---

## 19. CSS and Component Architecture Cleanup

The current branch has both a large `globals.css` and several route-specific premium stylesheets.

Phase 2 should:

1. Keep global:
   - design tokens;
   - reset/base;
   - app shell;
   - shared button styles;
   - shared form styles;
   - shared status styles;
   - genuinely shared component patterns.

2. Keep route-local:
   - page-specific layout;
   - page-specific hero art;
   - specialized component composition.

3. Remove:
   - overridden obsolete rules;
   - duplicate responsive rules;
   - legacy styles no longer referenced;
   - one-off hacks made unnecessary by shared components.

4. Extract reusable components where they clearly repeat:
   - BrandedPageHero
   - SectionHeading
   - EmptyState
   - StatusPill
   - StickySaveBar
   - SummaryMetric
   - FilterBar / SearchControl if appropriate

Do not over-componentize tiny one-off fragments.

---

## 20. Automated and Manual Testing Strategy

Current package scripts include:
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm test`

These all must pass.

### Recommended browser automation

Because mobile/device quality is now a release requirement, Phase 2 should strongly consider adding focused Playwright smoke coverage if it can be introduced cleanly.

Target smoke routes:
- /login
- /activate
- /app
- /app/schedule
- /app/availability
- /app/requests
- /app/exchange
- /app/employees
- /app/employees/new
- /app/schedule/templates
- /app/schedule/settings
- /app/settings

Automated assertions should include where practical:
- no page-level horizontal overflow;
- primary navigation visible;
- bottom nav visible on phone and hidden on desktop;
- no fixed/sticky overlap with final interactive controls;
- key headings render;
- main forms fit viewport;
- critical actions are reachable.

Browser emulation does not replace real/manual device review.

---

## 21. Required Manual Device Matrix

At minimum:

### iOS / Safari
- small iPhone-class width
- current standard iPhone width
- Pro/Max width
- portrait
- keyboard open
- Safari browser chrome expanded/collapsed

### Android / Chrome
- ~360px
- ~412/430px
- keyboard
- date/time/select behavior

### Tablet
- portrait
- landscape

### Desktop
- Safari
- Chrome
- compact laptop
- 1440px
- wide desktop

---

## 22. Stress-Test Data

Test layouts with:

- long first/last names;
- long email;
- 10-digit phone numbers;
- long location names;
- 20–50 employees;
- many shifts in one week;
- multiple shifts on the same day;
- many requests;
- many exchange/history records;
- many coverage windows;
- zero locations/zero templates where valid;
- validation errors;
- network/save errors;
- no-data states;
- partially configured rules.

---

## 23. Role Matrix

Verify at minimum:

### Owner
- full management nav;
- Settings;
- can create Owner where current permission model allows;
- scheduling controls.

### Manager
- management routes appropriate to current permissions;
- no Owner-only controls accidentally shown.

### Lead
- employee-level vs management permissions must remain consistent with existing permission system.

### Employee
- Home;
- My Schedule;
- Availability;
- Time Off;
- Shift Exchange;
- no management-only routes/actions.

Nested route active-state behavior must remain correct.

---

## 24. Visual Regression Checklist

For every route compare desktop and mobile independently.

Check:
- alignment;
- spacing;
- capitalization;
- typography;
- card size;
- icon size;
- button size;
- button hierarchy;
- images;
- cropping;
- borders;
- shadows;
- colors;
- empty states;
- long text;
- form state;
- sticky behavior;
- navigation;
- scroll behavior;
- browser/device behavior.

A desktop fix is not accepted if it breaks mobile, and a mobile fix is not accepted if it degrades desktop.

---

## 25. Phase 2 Execution Order

Codex should execute in this order:

### Pass A — Foundation
1. Audit and consolidate tokens.
2. Audit AppShell desktop/mobile behavior.
3. Fix viewport/safe-area/input zoom foundations.
4. Establish shared responsive/button/form/icon standards.
5. Establish capitalization rules in code/content.

### Pass B — Functional Integrity
1. Employees filters.
2. Employee profile/action decision.
3. Settings Manage Locations.
4. backend-safe employee ID generation/uniqueness.
5. remove or fix fake controls.
6. validate all existing links/actions after redesign.

### Pass C — Page Stabilization
Recommended order:
1. Login
2. Activate Account
3. Dashboard
4. Weekly Schedule
5. Availability
6. Time Off
7. Shift Exchange
8. Employees
9. Add Employee
10. Templates
11. Scheduling Rules
12. Settings

### Pass D — Mobile-Specific Redesign
Audit every route at the required viewport matrix.
Do not simply rely on desktop styles collapsing.

### Pass E — Desktop/Wide-Screen Final Pass
Confirm balance, density, max widths, and artwork.

### Pass F — Performance/CSS Cleanup
Remove duplicate/legacy styles only after visual parity is verified.

### Pass G — QA
- build;
- lint;
- typecheck;
- tests;
- browser smoke;
- role workflows;
- Safari;
- Android/Chrome;
- final screenshot review.

---

## 26. Acceptance Criteria Before Phase 3 Review

Codex may report Phase 2 implementation complete only when:

- no known page-level horizontal overflow remains;
- mobile nav works at 320–430px;
- no form control causes accidental iOS focus zoom;
- safe-area behavior is implemented;
- sticky controls do not collide with mobile nav;
- capitalization system is applied repo-wide;
- button/icon/font/card/image audits are completed;
- fake controls are fixed/removed;
- Add Employee ID generation is safe;
- Templates receives consistent refinement;
- Login and Activate Account are included in the polish pass;
- all major pages have explicit mobile behavior;
- desktop remains polished;
- no obvious regressions by role;
- build passes;
- typecheck passes;
- lint passes;
- tests pass;
- remaining limitations are documented rather than hidden.

---

## 27. Phase 3 Review Standard

Phase 3 is a visual and UX review led by ChatGPT/user, not a self-certification by Codex.

The implementation will be reviewed screen by screen.

Expected outcomes:
- approve;
- request targeted correction;
- reject a change and restore the prior approved behavior.

No merge occurs during Phase 3.

---

## 28. Final Definition of Done

Fuel Scheduler is ready to leave `dash-refine` only when:

- it looks premium and consistent on desktop;
- it looks independently polished on phones;
- it behaves properly on iOS Safari;
- it behaves properly on Android Chrome;
- there is no unwanted input zoom;
- there is no accidental horizontal overflow;
- the bottom menu is stable and safe-area aware;
- sticky actions never cover content;
- capitalization is consistent with the Fuel UI system;
- fonts, buttons, icons, images, cards, colors, spacing, and borders are aligned;
- nothing looks crooked or visually unfinished;
- interactive-looking controls actually work;
- loading/empty/error/success states are coherent;
- performance feels responsive;
- role permissions remain correct;
- build/typecheck/lint/tests pass;
- the user explicitly approves the final refinement.

**Until then, `development` remains untouched.**
