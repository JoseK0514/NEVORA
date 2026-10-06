---
name: fuel-scheduler-ui
description: >
  Use whenever designing, redesigning, reviewing, polishing, or implementing
  UI/UX for NEVORA Workforce. Fuel Coffee Drive is the current customer/workspace.
  Applies to manager dashboards, employee dashboards, scheduling, staffing,
  clock-in/clock-out, navigation, mobile layouts, responsive behavior, forms,
  tables, cards, and operational workflows.
---

# NEVORA Workforce UI / UX Skill

Use the repository's [NEVORA UI contract](../../../docs/ui/fuel-ui-contract.md)
for the selected baseline, portal-specific controls, states and review evidence.
The legacy file path is retained so existing plans remain valid.
Future automation must follow the bounded phases in the
[delivery charter](../../../docs/architecture/fuel-automation-charter.md).
Preserve all other rules below; a new feature does not authorize a new visual style.

## Product Goal

NEVORA is a software platform owned by VELANI LLC. Workforce is its operational workforce module. Fuel Coffee Drive is the current customer/workspace.

The interface must help managers and employees understand information quickly,
make decisions quickly, and complete common tasks with as little friction as
possible.

The product should feel:

- Clean
- Elegant
- Mature
- Professional
- Premium
- Calm
- Operational
- Extremely easy to understand
- Highly usable on mobile

Do NOT turn the application into a generic SaaS dashboard.

Do NOT sacrifice functionality just to make the interface minimal.

The goal is:

**Useful information + excellent hierarchy + excellent spacing + very low cognitive load.**

---

# Core Design Direction

The approved Apple-style NEVORA Workforce direction remains the source of truth.

Do not redesign the entire product every time a screen is improved.

Use:

**Approved NEVORA character + Canva-level cleanliness**

The Canva concepts should be used primarily as references for:

- spacing
- breathing room
- alignment
- typography hierarchy
- cleaner card construction
- visual consistency
- restrained borders
- cleaner information grouping

Do NOT copy the Canva design blindly if it removes the operational personality
or usefulness of the original Fuel Scheduler direction.

---

# Visual Language

Use a calm, premium, software-first interface.

Primary visual language:

- Neutral light-gray canvas and white surfaces
- Deep midnight structural elements
- Restrained NEVORA blue as the primary product accent
- Soft blue/cyan only for selected/active emphasis
- Status colors only when they communicate actual state

NEVORA blue should draw attention intentionally.

Do not make every button, icon, label, and border blue.

Midnight should provide structure and contrast.

Neutral surfaces should provide calm and breathing room.

Approved NEVORA palette:
- Midnight #20232D
- Blue #0756D9
- Blue hover/pressed #003AAE
- Soft blue/cyan #F0FBFF
- Cyan #43CCFB
- Canvas #F6F6F8
- Surface #FFFFFF
- Primary text #18191F
- Secondary text #676A73

Fuel Coffee Drive branding is workspace context, not the permanent product theme.
Use the NEVORA symbol derived from the official `public/images/nevora.png` upload for compact marks. Never use the old Velani paw. Product brand headings use the shared BrandLockup variants, preserving the original `public/images/nevora-wordmark.png` glyphs and cyan A detail without a visible white rectangular backing. Align Workforce with the visible wordmark edge. The flame alone keeps its compact rounded container. Coffee-themed photography or decorative art must not define the product; Fuel is workspace/location data.
Use "Powered by VELANI LLC" only in subtle footer/legal/ownership contexts.

Avoid:

- Cheap gradients
- Excessive shadows
- Excessive borders
- Excessive cards
- Random bright colors
- Generic Bootstrap styling
- Generic admin-template styling
- Glassmorphism unless specifically requested
- Decorative UI elements with no operational purpose

---

# Layout Philosophy

Every screen should have an obvious visual hierarchy.

Users should immediately understand:

1. Where they are
2. What is happening
3. What requires attention
4. What they can do next

Use a disciplined spacing system.

Prefer spacing increments such as:

- 8px
- 12px
- 16px
- 24px
- 32px
- 48px

Related items should visually belong together.

Unrelated items should have enough separation.

Do not crowd elements together.

Do not create huge empty spaces just to make a page look minimal.

Use available screen space intelligently.

---

# Cards and Containers

Do not create a card for every piece of information.

A container should exist because it helps:

- grouping
- hierarchy
- interaction
- comprehension

Avoid:

card inside card inside card.

Prefer fewer, stronger containers.

Cards should generally have:

- generous internal padding
- consistent radius
- subtle borders or separation
- minimal shadow
- clear hierarchy

Do not use multiple competing border styles.

---

# Typography

Typography must feel mature and calm.

Prefer the existing project typography unless changing it has been explicitly
approved.

Use:

- clear weight hierarchy
- restrained font sizes
- strong alignment
- comfortable line height

Recommended hierarchy:

Page title:
- strong
- immediately identifiable
- not oversized

Section title:
- medium/semibold
- clearly separated from body content

Labels:
- subtle
- smaller
- lower visual priority

Important values:
- visually dominant when appropriate

ALL CAPS may be used for small navigation labels and section labels where it
matches the existing NEVORA language.

Do not use ALL CAPS for long text.

Avoid excessive bold text.

---

# Manager Dashboard

The manager dashboard is an operational command center.

A manager should be able to understand staffing health within seconds.

Prioritize information such as:

- current staffing
- scheduled employees
- staffing targets
- shortages
- overstaffing
- upcoming shifts
- hours
- exceptions
- attendance issues
- actions requiring attention

Do not overwhelm the manager with equal-weight information.

Critical information should visually outrank secondary information.

The dashboard should answer:

**What is happening today?**

**Is staffing healthy?**

**Is anything wrong?**

**What needs my attention?**

**What should I do next?**

---

# Employee Dashboard

Employee UI should NOT simply be a copy of the manager dashboard.

Employees primarily need:

- their schedule
- next shift
- clock-in / clock-out
- hours worked
- upcoming work
- availability
- requests
- relevant notices

Keep the employee experience simpler than the manager experience.

Do not expose manager-only complexity.

---

# Navigation

Navigation must be predictable.

Keep important product areas easy to find.

Desktop may use a sidebar when appropriate.

Mobile should use a deliberately designed navigation pattern.

Do not shrink the desktop sidebar into mobile.

Avoid navigation with too many equal-priority items.

Current/active location should always be obvious.

---

# Tabs

Tabs are encouraged when they reduce complexity.

Use tabs for closely related views such as:

- Overview
- Staffing
- Schedule
- Hours
- Employees

Do not create tabs simply to hide poor information architecture.

Tabs should:

- have a clear active state
- be easy to scan
- avoid excessive borders
- maintain consistent spacing
- work naturally on mobile

---

# Tables

Tables must remain highly readable.

Use tables when comparison across rows and columns is important.

Tables should have:

- clear headers
- consistent row height
- good horizontal alignment
- restrained separators
- adequate padding
- obvious statuses
- sensible empty states

Avoid excessively dense tables.

On mobile, do NOT simply squeeze a desktop table until the text is unreadable.

Instead consider:

- priority columns
- horizontal scroll when appropriate
- row cards
- expandable rows
- condensed mobile-specific representations

Choose whichever maintains comprehension.

---

# Mobile Is a First-Class Experience

Mobile usability is a priority.

Do NOT treat mobile as desktop stacked vertically.

Create deliberate mobile compositions.

The product should work well across:

- small iPhones
- large iPhones
- Android phones
- tablets
- desktop

Prevent:

- horizontal page scrolling
- elements colliding
- clipped text
- overlapping cards
- floating buttons covering content
- broken navigation
- buttons extending outside containers

Interactive targets should generally be at least approximately 44px tall.

Form inputs should use at least 16px font size on mobile when appropriate to
prevent unwanted browser zoom.

Important actions should be reachable without awkward scrolling.

---

# Responsive Behavior

Design components to adapt rather than merely shrink.

Desktop:
- take advantage of horizontal space
- maintain strong alignment
- preserve operational density

Tablet:
- intelligently reduce columns
- preserve hierarchy

Mobile:
- reorder information based on importance
- stack only when stacking makes sense
- simplify secondary information
- preserve important actions

Test multiple viewport widths.

Do not only test one iPhone size.

---

# Buttons

Every section should have a clear action hierarchy.

Use:

Primary action
Secondary action
Tertiary/text action

Do not make every button visually primary.

Primary orange buttons should be reserved for important actions.

Buttons should:

- have consistent height
- have consistent padding
- have predictable hover/focus/pressed states
- clearly communicate disabled states

Avoid oversized buttons unless the context requires them.

---

# Forms

Forms must feel calm and easy.

Use:

- clear labels
- logical grouping
- predictable validation
- useful helper text
- clear error states

Do not rely entirely on placeholder text as labels.

Do not create unnecessarily tall forms.

Mobile forms must avoid layout shifting and zoom issues.

---

# Status Communication

Status colors must have semantic meaning.

Examples:

Green:
healthy / confirmed / available / completed

Orange:
attention / warning / upcoming / important

Red:
problem / shortage / error / critical

Neutral:
informational / inactive / secondary

Never use a status color solely for decoration.

Use text and icons with colors when necessary so meaning is not dependent on
color alone.

---

# Interaction Design

Actions should behave predictably.

Provide appropriate states for:

- loading
- success
- empty data
- unavailable data
- error
- disabled action

Avoid interactions that feel mysterious.

Users should not have to guess whether something worked.

---

# Operational Density

NEVORA contains real operational data.

Do not remove useful information merely to create empty space.

Instead:

- prioritize
- group
- collapse secondary details
- create hierarchy
- use tabs
- use progressive disclosure

Clean does NOT mean empty.

---

# Polish Standard

Before calling a UI change complete, review:

## Alignment

- Are edges aligned?
- Are headings aligned with their content?
- Are table columns consistent?
- Are cards visually balanced?

## Spacing

- Is anything cramped?
- Is anything unnecessarily far apart?
- Are repeated components spaced consistently?

## Typography

- Is hierarchy immediately understandable?
- Are labels too heavy?
- Are important values obvious?
- Are font sizes consistent?

## Containers

- Are there unnecessary cards?
- Are there unnecessary borders?
- Is information grouped logically?

## Color

- Is orange being overused?
- Are status colors meaningful?
- Is contrast sufficient?

## Mobile

- Does anything overlap?
- Is there horizontal scrolling?
- Are tap targets large enough?
- Is important content shown first?
- Does navigation feel natural?

---

# Implementation Rules

When improving an existing screen:

1. Inspect the existing implementation first.
2. Preserve working functionality.
3. Preserve approved patterns.
4. Reuse existing components whenever practical.
5. Improve rather than rewrite unless architecture clearly requires a rewrite.
6. Avoid unnecessary dependencies.
7. Avoid duplicating components.
8. Keep visual tokens consistent.
9. Verify desktop AND mobile.
10. Do not change backend behavior unless required by the task.

Do not perform large unrelated refactors during a UI task.

---

# Approval Fidelity

When the user says a direction is approved:

Treat it as the design baseline.

Future work should refine it rather than replace it.

When receiving criticism like:

- "too crowded"
- "too empty"
- "crooked"
- "generic"
- "looks horrible"
- "we can do better"

Identify the underlying design problem and improve that problem without
discarding approved parts unnecessarily.

---

# Design Review Mindset

Always ask internally:

Can a first-time manager understand this screen in five seconds?

Can they immediately identify the most important information?

Can they quickly complete the most common action?

Does the screen look intentionally designed?

Does mobile feel like a real mobile product?

Is anything visually competing unnecessarily?

Could one container replace several smaller containers?

Could spacing solve this before adding another visual element?

---

# Final Standard

NEVORA should feel like a mature commercial workforce product.

It should NOT feel like:

- a school project
- an AI-generated dashboard
- a generic admin template
- a collection of random cards
- a desktop page forced into mobile

The final experience should be:

**clean + elegant + operational + intuitive + responsive + deliberate.**
