---
name: "Nevora Clocker proposal"
description: "Scoped shared-tablet and Owner administration prototype; ordinary extension of the frozen Owner visual world."
colors:
  canvas: "#f4f7f6"
  surface: "#fff"
  ink: "#172622"
  muted: "#5f6d68"
  line: "#e3e9e6"
  form-border: "#ccd8d1"
  teal: "#0b6e69"
  teal-press: "#07534f"
  teal-wash: "#eaf4f1"
  amber: "#845417"
  amber-wash: "#fff4e3"
  red: "#b53327"
  red-wash: "#fdf0ed"
  focus: "#087fca"
  track: "#e8eeea"
  selection-ink: "#123d34"
  selection-surface: "#bce7df"
  contrast-muted: "#394b42"
  contrast-line: "#a8b7ae"
  contrast-form-border: "#6a7770"
typography:
  page:
    fontSize: "1.75rem"
    fontWeight: 680
    lineHeight: 1.25
    letterSpacing: "-.03em"
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
  title:
    fontSize: "1.1875rem"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-.02em"
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
  body:
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
  supporting:
    fontSize: ".875rem"
    lineHeight: 1.5
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
  action:
    fontSize: "1rem"
    fontWeight: 620
    lineHeight: 1.4
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
  keypad:
    fontSize: "1.5rem"
    fontWeight: 550
    lineHeight: 1.5
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
  clock:
    fontSize: "5rem"
    fontWeight: 480
    lineHeight: 1.1
    letterSpacing: "-.04em"
    fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
rounded:
  control: "12px"
  card: "16px"
  small: "8px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  s8: "32px"
  layout-space: "40px"
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
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.teal}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-danger:
    backgroundColor: "{colors.red}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  form-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  keypad-key:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.keypad}"
    rounded: "{rounded.control}"
  device-list:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  segments:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.control}"
    padding: "4px"
  notice:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    rounded: "{rounded.small}"
    padding: "16px"
---

# Design System: Nevora Clocker proposal

## Overview

This is a local proposed extension of the Owner mockup, selected by Jose for shared tablets with owner-controlled administration. It retains the established teal identity, official NEVORA wordmark, system typography and regular Phosphor icons. It does not replace production Signature or establish global Nevora design authority. No new brand metaphor or taste score is established.

Canonical implementation is `work/clocker/src/`, with the frozen incumbent in `work/clocker/references/DESIGN.md`. `work/clocker/build.mjs` combines the React entry point, three local stylesheets and embedded icon sprite, including its full Phosphor MIT license, into `outputs/clocker/index.html`. This document records consumed source roles. Browser-test results and their limitations belong to the separate evidence, linked in `design-context.json`; source inspection alone is not proof of rendering or accessibility.

**Key Characteristics:**

- A shared-tablet task pane with location and illustrative time for orientation.
- Private four-digit entry, state-derived actions and clear confirmation/recovery states.
- Separate, explicitly labelled Owner preview for tablet and PIN administration.
- White and gray-green surfaces, restrained teal actions and semantic attention colors.

## Colors

Frontmatter records the colors actually consumed by the scoped source, retaining its canonical CSS spelling. Teal identifies actions, selection and ready states. Neutral canvas, surface, ink, muted text, borders and segment tracks organize the content. Amber and red accompany text and icons for attention and errors. Selection colors and increased-contrast overrides are browser/state roles, not new brand accents. No synthetic palette or tonal ramp is established.

## Typography

The shared system stack and primary type roles are in frontmatter. The root uses 100% browser font sizing; supporting text is relative to it. Page and section headings retain tight tracking. The clock and keypad use tabular numerals. The clock includes a smaller AM label, and narrow layouts reduce the clock role through scoped responsive CSS. Intermediate font weights may render differently across platforms.

Compared with the frozen Owner document, Clocker adapts the page role from 2rem/720 to 1.75rem/680 and uses a 1.5 body line height. These are local task-surface decisions; they do not rewrite Owner typography. Enlarged text may require vertical scrolling; do not shrink body text to force a single viewport.

## Layout

The terminal uses a wrapping flex layout with a location/time rail and one-person task pane, capped at 1600px. The rail has an 18rem basis and the task pane a 25rem basis, with growth factors 1 and 2; a wrapped rail fills the available width. Font-relative bases allow the panes to stack when enlarged text needs more space. Task content is capped at 392px. Whenever panes stack, a measured compact rail prioritizes the PIN task and hides the large illustrative clock. At widths up to739px the rail uses the same task-first arrangement. Up to 540px the insets and time treatment compact further; up to 380px the rail stacks. Wide, short viewports (at least 900px wide and at most 800px high) use a 360px task measure and tighter vertical padding.

Owner administration has a 240px navigation rail and a flexible main area, with content capped at 1080px. At widths up to 1000px its navigation moves above the content; up to 540px it uses a two-column control grid. Forms have a 520px maximum measure within a 720px detail area. Inventory rows and headings wrap instead of truncating task labels.

The shared spacing scale remains the consumed 4/8/12/16/20/24/32px roles. The keypad uses the 12px gap role, and fields use the 12px/16px padding roles. A scoped 40px layout-space role is consumed by wide-layout insets; it does not establish a new global Nevora token. Review-toolbar controls belong to the prototype, outside the employee surface.

## Elevation & Depth

The Clocker styles define no box shadows. Borders, white surfaces, pale backgrounds and spacing convey hierarchy. This is a local adaptation of the frozen Owner system, which includes shadows for some actions and review surfaces.

Button backgrounds and press transforms transition over 160ms; an enabled button moves down 1px while pressed. The only animation is a one-second linear pending spinner. Reduced-motion rules disable animation and transitions while status text remains. Keyboard focus uses a 3px blue outline at a 3px offset; it is not elevation.

## Shapes

Controls use the shared control radius, list containers the card radius and notices/detail surfaces the small radius. PIN dots and person initials are circular. Prototype-toolbar controls have local 6px corners and do not redefine product controls. The unchanged wordmark retains its aspect ratio, with 112px normal and 88px narrow terminal display widths.

## Components

### Actions, input and PIN keypad

`Button` supplies primary, secondary, quiet and destructive variants actually used by the prototype. General action buttons and fields have a 48px minimum height; clock actions and Continue use 52px, and keypad keys use 64px. Secondary actions have a form-border outline. Disabled controls use opacity .65 and a default cursor. Back, language switching and segmented filters use 44px minima; the prototype toolbar is separately compact.

The PIN entry is one native password input with a four-digit pattern and physical-keyboard support. Its 64px entry area presents four decorative dots; the three-column keypad has Clear and Delete actions. Continue is unavailable until all four digits are entered. No employee roster appears before verification. Errors use text, an invalid input state and a red border. Focus on the masked entry remains visible around its container.

Fields retain native input, textarea and select behavior. Selects use an 18px Phosphor chevron inset 16px, with 48px trailing padding. Forced colors removes the custom image and restores the native arrow. Labels, validation and focus remain semantic.

### State, receipt and recovery

Verified status shows only currently available actions. Clock-out has a review with Cancel clock-out or Stay on break, according to current state; clocking out during a break explicitly ends it. Break reference minutes are a guide, never an automatic end time. Success names the action and recorded sample time, offers its original action reference and Done, then clears within eight seconds. The verified session has a hard30-second limit, warns during the last10 seconds and offers secure PIN re-verification. Only the same actor resumes an unsent task mode. Partial PIN digits clear after20 idle seconds; Escape and document visibility changes clear identity. Success hides the general session footer using the success-state selector, keeping only the more immediate receipt-clear message visible.

An unconfirmed action blocks new punches for its original employee and preserves the exact reference; other verified employees can continue independently. Recovery distinguishes recorded, unknown, original-ID safe retry, stale context, re-verification and unreadable records. Explicit review of a known-not-recorded stale action preserves its history and records no time. Unknown and unreadable records cannot be retired merely because context changes. Anonymous Owner handoff is collapsed by default, supports copy/dismiss and never opens administration; dismissing does not remove the incident. Notices use neutral, warning or error treatments with text and icons; errors announce an alert. These are fictional in-memory behaviors, not durable service guarantees.

### Owner administration and navigation

Owner preview contains tablets, employee PINs, break types and action-reference lookup. Its current navigation item uses teal on a teal wash. Inventory filters are ordinary button groups with pressed states; no arrow-key tab behavior is claimed. Search has a visible container focus outline. Device rows use a white bordered container, dividers and canvas hover.

Tablet registration states are Registered, Needs setup and Removed; none proves live connectivity. Destructive confirmation focuses Cancel. PIN settings hide existing PINs and distinguish Set/Not set/inactive, uncertain save and explicit status checking. Break editing preserves archived status until explicit Restore. Replacing a tablet immediately requires setup; code expiry, interrupted confirmation, blocked cookies and inactive locations have distinct states. Receipt lookup distinguishes recorded time, reviewed originals confirmed not recorded and unresolved records. It is read-only and provides a bounded handoff summary for separate Owner Timecards review. The review toolbar switches between Shared tablet and Owner controls; it is not real authentication or authorization.

## Do's and Don'ts

- Do preserve the frozen teal/system/Phosphor identity and official wordmark.
- Do keep shared-tablet clocking separate from clearly labelled Owner administration.
- Do accompany color with text, retain visible focus and allow text enlargement.
- Do record only source-consumed roles and keep browser evidence distinct from documentation.
- Don't infer online telemetry, paid/unpaid break policy, production feature enablement or server permissions from this prototype.
- Don't add gradients, glass, illustrations, marketing heroes, generic decorative icon tiles or decorative motion to this scoped task surface.
- Don't promote this proposal to approved global Nevora authority or claim a Tastemaker score. The invoked Tastemaker installation has its SKILL only; the bundled knowledge base is missing, so no CR/TS citations are available.
- Don't change root Owner, Employee, access, desktop, DESIGN/PRODUCT or root tool context as part of this record.

Employee-facing PIN, action, error, privacy, recovery, receipt and setup copy is translated in `src/locale.ts`; the previous Spanish glossary has been removed. Owner administration remains English in this scope.
