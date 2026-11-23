# Faster plan (Jose approved, Nov 23, 2026). Applies to every agent from now on.

## What gets fixed now vs at the end
- **Fix now (blocking):** wrong or misleading messages, lost or false-saved data, text that overlaps or is cut off
  (including at 200% text), broken or unequal buttons, misalignment you can see, repeated wording, a page still on the
  older look.
- **End sweep (log it, don't fix now):** screen-reader names, focus rings, tap targets under 44px, axe-only findings,
  contrast tweaks under 1 point, text sizes that are fixed px but don't overlap. Log each as a proposed row marked
  "end sweep".

## Lighter proof
- Iterate with the development server (`npm run dev` on your own port, fictional data, throwaway database). No lock
  needed for that.
- ONE production-build capture at the end, under `flock /tmp/nevora-heavy.lock`: AFTER only, at 390, 768 and 1440, for each
  role whose screen you changed. Add 200% text at 390 only where text size was the issue. Skip BEFORE captures: the
  Nov 22 sweep already has them.
- Tests beside what you change, typecheck, oxlint. Same as before.

## Unchanged
Fictional data only; no real notifications; no deploys, publishing or paid generation; same server reads, permissions,
actions and data contracts; stay inside your files; local commits only, never push; commit messages end with the two
required lines; no model names anywhere else.
