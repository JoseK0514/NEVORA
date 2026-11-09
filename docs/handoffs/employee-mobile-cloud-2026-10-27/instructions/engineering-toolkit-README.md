# Jose Engineering Toolkit

This is a local, isolated tool installation and adoption kit, not instrumentation already deployed to your websites.
No application repository, database, production deployment, subscription, or customer message is changed by installing this folder.

## Installed connections versus working integrations
Sentry, PostHog, 1Password and Codex Security were installed through the Codex plugin catalog. Installation alone does not prove account authorization, project setup, access, plan entitlement, or instrumentation. Finish partner sign-in in the plugin settings. Do not enable paid plans, premium AI analysis, session replay, or personal-data collection by default.

## Use the local tools
Run `source ~/Documents/ChatGPT/engineering-toolkit/activate.sh` in a terminal to expose k6, Semgrep, and Gitleaks for that terminal. No shell startup files were modified.
Run commands below from this directory:

- `npm run verify`: Node smoke-runner unit tests plus browser tests against a disposable LOCAL FIXTURE, not Yavi or Tool Box.
- `npm run load:local`: six requests with two virtual users against a disposable loopback fixture. It cannot target production.
- `npm run security:semgrep`: two starter rules against this toolkit's scripts, not a complete security audit. Use additional reviewed rules appropriate to each real project.
- `npm run security:secrets`: redacted secret scan of this toolkit, excluding downloaded runtimes and fixture reports.
- `SMOKE_EXPECT_TEXT='known homepage text' DEV_BASE_URL='http://127.0.0.1:3000' npm run smoke:dev`: one GET of the homepage.
- Remote development requires `SMOKE_ALLOW_ORIGIN` equal to the origin. Production also requires explicit `PROD_BASE_URL`, HTTPS and `ALLOW_PROD_SMOKE=true` AFTER approval. Redirects are not followed.

The browser fixture verifies Chromium, Firefox, WebKit and mobile WebKit. It does not replace real iOS/Android devices, Safari releases, or business-flow regression tests.
The smoke runner checks status, HTML type and an exact known marker. It cannot verify booking, billing, login, rewards, database integrity, or SMS delivery.

## Adopt into a project
Read the repository's AGENTS.md and inspect current scripts and workflows first. Merge the templates deliberately on an isolated development worktree. Never overwrite an existing package.json, AGENTS.md, test suite, lockfile, or CI workflow wholesale.
Run tests against a disposable database with fake credentials and external sending disabled. Inspect build/start scripts for migrations BEFORE execution. The inspected Yavi remote development build currently includes `prisma migrate deploy`; this must not run with production database credentials.
`templates/` contains adoption guidance, an AGENTS.md outline, and GitHub workflow templates. These are NOT installed CI gates and no branch-protection setting has been changed.

## Existing skills and shared standards
Global working agreements are in ~/.codex/AGENTS.md. Existing personal skills remain in ~/.codex/skills; do not duplicate Superpowers, UI, debugging, release or Git instructions. Load only task-relevant skills.
Local instructions and utilities apply to clients that can access this Mac. Plain cloud ChatGPT does not automatically gain local filesystem access or import local instructions.

## Sources
- https://learn.chatgpt.com/docs/plugins
- https://learn.chatgpt.com/docs/agent-configuration/agents-md
- https://docs.semgrep.dev/getting-started/quickstart
- https://github.com/gitleaks/gitleaks
- https://grafana.com/docs/k6/latest/set-up/install-k6/
- https://playwright.dev/docs/intro
