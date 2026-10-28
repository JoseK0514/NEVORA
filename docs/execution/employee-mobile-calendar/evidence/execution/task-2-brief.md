## Task 2: Present the deliberate mobile Calendar flow

Interfaces: consumes Task1's single controller state and existing canonical command callbacks. Mobile changes presentation only, not controller identity or permissions.

1. Read craft floor immediately before edits; write semantic render regressions first. Expected: new mobile requirements initially fail.
2. Keep optional inline Profile disclosure and Schedule fixed hash. Present current state, one-time private link copy/select, provider steps, honest independent refresh and explicit replace/revoke confirmations. Use scoped shared teal tokens, rem type, inset Phosphor carets, 44/48px targets and light/dark wrapping; omit decorative example week only on mobile. No misleading connected status or yellow warning blocks.
3. Verify official provider instructions. Run render/controller tests, nonincremental TypeScript and scoped lint. Expected: green; desktop remains incumbent.
4. Commit code/tests and design record.

Whole-task command: npx vitest run src/lib/calendar src/components/calendar-subscription-panel.test.tsx src/components/calendar-subscription-panel-lifetime.test.tsx src/components/employee-mobile/calendar.test.tsx

