# Observability plan — error reporting, analytics, uptime

October 21, 2026 · Today the codebase has none of the three. Order of value: errors, then uptime, then
analytics. Every piece respects the privacy posture: fictional data in previews, no employee PII in any
third-party payload, nothing on by default in development.

## 1. Error reporting (first)

- **What:** Sentry (or GlitchTip self-hosted if no third party is wanted). Client + server + the API
  routes. Scrub: names, employee IDs, punch times — report route, release, stack only.
- **Needs Jose:** create the account/DSN, decide third-party vs self-hosted.
- **Needs Codex:** the wiring (instrumentation file, release tagging to the deployed commit, source maps),
  env-gated so previews and dev send nothing unless `NEVORA_TELEMETRY=on`.
- **Acceptance:** a thrown test error in a preview with the flag on arrives tagged with the commit; the
  payload inspected once for PII before any production use.

## 2. Uptime and status (second)

- **What:** an external pinger on `/login` and one authenticated-path health route, plus a public status
  page (hosted status product or a static page updated by the pinger).
- **Needs Jose:** pick the pinger account; decide whether the status page is public at launch.
- **Needs Codex:** a cheap `GET /api/health` that checks DB read and reports version — no tenant data.

## 3. Product analytics (third)

- **What:** page-level usage only, self-respecting: PostHog or Plausible. Questions it must answer at
  launch: do employees sign in at all (activation), do they return weekly (retention), which pages carry
  the load, where does sign-in fail. No session replay, no employee-level profiles.
- **Needs Jose:** tool choice and the privacy line in `/privacy` (one sentence, both languages, counsel
  sees it with the rest).
- **Needs Codex:** the include, env-gated like Sentry; events named after pages, not people.

## What is deliberately not here

No marketing pixels, no A/B framework, no heatmaps — wrong stage, wrong trust posture.
