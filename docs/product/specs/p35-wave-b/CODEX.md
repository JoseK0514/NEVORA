# Wave B: set aside for joint testing with Codex

October 19, 2026. Wave B changed only UI files. Nothing below was changed on the server. Each item needs Codex's side, or a real server outcome, before it can be signed off together.

## Real outcomes of submissions

Claude checked what each screen does before, during (pending, disabled), on failure (request blocked in the browser), on double tap and on a slow network. What the server saves, sends and returns is joint testing:

| Page | Actions |
|---|---|
| Insights | View period, Refresh, Download CSV, Print / Save PDF |
| Templates | Save template, Apply to this week (and the "Check / retry original copy" recovery), Archive |
| Scheduling rules | Save staffing & hours, Add coverage period, Remove, Save position quantities, Save trade policy, Save coverage policy (Owner) |
| Update detail | Acknowledge update, Mark read, Withdraw update, Check status |
| Compose | Preview audience, Publish update / Publish new version, Check status, Retry original publication |
| Payroll settings | Save company preferences, Save employee exception, Save payroll access |
| Payroll runs (manager) | Prepare draft, Validate and import amounts, Approve revision, Publish employee statements, Create correction, Prepare payment instructions, Retry job |

## Server-produced content

1. **Insights CSV export** (`/api/reports/export`): the file's columns, headings, number formats and time zone. The UI only names the file `nevora-reports-<start>-<end>.csv`.
2. **Report definitions and coverage and stability definitions** come from `src/lib/reports/project.ts` (`definitions`, `coverageReliability.definition`, `scheduleStability.definition`). Some read as internal notes to a client: "Actual time uses D2 canonical effective entries and breaks…", "append-only history", "immutable snapshots". Suggested plain versions are in the Wave B report; the strings belong to the report contract, so they weren't changed here.
3. **Notifications from a published update** (push, email): who receives them and their wording.
4. **Payroll documents and notices**: statement PDFs, payment instruction JSON, private payroll notices.

## Error screens that can't be forced from the browser

Templates and Scheduling rules are server-rendered. A failed read while the server renders them goes to the in-app error page, which needs the dev-only error switch described in `PLAN.md` ("Dev-only error switch"). Insights, Update detail, Compose and the payroll pages read in the browser, so their failed, offline and signed-out states were forced with request blocking.

## Data the preview doesn't have

- **A manager who can review payroll but not approve it.** `payroll-qa-reviewer` can also approve, so the "An authorized payroll approver must approve this revision" branch is unchecked on screen. A fixture grant (review on, approve off) would let it be inspected.
- **Large data on these pages** (200 people on Scheduling rules' weekly hours, a year of Insights rows, many templates and coverage periods) runs on the second `--large` preview.
