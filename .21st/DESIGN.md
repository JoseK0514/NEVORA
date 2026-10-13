# NEVORA mobile design context

Authoritative tokens: src/app/mobile-workforce.css and src/components/manager-home-mobile.css. Authoritative decisions: DESIGN.MD and .21st/design.json.

## Remaining mobile workforce pages (2026-10-13)

The user approved mobile Home and authorized its extension across the remaining mobile website. This supersedes the older rule that other mobile pages retain a List menu. At <=760px, authenticated routes other than /app use data-mobile-workforce="true". All Home views and authentication retain their approved world. Desktop retains the incumbent layout. The public Clocker has a separate data-mobile-clocker scope.

Use the original inverse NEVORA wordmark with centered Workforce, deep-blue masthead, one notification bell, and a regular Phosphor UserCircle for management navigation. Native action popovers become bottom sheets with a visible Close actions control; contextual triggers use Phosphor DotsThree with the original accessible name. Keep role-owned routes, keyboard focus, light dismissal and Escape behavior.

The mobile-workforce.css token family supplies #062959 masthead, #0756D9 action blue, #EDF4FF selected wash, #F7F8FA canvas, white cards, #111827 ink, #4B5563 secondary text, 16px outer inset, 24px group gap, 20px cards, 14px controls, 17px main labels/actions, 15px supporting copy and 24px page titles. Retain local Inter/JetBrains Mono and the existing Phosphor icon family. No ornamental media or animation.

Scheduling uses a single-row, horizontally scrollable day strip; the page itself must never overflow. People and settings use grouped rows with quiet separators rather than nested bordered cards. Timecards expose totals/issues before an optional Review timecard disclosure. Payroll population detail is optional only when a confirmed review is present; busy/retry states reveal its existing content. The same DOM children remain visible on desktop and print. Existing protected readers, current-actor checks, retry commands, approval rules, privacy clearing, and mutation handlers remain authoritative. Timecard refresh may remount cards and reset their local disclosure choice; no private data is retained to preserve it.

Mobbin references are inspiration, not pixel-clone targets: Gusto pay history 06042184-b5dd-4e9c-be17-f969ee4b6819, paycheck b9bf269f-2d5e-4f19-9ada-338ae6cdebdf, grouped fields f09f34c2-f06b-4dd1-b234-2ba87a2d665d, time-off 1d88efc1-af34-41ec-a9d0-641d625044c9 and 615a1c68-9a32-4425-90eb-17f6a318a269. InsightTimer 71782ac6-9f21-4620-8cc7-e1d53c6f57c0 supplies selected-day anatomy; Mindtrip 3c9062c0-27d9-4379-92c0-156da56b853c supplies date/time sheet organization.

Actual 21st component code retrieved through its authenticated CLI catalog: Preferences Card 30553 (ssychui), Calendar 34716 (halaska-studio), Sheet 35214 (kevingirelli). Adapted grouped rows/calendar states/sheet exit anatomy to native existing components; no demo data, dependencies or hosted AI generation. 21st MCP was not exposed in this session. Screenshots never become rendered page assets.

Scope/QA:41 remaining route patterns, actual employee and lead variants, phone sizes320/390, desktop1440 plus breakpoint checks. This is a light-only responsive web preview; no native iOS, touch/DPR, dark-mode, reduced-motion emulation or 200% browser zoom claim. Source-backed reduced-motion rules remain. Browser tests use an owned synthetic fixture, no real messages, credential edits, payroll processing or customer-data changes.
