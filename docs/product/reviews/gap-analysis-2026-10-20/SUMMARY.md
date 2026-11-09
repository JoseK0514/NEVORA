# What NEVORA is missing: merged gap list (October 20, 2026)

This merges three read-only senior reviews:
- [business-analyst.md](business-analyst.md): 22 gaps.
- [market-analyst.md](market-analyst.md): 7 competitors, with sources.
- [ui-designer.md](ui-designer.md): 18 gaps.

Claude checked the headline claims against the code before merging. Legal and payroll points are risks for counsel or a CPA to decide; they are not decisions.

## P0: blocks a credible launch, or creates legal or trust risk

| # | Gap | Evidence | Who decides |
|---|---|---|---|
| 1 | One company per deployment and no sign-up. Each new company needs a script run against an empty database. | `docs/plans/2026-10-12-configurable-payroll.md` ("SaaS is paused"); `docs/architecture/tenant-foundation.md`; `scripts/setup-company.mts` | Jose: managed pilots, or finish the multi-company work |
| 2 | The Puerto Rico payroll tax maths runs on an Owner waiver with no professional sign-off. There is no 499R-2/W-2PR form and no Christmas bonus. | `src/lib/payroll/native/provisional-policy.ts:7` | PR payroll CPA |
| 3 | The hours export sends total hours only, with no regular, overtime or meal-penalty split. | `src/lib/payroll-export/model.ts` | Labour counsel (Ley 379) |
| 4 | There are no Terms, no Privacy Policy and no recorded consent. The account-deletion message points to `support@thevelani.com`. | `src/lib/auth-copy.ts:51,152` | Jose and privacy counsel |
| 5 | There is no error monitoring, alerting, health check or tested restore. | `docs/execution/final-release-checklist.md:74` (unchecked) | Codex and Jose |
| 6 | Spanish is missing across the whole portal, not only activation. It is also the main thing that could set NEVORA apart. | `src/app/layout.tsx:25` (`lang="en"`); the invitation email is English-only | Jose approves the wording |
| 7 | Only the Owner can invite people, by email only, and each invitation link expires after 15 minutes. | `db/migrations/0032_company_access_invitations.sql` | Jose and Codex |

## Expected by buyers: market table stakes, ranked by deal and churn impact

8. **Clock in from your own phone, with the location checked at the punch.** All seven competitors have it, while NEVORA only clocks in at the shared tablet. The phone clock component exists but nothing uses it, and the only clock-in endpoint is under `/api/clocker`. Waiting on decision A20.
9. **Store apps, plus alerts by SMS or email.** Today alerts go by web push only, so iPhone users who haven't installed the app miss schedule changes.
10. **Labor cost and budget on the schedule, with live overtime and missed-meal alerts.** Puerto Rico's daily overtime makes this more urgent.
11. **Time-off balances and accruals.** Ley 180 needs counsel review.
12. **A Clocker that works offline (B6).** Power and network outages in Puerto Rico make this a good sales story.
13. **Lower priority (P1/P2):**
    - two-way team chat
    - new-hire paperwork and e-signature
    - a CSV staff import screen (the importer exists but is unused)
    - billing
    - a help centre
    - offboarding dates
    - an exportable audit log
    - a second sign-in factor for Owners
    - Lead permissions that differ from Employee
    - a Manager Schedule that loads faster than 10.6 seconds at 200 people

## UI and design system

14. **Signature isn't written down.** `DESIGN.MD` and TEAM-RULES still describe the older Gusto-teal look, and the specs exist only as images.
15. **Colours are copied page by page.**
    - #0D3634 is defined in 10 CSS files.
    - The CSS has 344 unique colours, about 2,300 `:not(#…)` specificity overrides and 291 `!important`.
    - This blocks dark mode and company branding.
16. **There are three typefaces.** The system font, bundled Inter and JetBrains Mono are all in use, so the ultra-light display figures look different on each device.
17. **Status colours disagree between roles.** Teal also marks "done", which breaks the rule that teal means "act".
18. **Buttons are inconsistent.**
    - Nothing visibly reacts when tapped on a phone, because there's no pressed style and the tap highlight is turned off.
    - Primary buttons come in six heights and six corner radii.
    - "Saving" looks disabled.
19. **The frame around Signature still has old pieces:**
    - the desktop sidebar
    - the browser status-bar colour of the installed app
    - an old logo on the offline page
    These need re-checking on the current build.
20. **Shared states are built page by page.** Offline, session ended, no access and toasts (with no undo) differ from page to page.
21. **Accessibility.**
    - The focus ring on the teal band is 1.31:1, so it effectively disappears.
    - The tracked-caps labels are below the 15px phone text floor.
    - Some Manager items are low contrast.
22. **Signature ignores company branding.** It needs a decision.

## Suggested order

1. **Jose decides:**
   - the pilot model (#1)
   - bringing in counsel and a CPA (#2, #3, #4, #11)
   - phone clock-in (#8)
   - per-location pricing
2. **Next two weeks, without new features:**
   - Terms and Privacy, and fix the support email (#4)
   - monitoring and a tested restore (#5)
   - a longer invitation lifetime (#7)
   - one Signature token file, one component set and a written spec, before dark mode or more screens (#14–#18)
   - fix the accessibility items (#21)
3. **Next quarter's bets:**
   - phone clock-in
   - labor cost with overtime alerts
   - a Puerto Rico compliance pack with Spanish
   - an offline Clocker
   - store apps

Positioning from the market review: *Puerto Rico's workforce app: Spanish first, Puerto Rico law built in, every hour on the record.*
