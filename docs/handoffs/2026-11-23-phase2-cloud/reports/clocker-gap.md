# Gap closure: Clocker and motion (`claude-codex-collab-nevora-clocker-states`)

Merged the shared tip at 552ceed3 first. Production builds, owned https origin for the Clocker, fictional workspace,
tablet keys, IDs and PINs, throwaway local Postgres. No real device, notification, payment, deploy or publishing.

## Commits
- `c6b970ee` Merge of 552ceed3. The only conflict was `tools/ui-scan/zz-scan.tar.gz`; its files merged cleanly by hand.
- `67c17a66` Scan tool: K13 sweep (200% text, axe, forced colours), the offline fallback capture, the motion probe.
- `e0a033d8` Scan tool: the press probe (controls held down, pointer moved away before release, so nothing is clicked).
- `6a50d455` The fix and its test (below).
- `73b6decc` Scan tool: switches are clicked and clicked back.
- Shots commit: this report, `shots/clocker-gap/rows.json` and `img/`.

## 1. K13 Someone else's punch in progress, on the tip
390x844, 768x1024, 1024x768 and 390x844 with 200% text, EN and ES; axe (WCAG 2.0/2.1/2.2 A and AA) and forced colours
at 390 and 1024.
- No overflow at any size; at 200% text the card scrolls (289px EN, 380px ES) and Done / Listo stays reachable.
- Done 56px, 3px focus ring on the first Tab; no target under 44px; no repeated lines.
- axe: 0 violations, EN and ES (23 rules passed).
- Forced colours: card, ring, notice and Done keep visible borders and text.
- Nothing to fix. End sweep: the state's ring glyph stays 28px at 200% text (fixed size, as on every Clocker state).

## 2. The Clocker offline fallback (`clocker-fallback.tsx`, the route's `error.tsx`)
First capture. The scan serves the kiosk page, makes the browser's time-zone formatter fail (the kiosk band formats in
the location's zone; the fallback's own clock doesn't), so the route falls to its error screen, then drops the network
with `context.setOffline(true)`.
- Online: "The time clock hit a problem" / "El registro de tiempo tuvo un problema".
- Offline: "Time can't be recorded" / "This tablet is offline." (DEC9, 7903d0e4), ES "No se puede registrar el tiempo" /
  "Esta tableta está sin conexión."; focus moves to the heading; back online it returns to the error screen.
- 390, 768, 1024 and 390 at 200% text, EN and ES: no overflow; axe 0 violations; forced colours keep every control.
- Nothing to fix.

## 3. Reduced motion across the app at 390 and 1440
Every page opened with `prefers-reduced-motion: reduce`, at 390 and 1440:
- Owner: 73 signed-in routes (every approved Owner row, with fictional ids for the person and location pages).
- Manager (OWN-ELENA): 25 routes. Employee: 20 routes.
- Signed out: 16 public pages (sign-in and its errors, forgot, reset, activate, privacy, terms, support, account
  deletion, 404, welcome, access help).
- Lead: not run separately (its pages are the Employee pages plus Lead-only rows covered by the Manager list).

Two probes on each page:
- Computed styles: every element and its ::before and ::after with an animation, or a transition on a moving property,
  still set.
- Interaction: each distinct visible control held down (1,376 Owner and public, 436 Manager, 380 Employee), and each
  switch clicked and clicked back, listing what runs on a moving property.

Found and fixed (`6a50d455`): four reduced-motion rules put the pseudo-element inside `:is()`, for example
`:is(.mb-tog, .mb-tog::after) { transition: none; }`. A pseudo-element isn't allowed there, so the browser dropped it
and the switch knob kept its 150ms slide (seen on New update, `/app/updates/compose`). Each pseudo-element now has its
own selector: `.mb-tog` (update toggle), `.section-tab` (portal section tabs), `.pmp-switch` (profile switch),
`.wc-switch` (settings switch). The timecard sheet's font rule had the same shape and is simplified. A new test in
`src/app/app/b-reduced-motion.test.ts` rejects a pseudo-element inside `:is()`, `:where()`, `:not()` or `:has()` in any
stylesheet; it fails on the old CSS and passes on the fix. After the fix, every switch flips with nothing moving.

Not defects (by design):
- Entrance fades: Home cards (`b-fade`, 200ms) and kept panels (`eb-keep-fade`, 150ms) fade in. Opacity only, no
  travel, as the motion sheet decides for reduced motion (Jose's NV-251 and NV-329, `b-motion.css`).
- Colour, background and opacity transitions on press and hover (the tint that shows a press when the scale is off).
- The computed-style probe lists `scale` in the kit buttons' transitions, but the kit applies the press scale only when
  motion is allowed (`b-foundation.css`), so under reduced motion there is nothing to animate; the press probe confirms
  no button moves.

Not covered here: the Clocker kiosk's own reduced-motion step (its scan flow has one; not re-run today), WebKit.

## Tests
- `node scripts/run-rstest.mjs run` (whole src suite): 16,162 passed, 1,008 skipped by the suite itself, 62 failed in 6
  files: the tenancy files need commit 7c628e37 (README set-up) and `managed-runtime` is the known load-sensitive test
  (owned by sweep-1). After fetching 7c628e37 the 6 files pass alone (134 tests).
- `src/app/app/b-reduced-motion.test.ts`: 113 passed.

## Blocking items left
None.
