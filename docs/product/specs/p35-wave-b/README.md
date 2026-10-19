# Phase 3.5 Wave B: weekly Owner and Manager pages on the kit

October 19, 2026 · branch `claude/p35-wave-b-808dfd` · status: **in inspection** (this report is completed at the exit rule).

## Pages

| Page | Route | Roles | What changed |
|---|---|---|---|
| Insights | `/app/reports` | Owner, Manager | Kit band; Report period and Export cards; At a glance as a six-answer grid; Period summary on the kit stat grid; section links; tables that stack on phones and become real tables from 761px; record lists with status pills; own print styles for Print / Save PDF; readable "Observed" time |
| Templates | `/app/schedule/templates` | Owner, Manager | Band with Back to Schedule; week card with a three-part stepper; Save this week and Saved templates as cards (two columns from 1024px); feedback as kit notices with icon and word |
| Scheduling rules | `/app/schedule/settings` | Owner, Manager | Flat band; section links (sticky side navigation from 1024px); Location staffing and Weekly hours as setting rows with suffixed number fields; sticky save bar; Recurring coverage with day tiles; trade and coverage policy as a disclosure; "Missing target" is now "No target" |
| Update detail | `/app/updates/<id>` | Every role | Band carries category, title, author and time; Message card with a status pill; review card (checkbox and Acknowledge, or Mark read); recipients disclosure, Edit and Withdraw for managers; every unavailable state on the same frame |
| Compose | `/app/updates/compose` | Every role | Band; Your message and Delivery as cards on the shared form pattern; audience preview card; recovery notices |
| Payroll settings | `/app/settings/payroll` | Owner | Each group of settings is its own card under a "Company defaults" heading; 52px fields; history as rows. **Wording unchanged** |
| Payroll runs | `/app/payroll` | Manager with payroll access | Same screen as the Owner's (passed Phase 2); verified, not changed |

Styles: `src/app/app/premium-wave-b.css` only. Retired: `reports.module.css`, `communication-compose.css`, `communication-detail.css`, `templates.css`, `scheduling-rules.css`.

## Checks

_Filled in at exit._

## Set aside for Codex

See `CODEX.md`.

## Screenshots

`screens/`: each page at 390 and 1440.
