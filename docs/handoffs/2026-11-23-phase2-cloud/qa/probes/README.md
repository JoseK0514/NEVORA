# QA scratch probes (Phase 2 cloud QA)

These are the QA session's working scripts, kept here so they survive a container restart. They aren't part of the app
or its tests. Their code files end in `.txt` so the repository's typecheck and lint skip them. To run one, copy its
folder out and remove the `.txt` endings.

Each `*.sh` copies one `*/zz-probe` folder and its `vitest.zz-probe.config.mts` into the checkout and runs it as the
`postgres` user. The database is a throwaway local PostgreSQL started by `zz-probe/pg-runner.mjs`, a copy of
`scripts/payroll-postgres.mjs`. Evidence goes under `/home/qa-evidence/<label>`, and the script removes the copied files
when it finishes. Fictional data only.

| Script | What it runs |
|---|---|
| `browser.sh`, `gate2.sh`, `gate3.sh`, `final-gate.sh` | Readiness browser tests and release gates |
| `payfix.sh` + `payfix/` | The clocked-in Payroll export probe |
| `step1.sh` + `step1/` | The step 1 screen recheck (Time off scoping, counts, legacy phone) |
| `rel2.sh` + `rel2/` | Release follow-ups (billing slow, tab bar, segments, Insights, back link) |
| `clk.sh` + `clk/` | Clock in at in WebKit and Chromium (`CLK_ONLY=focus` or `CLK_ONLY=extra` runs one part) |
| `sweep/` | The Owner release sweep |
