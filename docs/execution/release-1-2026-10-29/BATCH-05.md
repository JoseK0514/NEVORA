# Batch05 — Hosted Access fixture repairs

Local validation complete at8fb7274f; a successful hosted replay is still required. No application UI, authorization, provider, migration or rollout flag changed in this batch.

Hosted RED: run40945665879 checked out3e0fa436, installed the pinned Node/browser/PostgreSQL runtimes and reached real tests. The guide passed396 checks. The journey failed at the final WebKit Manager login: the test reused the original Owner context and a navigation to login was interrupted by app. The landscape case recorded80 valid Chromium/WebKit layouts with no assertion failure, then timed out on networkidle before completing Firefox. These are preserved; not called a hosted pass.

Repair1: the final independent Manager issuance-denial check signs in through normal credentials in a fresh browser context. The original Employee→Manager→Employee account-switch flow remains untouched. The new context retains window/navigation/error observation and confirms Manager Home before the same403 assertion. No cookie injection, permission bypass, retry or exception suppression.

Repair2: the public landscape case waits for its actual visible mobile header and form card instead of waiting for the network to become idle. All120 geometry/theme/text cases,24 unique-field/value-custody rotations, target and native keyboard/focus assertions remain. No timeout increased. Before-copies are retained in the ignored execution workspace.

Local GREEN: all3 Access tests,18 real journey checks,66 authenticated guide samples,396 native guide samples (minimum5.42085:1),120 landscape cases and24 rotations; no failures/runtime/window exceptions. Owned application/SMTP/PostgreSQL closed normally. Default10,229 passed/0 failed/801 pending; full nonincremental TypeScript, ESLint, real owned startup and source-bound build all exit0, source unchanged. BATCH-05-RESULTS.json pins receipts.

The workflow runner.temp repair is already verified to start hosted jobs and install all runtimes. That is configuration/runtime proof, not successful hosted journey proof. The next run must pass before that gate is closed.
