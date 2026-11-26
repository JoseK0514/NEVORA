# Retired helper branches (Nov 26, 2026)

Jose approved keeping only `main`, `development` and `claude-codex-collab-nevora`. Every helper branch below is kept as an
archive tag `archive/branches/2026-11-26/<branch>` at the exact commit shown, so its history, reports, screenshots and
tools stay recoverable (`git fetch origin tag archive/branches/2026-11-26/<branch>`). Its app code is already in Collab,
or was replaced there by a later version (checked file by file on Nov 26). The unfinished `tools/ui-audit/` lives only in
the `claude-codex-collab-nevora-qa` tag. Run `docs/handoffs/2026-11-26-retire-branches.sh` to create the tags, verify them
and delete the branches.

| Branch | Tip | Last commit |
|---|---|---|
| claude-codex-collab-nevora-account | `ba21804201` | 2026-11-23 · Account pages: production captures and report |
| claude-codex-collab-nevora-alerts | `ee222b0da2` | 2026-11-23 · Alerts package: L1 and K12 captures (390, 1440; K12 390x844), rows.json and report |
| claude-codex-collab-nevora-batch-clocker | `743212e8cc` | 2026-11-23 · Clocker and phone app: AFTER captures, rows.json and report |
| claude-codex-collab-nevora-batch-nav | `c5d8273e14` | 2026-11-23 · Batch nav: rows.json and report after the accessibility fixes |
| claude-codex-collab-nevora-batch-public | `11574da9cc` | 2026-11-24 · J18 states: slow, Manager and Employee re-captured after the polish; report updated |
| claude-codex-collab-nevora-batch-time-team | `7c00717aa3` | 2026-11-23 · D4 captures after the footer-note and 200% text fixes; report updated |
| claude-codex-collab-nevora-clocker-states | `c215ae9e3e` | 2026-11-25 · Clocker UI step 3: setup-check hand-off measurements, captures, report section |
| claude-codex-collab-nevora-core | `e2c0e8d9fb` | 2026-11-23 · Updates: "Must be confirmed" in the Manager list and compose review (DEC6) |
| claude-codex-collab-nevora-core-options | `9943126429` | 2026-11-23 · Options for Jose: five small wording choices (Updates, Person, Timecards, Clocker offline, Clocke |
| claude-codex-collab-nevora-ds-pages | `53e1e67f29` | 2026-11-23 · Report dev integration B: Manager time off, phones, action scope, Publish explain |
| claude-codex-collab-nevora-es-employee | `84e8109b3e` | 2026-11-23 · es-employee: second-release report and Spanish captures (time corrections queue, Time with the la |
| claude-codex-collab-nevora-es-mobile | `2cd9ed8cde` | 2026-11-23 · es-mobile report and Spanish captures (Employee, 14 routes at 390, 390 with 200% text, 768 and 14 |
| claude-codex-collab-nevora-es-owner | `6de7c2dc23` | 2026-11-23 · es-owner second release: report section and Spanish captures (Team availability, Home, Notificati |
| claude-codex-collab-nevora-es-payroll | `89824b49d7` | 2026-11-23 · Payroll Spanish: report (with every Payroll line in English and Spanish for Jose) and Spanish cap |
| claude-codex-collab-nevora-es-rest | `eced81af42` | 2026-11-23 · es-rest R2: report section and Spanish captures (Insights and Clocker settings at 390, 390 with 2 |
| claude-codex-collab-nevora-es-rondo | `9ceeb06ec2` | 2026-11-23 · es-rondo report and Spanish captures (H1–H6, Owner and Manager, 390, 390 at 200% text, 1440) |
| claude-codex-collab-nevora-kit-final | `2f3e56177a` | 2026-11-25 · Merge branch 'claude-codex-collab-nevora' of https://github.com/JoseK0514/NEVORA into claude-code |
| claude-codex-collab-nevora-messages | `867fdc8766` | 2026-11-23 · Messages: screen-reader names match the visible text and every target is 44px (B3, B7) |
| claude-codex-collab-nevora-messages-2 | `170d012272` | 2026-11-23 · Messages part 2: report and production captures (B3, B8; Owner and Manager; 390, 768, 1440) |
| claude-codex-collab-nevora-payroll-2 | `d9282e7191` | 2026-11-23 · Signed-in Spanish: <html lang> follows the person's language (the root starts it from the sign-in |
| claude-codex-collab-nevora-prodcheck | `19c9b09fe4` | 2026-11-23 · Prodcheck: production-build re-verify report, captures and rows.json |
| claude-codex-collab-nevora-profile | `a25021850a` | 2026-11-23 · Profile I5: drop the passkey view's unused mobile prop read (typecheck) |
| claude-codex-collab-nevora-qa | `b00d186395` | 2026-11-26 · QA: Spanish integration release check final report; RESUME marked done; O1 recheck on 95e390851 |
| claude-codex-collab-nevora-requests-account | `ea2601e589` | 2026-11-23 · Requests and account: report after the E1 and F4 accessibility pass |
| claude-codex-collab-nevora-rondo | `8a400c4213` | 2026-11-23 · Rondo and Insights: captures refreshed from the merged tip |
| claude-codex-collab-nevora-schedule-tools | `a2381a1671` | 2026-11-23 · Schedule tools report: accessibility pass and scope note |
| claude-codex-collab-nevora-schedule-tools-2 | `dcc12231d4` | 2026-11-23 · Schedule tools part 2: after shots, rows.json and report (C10, C12) |
| claude-codex-collab-nevora-screens-final | `0dab3e15ee` | 2026-11-26 · Guides: the build on 1c67cf9d as a git bundle (parent 1c67cf9d), with how to fetch it |
| claude-codex-collab-nevora-settings-2 | `5032ed10b5` | 2026-11-23 · Settings part 2: captures, rows and report for J13–J15 |
| claude-codex-collab-nevora-settings-base | `cbc3d4bc72` | 2026-11-23 · Settings: shared Direction B parts |
| claude-codex-collab-nevora-settings-billing | `528f77995e` | 2026-11-23 · Settings billing package: shots, rows.json and report |
| claude-codex-collab-nevora-settings-final | `109e6acc81` | 2026-11-23 · Package X: tab bar in a new company is by design (sheet pages cover it); evidence and explanation |
| claude-codex-collab-nevora-settings-locations | `0e21bbbcaa` | 2026-11-23 · Settings Locations: production captures and report |
| claude-codex-collab-nevora-settings-policies | `27a6143487` | 2026-11-23 · Settings policies: production captures and report (J10, J11, J12) |
| claude-codex-collab-nevora-settings-positions | `db6508e85d` | 2026-11-23 · Settings J8/J9: production captures and report |
| claude-codex-collab-nevora-staff | `83a43d0031` | 2026-11-24 · Spanish integration: report records the 4272b902 merge and the latest checks |
| claude-codex-collab-nevora-sweep-1 | `156a173557` | 2026-11-23 · Browser QA: admit a cancelled authority read under the same opt-in; drop the GET witness here |
| claude-codex-collab-nevora-timecards-final | `8e9c11eada` | 2026-11-23 · Merge the English "Close open punch" card (633c623d, d26b2ff5) into timecards-final |
