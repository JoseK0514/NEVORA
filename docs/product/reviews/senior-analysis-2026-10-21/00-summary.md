# Senior business analysis — executive summary

October 21, 2026 · For Jose · Synthesis of four independent senior reviews of the whole codebase
(main checkout at 8c4dd505; release candidate claude/auth-premium, read-only)

The four reports, each with full evidence and file citations:
1. [Product completeness](01-product-gaps.md) — 18 findings F1–F18, Missing / Unreachable / Weak, P0–P2
2. [Market and competitive](02-market.md) — positioning, top-10 gaps vs the market, pricing, app-store route
3. [Experience coherence and trust](03-experience.md) — shell inventory, Oct 18 findings ledger, do-not-ship seams
4. [Technical and operational risk](04-risk-operations.md) — risk register R1–R10, pre-launch checklist, missing ops artifacts

## The one-paragraph verdict

NEVORA's core is better than its edges. The transaction spine (schedule → publish → punch → correct → approve → export) is real, unusually well-audited, and carries genuine differentiators: the punch-receipt integrity in the Clocker, the bilingual Puerto Rico positioning, and the Signature brand. What is not ready is the *operation around the code* (red CI in freeze week, a hand-applied migration chain with eight duplicate numbers and no ledger, workers nothing schedules, zero monitoring) and a handful of *week-one trust seams* (a Spanish promise the app keeps only on two surfaces, a wrong support domain, an hours export that silently prices overtime as regular time). This week's go-live is viable as a single-company production launch; it is not a market launch — selling needs tenancy, billing, and legal groundwork that does not exist yet.

## Four themes across all reports

**1. Operations is the weakest layer (risk report).** Nothing technical stops a red build reaching production: deploys are manual Vercel CLI, claude/** pushes trigger no CI, branch protection is unavailable. `db/migrations` has duplicate numbers for 0023–0027, 0031 and 0032 with no record of what production has applied. The notification and payroll workers have no scheduler anywhere, so reminders and paystubs would silently never run. There is no health endpoint, error tracking, uptime alert, backup-restore drill or runbook.

**2. The same five product edges keep resurfacing unresolved (product report; first flagged Oct 18–20).** The legacy "Welcome back" dashboard still behind view=team / view=activity; the hours export with no regular/overtime/meal split (sharper in PR, where Ley 379 overtime is daily); a 15-minute invitation expiry that cannot onboard a 20-person team; Spanish true only on sign-in and the Clocker; a Lead role identical to Employee. None are architecture problems — they are requirements decisions nobody has written down.

**3. The experience is one decisive week from coherent (experience report).** The Oct 18 manager NO-GO is substantially cleared: D1–D4 fixed, MG1 mostly, MG3/MG4 fixed. The employee journey, Clocker included, is one Signature system end to end. Remaining seams are cheap: the corporate-blue theme still wired to employee My time/Timecards, three different teals (app vs PWA status bar vs offline page), the near-invisible focus ring on the teal band, Manager "My pay" rendering the employee page inside the clean shell, and `support@thevelani.com` in the deletion copy.

**4. Differentiated, but not yet sellable (market report).** No competitor serves Puerto Rico's language, law and outage reality; no rival markets punch-receipt verification. But: one company per database (multi-tenancy F10 is explicitly IN_PROGRESS), zero billing or entitlement code, no Terms or Privacy Policy, and payroll math without CPA sign-off. Demo-killers vs Homebase/Deputy/7shifts: phone clock-in with location, store apps, labor cost in dollars, live overtime alerts, time-off balances.

## Do this week (before go-live)

| # | Action | Owner | Source |
|---|---|---|---|
| 1 | Add `server-only` to package.json; get development green; adopt "no deploy without a green CI URL on the exact SHA" | Codex | Risk R1 |
| 2 | Fix the migration chain: unique numbers or a ledger, a written statement of what production has applied, one dry run fresh + one as upgrade | Codex | Risk R2 |
| 3 | Wire the worker scheduler (cron → internal routes) and prove it on hosted Preview | Codex | Risk R4 |
| 4 | Minimum ops: health route + uptime alert, error tracking, one timed restore drill, four runbooks | Codex + Jose | Risk R3 |
| 5 | Answer the failing inbox-authority test (treat as privacy bug until shown otherwise); close FR-AUTH-001 | Codex | Risk R5 |
| 6 | Quick UI trust fixes: support-domain string, Spanish expectation note at sign-in, retire the blue layer on employee My time/Timecards, align PWA/offline teal, band focus ring, "totals include breaks; overtime not split" warning on exports | Claude | Experience 1–3, Product F7 |
| 7 | Finish MG1: redirect view=team and view=activity; verify on the branch that ships | Claude | Product F1 |
| 8 | One 320/390px browser pass on Inbox filters and schedule publish tools | Claude | Experience 5 |

## Decisions only Jose can make

1. **Spanish positioning** — ship an honest "app beyond sign-in is English for now" note, or hold the language switch until B5.
2. **What a Lead is** — one page of requirements; today the role buys nothing.
3. **Manager/Owner "My pay"** — restyle for the clean shell, or declare "your own pay always looks like the employee pay page."
4. **Payroll positioning** — documents-only wording everywhere, or CPA sign-off before the compliance pitch.
5. **First customers** — managed pilots on database-per-company (recommended) vs waiting for shared multi-tenancy; price per location (~$29–39 entry) when ready.
6. **Deactivation semantics** — what happens to future published shifts; needs a written decision, then a test.

## First weeks after launch (P1)

Invitation funnel (longer expiry — Codex migration; bilingual email; bulk invite) · phone clock-in with location recorded at the punch (the market's #1 demo-killer; reuses the receipt/recovery machinery) · counsel-backed REG/daily-OT/weekly-OT/meal-penalty export columns · Spanish for the employee core pages · time-off decision notes and history · correction-decision notifications · full Owner first-run setup · SIGNATURE-SPEC.md so the written design source of truth stops lagging the shipped look.

## Assets worth protecting (don't reopen)

Punch receipts and recovery (make them employee-visible; they are most of an offline story) · schedule conflict detection (overlap, availability, projected OT) · the quiet-hours notification engine · the append-only corrections custody chain · scrypt/HMAC credential handling · the 9,700-test harness.
