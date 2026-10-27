---
name: "Nevora — PROPOSED OWNER MOBILE MOCKUP"
description: "Owner Mobile foundation and Schedule extension; not approved global Nevora design authority."
colors:
  canvas: "#f4f7f6"
  surface: "#fff"
  ink: "#172622"
  muted: "#5f6d68"
  line: "#e3e9e6"
  teal: "#0b6e69"
  teal-press: "#07534f"
  teal-wash: "#eaf4f1"
  amber: "#845417"
  amber-wash: "#fff4e3"
  focus: "#087fca"
  red: "#b53327"
  red-wash: "#fdf0ed"
  search-border: "#d5dfd9"
  tab-track: "#e8eeea"
  preview-ink: "#4f6158"
  contrast-ink: "#394b42"
  contrast-line: "#a8b7ae"
  navigation-muted: "#6a7770"
  selection-surface: "#bce7df"
  selection-ink: "#123d34"
  scroll-thumb: "#c9d5cf"
  staffing-surface: "#e9f3ef"
  staffing-ink: "#46635b"
  secondary-border: "#cbd7d1"
  chevron-ink: "#7a8882"
  avatar-surface: "#e4eee9"
  avatar-ink: "#315c4c"
  avatar-blue-surface: "#e9edf6"
  avatar-blue-ink: "#445a7b"
  avatar-sand-surface: "#f2eae0"
  avatar-sand-ink: "#775b34"
  notice-ink: "#2c5f51"
  toast-surface: "#203d32"
  inline-feedback-ink: "#28584b"
  toast-undo: "#c7f5e6"
  review-ink: "#456053"
  review-border: "#c8d6cd"
  form-border: "#ccd8d1"
typography:
  page:
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "2rem"
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: "-.035em"
  section:
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 680
    lineHeight: 1.3
    letterSpacing: "-.025em"
  title:
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-.015em"
  body:
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  supporting:
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: ".875rem"
    lineHeight: 1.45
  action:
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "1rem"
    fontWeight: 620
    lineHeight: 1.4
    letterSpacing: "-.01em"
  navigation:
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: ".75rem"
    fontWeight: 550
    lineHeight: 1.45
  caption:
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: ".75rem"
    lineHeight: 1.45
  sheet:
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "1.5rem"
    fontWeight: 680
    lineHeight: 1.3
    letterSpacing: "-.025em"
  badge-count:
    fontFamily: "system-ui, sans-serif"
    fontSize: "10px"
    lineHeight: "15px"
rounded:
  card: "16px"
  control: "12px"
  small: "8px"
  checkbox: "4px"
  icon: "10px"
  sheet: "24px"
  frame: "28px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  s8: "32px"
  section-gap: "28px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.surface}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.teal-press}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.teal}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-secondary-hover:
    backgroundColor: "{colors.teal-wash}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.teal}"
    padding: "8px"
  card-priority:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "18px"
  navigation:
    backgroundColor: "{colors.surface}"
    padding: "8px 8px calc(12px + env(safe-area-inset-bottom,0px))"
  coverage-tag:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.amber}"
    rounded: "{rounded.small}"
    padding: "4px 8px"
  inline-feedback:
    backgroundColor: "{colors.teal-wash}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  search-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
  segmented-tabs:
    backgroundColor: "{colors.tab-track}"
    rounded: "{rounded.control}"
    padding: "4px"
  tool-list:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "0 16px"
  form-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  tools-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.teal}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
---

# Design System: Nevora — Proposed Owner Mobile Mockup

## Overview

This is a PROPOSED OWNER MOBILE MOCKUP, not approved global Nevora design authority. The foundation and Schedule work is an ordinary extension of Jose’s approved modern, clean, premium Gusto/Homebase direction, retaining the NEVORA wordmark, teal identity, system type and Phosphor icons. No taste score or replacement brand metaphor is established.

Canonical source is `work/owner-mobile/template.html`, `styles.css`, `schedule.css`, `app.js` and `schedule.js`; `build.py` embeds these five files into `outputs/nevora-owner-mobile.html`. The earlier `work/build_mockup.py` and `work/refine_v2.py` are historical. The stage boundary is `work/schedule-mobile/brief.md`; final verification is recorded separately in `outputs/schedule-review-results.md`. The feature catalog records route and capability boundaries; it does not establish authorization. This document does not authorize application changes or replace the production DESIGN.MD.

**Key Characteristics:**

- System typography and consumed spacing roles across five owner destinations.
- Teal actions and selection; amber coverage and red attendance states carry text and icons.
- Grouped tools, adaptive navigation and explicit return context.
- Compact day/week browsing and focused Schedule reviews using the existing control and surface roles.

OriginUI Button (142), Segmented Tabs (26923) and CommandMenu (38984), retrieved through 21st, informed the earlier refinement. Patterns were adapted to standalone HTML; no React components were installed. Calendar references 25146 and 34576 are recorded as 21st reference metadata for this ordinary extension; no new component code or package was installed.

## Colors

Frontmatter preserves the declared palette and records the existing browser, avatar, feedback and review-chrome detail colors. Teal identifies actions, selection and the simplified Home calendar cue. Coverage status tags retain amber; red marks missing clock-ins. Text and icons accompany these states. The staffing summary retains its `#e9f3ef` wash through the staffing-surface role. Avatar, feedback and review-canvas colors are documented as local role details; they do not introduce additional primary brand accents. No synthetic tonal ramp is established.

Increased-contrast mode changes muted text to `#394b42`, dividers to `#a8b7ae`, and outlines card, request and review surfaces.

## Typography

The platform system stack and role values are recorded in frontmatter. The root uses 100% font sizing rather than a fixed pixel size. At a 16px browser default, page/section/task/body/supporting/caption/sheet roles resolve to 32/19/18/16/14/12/24px. These roles are consumed by the consolidated stylesheet. Headings use tight tracking; tool-group headings use -.02em. Selected navigation labels use weight 650 instead of 550. Intermediate system weights may render differently across platforms. The 10px badge-count role is a compact, nonessential duplicate of the larger queue count and accessible button label; it is not body or navigation-label text.

## Layout

The centered phone surface is capped at 430px and fills 100dvh. Main content scrolls internally. Page insets use the 24px spacing role, switching to 20px at widths up to 359px. Sections use the 28px gap role; optical 14/18/22px details coexist with the shared spacing scale. Root bodies use 20px top and 32px bottom padding.

Navigation uses five equal grid columns with a minimum height of `calc(4.875rem + env(safe-area-inset-bottom,0px))`. With labels above 18px, measured text wider than one fifth of the available row switches navigation to a 3+2 layout; text wider than one third switches it to two columns, with the last destination spanning both. Expanded layouts preserve whole words. ResizeObserver and font readiness trigger text measurement and update the app’s navigation-height variable; scroll clearance and toast placement consume that measured height. Main-content bottom padding and scroll padding add 16px clearance. Navigation items are at least 54px tall.

Schedule has a compact header and wrapping week/tools controls. A seven-day strip uses at least 44px-wide targets; at 320px it uses the full phone width and removes inter-day gaps. Larger text can scroll the strip horizontally. Day/Week segments, publication context and compact shift rows use existing roles. Schedule sheets keep Back and Close in a sticky header; measured header height supplies scroll padding and focused-control clearance. Inbox starts its panel 24px below the segmented filters. Company settings group tools under Company, Scheduling and Pay. Root navigation preserves each destination’s scroll position and search queries; explicit date or location navigation updates the relevant scope. The location selector resets root scroll positions.

At 700px and above, the review canvas gives the phone an 844px height, 28px outer corners and an outline. The demo toolbar is hidden up to 1000px. These are review presentation rules, not a desktop app layout. Layer order remains navigation 10, sheet 20, toast 30 and skip link 50.

## Elevation & Depth

White cards use borders, dividers and spacing without shadows. Primary actions have a subtle highlight and lower shadow; secondary actions omit it. Selected Inbox segments, sheets and toast feedback use the exact shadows in the sidecar. The phone-frame shadow belongs only to the review canvas.

Buttons transition background and transform over 160ms and move down 1px while pressed. Sheets enter over 220ms from a 24px downward offset and opacity .7. Loading skeletons alternate opacity over one second. Root-page entry animation has been removed. Reduced-motion mode disables animations/transitions and uses automatic scrolling.

## Shapes

The frontmatter mirrors the consolidated radius roles. Controls share one 12px control radius; small details, icon containers, sheets and the review frame use their own roles. The Home coverage icon has no colored tile; other status tiles retain the control radius. Avatars and base icon buttons remain circular; header actions use control corners. The official wordmark displays at 88px width with its original aspect ratio.

## Components

### Owner mobile Team

Team profiles and editors use full mobile pages within the existing five-tab shell. A sticky task bar uses 44px Back controls and the existing sheet-size title; identity uses the page-size heading, existing avatar tones and a neutral/teal employment-status label. Contact, Work and Scheduling use readable definition rows on the existing bordered white surface. Conditional Call/Message controls are 44px text actions; the prototype previews contact and launches no native call or message.

Editors group Personal details and Work details, with optional scheduling choices behind a native disclosure during creation. Core and scheduling changes have separate review/save boundaries. Existing 48px inputs/buttons, inset native selects, checkbox geometry and token spacing carry through. Management-scope radios retain native circular appearance to distinguish a single choice from location checkboxes. The form footer sits directly above navigation; its scroll container reserves navigation height once. Text actions omit primary-button shadow/flex treatment. Cancel asks to discard only when fields changed.

Review shows the proposed changes and any role/status consequence before Save. Failure keeps the draft; conflicts show all submitted fields and retain a read-only previous draft beside the latest profile. Unknown results check their original save operation before another write. Names, IDs, addresses and locations wrap without truncation; long forms and review pages scroll with useful Back/focus behavior at enlarged text sizes. Native disclosures use the existing Phosphor caret; no new brand colors, fonts, icon families or decorative effects were added.

### Actions and Tools

Primary and secondary actions are at least 48px high. The shared compact header variant (`.btn.compact`) is at least 44px high, with supporting-size text, an 18px Phosphor plus, 8px by 12px padding and an 8px icon/label gap. Schedule uses the visible label Add shift; Team uses Add employee. It shares primary colors, control corners and interaction states. A heading row containing this variant centers the title and action and allows wrapping; enlarged text can put the complete action on its own row. Primary uses teal/white; hover darkens teal. Secondary uses white, teal text and a 1px `#cbd7d1` border; hover uses the teal wash. Text actions use supporting text at weight 620 and a 44px minimum height. The priority action places its arrow in a 26px translucent tile with the small radius.

Tools is a labeled secondary action with an 18px sliders icon, 44px minimum dimensions, 9px by 12px padding, control corners and a search-border outline. It uses teal text, a white surface and teal-wash hover across Schedule, Inbox and Team. Base icon controls are 48px squares; compact icon-only header/root actions, date arrows and sheet close controls are 44px squares. The date range is centered between its arrows, with a font-relative navigation basis that allows Tools to wrap below it when text is enlarged.

Section counts use the shared neutral count badge: supporting-size tabular numerals at weight 600, muted ink on the tab-track surface, at least 24px in each dimension, small corners and an 8px separation from the heading. Schedule section headings align their badge vertically; their accessible labels name the number of shifts. Counts follow the visible date/location scope and update after sample mutations. These are totals, not warning indicators.

Shift-detail publication badges use explicit `data-status` values. Draft uses the existing tab-track surface and muted ink at weight 600; Published retains teal on teal-wash. Both use supporting-size text, 4px vertical/8px horizontal padding and 8px corners. Draft is a lifecycle status and no longer consumes the warning style. The text labels and publication rules are unchanged. Scoped evidence: `outputs/draft-status-polish.md`.

Home headings use a contextual text-total variant: “6 people” and “4 items” sit on the title baseline, separated by 8px, in supporting-size muted text with tabular numerals. They have no badge background. Each accessible heading states the total and its unit. Titles and View team wrap independently when text is enlarged; Schedule retains its approved count badges.

Keyboard focus uses a 3px blue outline at a 3px offset. Disabled actions use opacity .65 and a wait cursor. Unused ghost/danger CSS variants are not established as active patterns.

### Cards and rows

Priority cards have 18px padding, reduced to 16px up to 359px, and a divider-color border. The Home coverage cue is a 22px Phosphor calendar-blank in a 24px alignment box, using teal without a tile or cancellation mark. Staffing uses an 84px minimum height, 16px vertical/20px horizontal padding (16px horizontal on narrow phones), a 22px users icon, body-size primary text and supporting secondary text. Existing staffing-surface/ink colors are consumed through named CSS roles. The content column can shrink and wrap; hover and press use existing surface roles. Request rows use 16px padding and an 84px minimum height. Roster containers use 16px horizontal padding and 80px-minimum rows with dividers.

Coverage entry points in Home, Inbox and Updates share `coverageIcon()`. Inbox/Updates rows retain a transparent 40px alignment box around the same 22px teal calendar, preserving the text column alongside other rows. The amber calendar-with-cross tile is removed from these entry points. Row spacing, counts, location scope, accessible action names and destinations remain unchanged. Scoped evidence: `outputs/inbox-coverage-polish.md`.

The Home next-arrival footer aligns its 40px clock column and text with the roster’s avatar/name columns. “Next to start” and the time share a wrapping baseline row; person and location form a second line. The time has a machine-readable datetime and tabular numerals. This is contextual information, not a new control. Isabela retains the no-more-starts message. The existing fictional arrivals and staffing totals are unchanged.

Tool rows are at least 72px tall, with 14px vertical padding and a 13px gap. Their 21px icons sit in 36px teal-wash containers. Narrow widths use an 11px gap, 32px icon containers and 14px container insets. Hover uses `#fbfdfc`; press uses the teal wash. Coverage tags use amber, caption text and the small radius.

### Navigation and return context

Selected navigation uses teal text/icons and a teal-wash icon container, 30px high and at least 44px wide. It has no top indicator. Default icons are 24px, ordinary chevrons 18px and tool-row chevrons 16px. Phosphor regular SVGs are embedded; redundant icons are hidden from assistive technology.

Each tab opens its root destination. Modal detail sheets make the background inert, cycle focus, close with Escape and restore a usable focus target. Re-rendered destinations preserve focus by a stable control key or heading fallback. Nested feature sheets provide a named Back control. Schedule sheets keep this control beside their title and Close action, with an accessible destination label. Opening a modal focuses synchronously so a delayed focus callback cannot steal the first characters typed into a field. Opening Clocker PIN from a person carries that person’s name/location; direct entry asks the owner to choose a person.

### Search, forms and Inbox filters

Search containers are at least 48px high with 20px icons and body-size input text. Focus uses a teal border plus a 3px blue outline at a 2px offset. More and Team retain query text; clear actions restore input focus. Sample form inputs/selects use 48px minimum height, body text, control corners and a 1px `#ccd8d1` border. Labels use supporting text at weight 620. The shared CSS roles `--form-border` and `--form-padding-block` consume the existing frontmatter form-border color and form-field vertical padding; they do not change palette, typography or radii. Schedule textareas share these roles.

Single-select form fields and Team filters retain native select/options behavior with a shared visual chevron. The select-chevron asset derives from the existing Phosphor caret-right, rotated downward, using the existing muted color. It renders at 18px with a 16px trailing inset; 46px of trailing text padding reserves room around it. Multiple selects retain platform styling. Forced-color mode removes the custom image and restores the platform arrow. Keyboard focus and native selection semantics remain.

Team filters use a 10rem minimum column measure, capped at available width. They stack on narrow phones and with enlarged text so the complete “All statuses” and “Employee” selections remain readable beside the inset chevron.

Shared Schedule checkboxes retain native checkbox semantics, label activation, Space toggling, required validation and form values. Their 22px box uses a 4px checkbox radius, a 1.5px muted border, teal checked surface and the existing Phosphor check at 16px in white. Labels retain a 48px minimum row target. Focus uses the shared outline; disabled inputs dim and retain native disabling. Forced colors restores platform checkbox rendering and removes the SVG background. The check-mark asset and r-check role support this component; existing palette and other radius values remain.

Inbox segments use 4px track padding, 2px gaps, 44px minimum height and icon-radius corners. Labels can wrap. Selection uses white/ink, weight 650 and a small shadow; other labels use muted text at weight 550. Hover changes text to teal. Tab semantics and Arrow/Home/End handling are implemented. Plan ahead remains a reachable Inbox filter and links to next week’s Schedule. Team search covers the complete fictional directory, with active/inactive filtering including off-shift people. The searchable tool index has 43 entries: Owner My time was removed; coverage and shift-change policy entries were added. Clocker recovery describes checking an existing tablet receipt, not restoring account access. Other Owner features remain previews. Sidecar samples show visual states, not the application’s event handlers.

### Schedule reviews

The selected day, week and location anchor browsing and review. Coverage presents the need, ranks fictional candidates by submitted availability, target hours, planned hours and a weekly tie rotation, then requires a person/date/shift review. Stale, resolved and no-candidate outcomes retain a recovery path. Planned hours are distinct from recorded time and pay.

The Time off & unscheduled people disclosure retains native details/summary semantics. Its 18px Phosphor chevron sits at the trailing edge and rotates downward when open; the 44px-minimum summary keeps shared focus and reduced-motion behavior. The white surface uses existing card corners, border and 16px insets. A selected-date caption anchors the list. Person rows use existing 72px minimum height, subtle dividers, body-size names and supporting-size statuses. An 8rem minimum column measure makes rows stack when narrow or enlarged; names wrap naturally without ellipsis and status columns retain a consistent start. All original people, selected-day status wording and the availability action remain.

Build draft and Fill gaps remain separate from publication; automatic fill respects saved exclusions. Each location has its own publication review and warning acknowledgment. Templates support saving, archiving and applying to a draft week. Recent copies retain receipts for complete, partial, zero and unknown outcomes; checking an unknown result reconciles its original operation identity instead of creating a second copy.

Tools hold a clearable week-specific availability date/time deadline, optional targets and required maximum hours, recurring per-day coverage periods, optional minimum overrides, position quantities from 1–100, and midnight as the end of the day. Owner trade and coverage policies distinguish unset from zero. Activity is scoped by week; availability remains an Owner read-only sample review. All state is fictional and in memory: reload/reset loses it; no employee notification, real order, API mutation, durable persistence or production authorization is provided.

Coverage rules group the recurring periods under a heading separated from the lead choice by 24px. Day/time/override fields use 16px internal spacing; position quantities stay inside their period. Add coverage period and Save share the form width, with 24px before Save. Each period has a quieter 44px-minimum Remove text action; its existing confirmation and draft-retention behavior remain. The lead choice preserves unset/Required/Not required. The older separate position-requirement add/remove controls are not reintroduced; numeric per-period quantities remain the current model.

For coverage-rule sheets, an inline-size container query moves the title onto its own row when the content width is at most 10rem relative to the font. Back and Close remain on the preceding row. This prevents enlarged long title words from breaking internally on narrow phones without reducing type size; the existing measured sticky-header clearance adapts to the new height.

### Decisions, feedback and states

Request details explicitly say coverage has not been checked. View affected day carries the request’s date and location to Schedule; Open today’s schedule explicitly chooses today. Add shift inherits the selected date and requires a location when viewing all locations. The active Schedule form validates fictional model constraints: active person, location eligibility, submitted availability, qualifications, designated lead, time off and overlapping shifts. It creates, edits and deletes sample shifts only; it does not verify real eligibility or call a backend. Edits involving either a published original location or published destination require explicit impact consent. Form drafts survive validation and navigation; stale versions require review before saving.

The shift form separates its published-change review from Notes with 24px of space, a divider and 20px of top padding. Its neutral canvas/ink notice has a Published schedule heading, an amber warning-circle icon and the existing notification/delivery/sample disclosure split into readable paragraphs. The required checkbox and save behavior are unchanged. New draft shifts leave the entire section empty, including its divider.

Schedule guidance and cautions share `scheduleNotice`: canvas surface, a 1px line border, 12px corners, 16px padding and a 20px icon column separated from text by 12px. Dark 16px headings and muted 14px supporting text establish the hierarchy; paragraphs have 4px separation and warning-list items have 8px separation. Published-week guidance uses a muted calendar icon; consequences and setup cautions retain an amber warning-circle. Operational wording, warning lists and required approvals are preserved. Red validation alerts retain their existing treatment. The scoped verification record is `outputs/schedule-notice-polish.md`.

Approve/decline disable during a 400ms sample update. The receipt names the person, request date, request kind and decision, with Undo. It appears inside an open sheet or in the root toast. Dismissing a pending sheet does not reopen it on completion. Undo feedback persists; ordinary confirmation hides after seven seconds. Reset invalidates pending sample callbacks.

Loading, connection error/retry, empty, all-clear, missing-clock-in and workspace-setup examples remain sample states. Skeletons use the small radius. This documentation records source behavior only; browser QA results belong to the separate review evidence and are not independently claimed here.

## Do's and Don'ts

### Do:

- Do treat these values as a proposal scoped to the isolated Owner Mobile mockup.
- Do preserve the NEVORA wordmark, teal identity and semantic attention colors.
- Do use the canonical source roles and retain focus, text resizing and reduced-motion behavior.
- Do distinguish a sample decision or preview from a verified staffing check or real operation.

### Don’t:

- Don’t promote the proposal to approved global Nevora authority without review.
- Don’t recreate stale V2 overrides, duplicate control-radius tokens or fixed navigation-height assumptions.
- Don’t claim production verification, formal accessibility certification or a Tastemaker score from this record.


## Owner mobile invitations — approved continuation

Continue the existing teal, neutral canvas, system type and Phosphor vocabulary. Reuse the full-page Team task header, compact identity row, definition rows, disclosure and44/48px controls. The employee profile exposes one invitation entry under Account access; no extra dashboard, parallel palette or decoration.

Separate the current invitation state, delivery outcome and account setup. Show the registered masked recipient at review; do not add editable recipients, usable links or credential controls. State the fifteen-minute expiry and replacement consequence in plain language. Keep issuer/timestamps behind disclosure. Unknown writes expose only original-operation outcome lookup. Keep historical saved receipts when current reads fail; clear them on denied access. Narrow screens and200% text scroll naturally without squeezing controls.

Canonical addition: `work/owner-mobile/invitation-store.js`, `invitations.js`, `invitations.css`, with small Team/app integration. Scoped source contract and actual verification: `outputs/owner-invitations-review.md`. This remains an isolated proposed Owner-mobile prototype; no production or global design authority is claimed.


## Owner mobile Manager access — scoped continuation

Reuse Team task navigation, compact invitation-style identity rows, definition groups, reviewed actions and the shared neutral caution. Manager profiles gain one access entry; no new colors, font, icons, dashboard or permission grid. Company-wide and selected-location choices use native radio inputs; locations use the established checkboxes. Current scope is declarative, and history labels assignment versus revocation accurately.

Short headers such as Manager access, Edit access and Revoke access? preserve whole words at320px/200% text. Scoped grid sizing and wrapping keep Refresh inside the content width without reducing type or utility targets. Views scroll naturally above the existing bottom navigation. Pinned edits and unknown commands survive navigation; clean current-status views refresh after core lifecycle changes. Evidence: `outputs/owner-manager-access-review.md`. No global visual-system change or production certification is established.


## Owner mobile Clocker PIN — scoped continuation

Keep the existing Team task navigation, compact identity, calm review notice, native form roles, typography, icons and button geometry. One Clocker PIN row stays under Account access. The More picker uses the existing searchable roster pattern. Consequences are reviewed before digit entry, so no secret is carried to a second review page. Two masked fields remain single native numeric-keypad inputs; digit spacing is purposeful, using the existing sheet type role. There is no reveal/copy control or added credential dashboard.

Measured sticky-header height supplies scoped scroll clearance for validation and entire field labels, including at320/390px with200% text. Errors focus a visible summary and restart at New PIN because both fields clear after submission. Keep user-facing tablet consequences in plain language and distinguish setup metadata, known save acknowledgement and unconfirmed save. Evidence: `outputs/owner-clocker-pin-review.md`. This adds no global palette/type changes or production authority.


## Owner mobile account recovery — scoped continuation

Keep Team task navigation, compact employee identity, shared native select/checkbox/textarea styling, neutral impact notice, disclosure and44/48px actions. One task per page: verify, review, then private handoff. The custom identity method uses the full-width native multiline field with inherited16px body type that enlarges with root text. Preset help and the review show the complete statement being attested, including a trusted colleague when workplace records are selected.

Use the same canvas/line/ink hierarchy for the code area, with a read-only selectable sample, clear expiry and short handoff steps. Select only selects text; it does not copy or send. Measured sticky-header clearance keeps the field label and focused code in context at320/390px and200% text. Distinct Identity check cleared, Code hidden, Code expired and Issuance not confirmed states explain the next step without implying revocation or completion. No new palette, font, decorative icon tile or global redesign. Exact evidence and limits: `outputs/owner-account-recovery-review.md`.


## Owner mobile Team audit — same visual system

Preserve the existing Team world. Duplicate names gain a supporting immutable ID only when needed to distinguish people. Current Owner is a normal directory entry; primary-location grouping and explicit status filtering remain. Team Add/Edit now measures header clearance so focused summaries and complete labels remain in context at normal/enlarged text. Person weekly-hour links reuse the existing inset native controls and measured Schedule sheet header. No alternate profile layout or control vocabulary is added.

Owner-reviewed operational rules use Team task navigation, compact identity, a five-row current review and native disclosure groups for editing. The first group starts open; groups the user opens stay open as applicability changes. All configured fields use the existing form token roles. Unknown/Reviewed not applicable/Configured carries meaning in text. A whole-profile review precedes save; pending, setup, unavailable, conflict and unconfirmed states use the established neutral surfaces. Retained entries are labeled neutrally wherever a save might have completed. Typography, palette, Phosphor assets,44/48px actions and enlarged-text behavior stay consistent. Current scoped review: `outputs/owner-team-audit.md`. No global visual authority or production certification is created.

## Owner mobile Timecards — existing world continuation

Timecards stays a full-page More task with the Team task header, identity rows, definition groups, native disclosure, neutral guidance and44/48px controls. Teal denotes action and selection; neutral clock guidance stays muted, with small amber issue icons only beside concrete exceptions. Recorded and Break time are two aligned facts, not dashboard tiles. Plain language explains that breaks are included, with historical observations explicitly captured.

Period controls center the inclusive date range between equal utility targets. Current/last shortcuts precede source status filters, local name/ID search and complete person rows. Recorded durations align independently of variable-length names; exception reasons remain readable, and zero-time people can expand without hiding search matches or pending-correction rows. Entry details progressively disclose original punches, effective times, breaks and correction provenance. Historical revisions remain read-only.

A scoped22rem inline-size container moves the whole task title below Back/Refresh when enlarged text would collide. Date labels/errors use measured sticky-header clearance. Background refresh preserves native disclosures, keyboard focus and scroll; pause/failure replaces private content. Existing typography, palette, Phosphor icons, wordmark and root navigation stay consistent. Evidence and limits: outputs/owner-timecards-review.md. This is a proposed isolated Owner-mobile design, not global visual authority or production certification.
