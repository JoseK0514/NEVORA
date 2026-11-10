# NEVORA UI review, November 10, 2026

A full UI/UX review of every screen for Owner, Manager, Employee and Lead (320–1440 px), the Clocker kiosk,
the sign-in and public pages and the phone-app screens: 1,961 screenshots, 867 automated audits and eleven
review passes, merged into **329 findings (67 High, 169 Medium, 93 Low)**.

- `NEVORA-UI-Review.html`: the report (open in a browser; filter by area and severity, or search).
- `findings.json`: the merged findings (`id`, `severity`, `category`, `surfaces`, `what`, `why`, `fix`,
  `where` file:line, `sourceIds`, `needsDecision`/`decision`).
- `reviews/`: the eleven source reviews (design-system code, copy EN/ES with the glossary, Owner phone,
  Owner desktop, Manager, Employee, Lead and phone app, tablet, sign-in and public, Clocker, components and
  accessibility).

## Jose's decisions (Nov 10, 2026)

- **Offline:** keep the person's own loaded information on screen, read-only, with "Offline · updated <time>"
  and actions disabled; clear only when the app is paused because the person stepped away. The banner must
  match what the page does.
- **Withdraw:** employees can withdraw their own waiting time-off request.
- **Leads in the phone app:** allow Leads (their screens are the Employee screens). App/backend gating goes to
  Codex.
- **Payroll wording:** unlocked for a plain-language pass; amounts, rules and legal statements keep their
  meaning.
- The other eight decision items follow the report's recommendations (NV-052, 161, 186, 274, 289, 308, 320,
  323).

Screenshots for the review were captured with `tools/ui-scan/` on fictional data.
