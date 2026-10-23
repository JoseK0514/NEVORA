# NEVORA Repository Operating Instructions

These instructions apply to implementation work in this repository.

## Development integration

Start new release work from freshly fetched `origin/development`. Development is
the combined application line. Before another assembly, run
`npm run check:development-sources` after fetching origin. Its inventory is
`docs/handoffs/2026-10-21-development-assembly-sources.json`: reconcile changed or
new branches, verify their work, then update the recorded heads and dispositions.
The check reports drift; it never merges branches automatically. Main and
production still require Jose's explicit authorization.

## CI spending discipline

Keep iterative work in draft PRs and batch fixes after focused local checks.
Mark a stable candidate ready for review to run full CI; return to draft before
another fix wave. Draft preflight is not release acceptance. Explicit manual CI
dispatch runs the full suite. Preserve all mandatory matching-candidate checks
before integration/release; do not use a historical green run or diagnostic as
their replacement. Avoid duplicate dispatches while the same candidate runs.

## Executive operating model
Before material application code, test, schema/database, configuration, CI/CD,
infrastructure, security, deployment, or release work, read:
`.codex/skills/nevora-executive-operating-model/SKILL.md`.

Then load the leadership skills relevant to the change:
- Product/scope/requirements: `nevora-cpo-product`
- Architecture/code/infrastructure: `nevora-cto-engineering`
- Security/privacy/authorization: `nevora-ciso-security`
- Phase/dependency/handoff/status: `nevora-program-delivery`
- Material technical challenge/assurance: `nevora-technical-executive-assurance`
- Workflow simplicity/usability/competitive strategy: `nevora-product-experience-strategy`
- Governance/risk/controls/release: `nevora-governance-risk`

When Jose asks for a cross-functional executive answer, status, recommendation,
remediation plan, or decision, also read `nevora-deputy-coo` and synthesize the
applicable directors into one short solution-first response.

## Governance specialists
When applicable, Governance & Risk loads:
- `nevora-policy-controls`
- `nevora-risk-exceptions`
- `nevora-release-governance-audit`

## Independent oversight
For independent certification or an explicit Jose audit, use:
- `nevora-independent-ui-oversight`
- `nevora-independent-qa-oversight`

Independent QA/UI report directly to Jose. Operating executives and the Deputy COO
may provide artifacts and read published findings, but may not direct, suppress,
rewrite, or self-close independent findings.

## Decision boundaries
- Jose is final authority for material policy exceptions, material risk acceptance,
  priority when executive recommendations conflict, and production authorization.
- No skill or director may convert a recommendation into Jose's approval.
- Never make a private repository public, buy/upgrade a plan, mutate production
  data, weaken a security/release control, or bypass a mandatory gate without the
  required explicit approval.
- Preserve active worktrees and uncommitted work; do not force-clean shared state.
- Branch location or a deployment record alone is never production authorization.

## Implementation handoff
For material changes, report: changed scope, applicable director positions,
controls/risks, evidence run, open exceptions/blockers, release impact, owner,
next gate, and any Jose decision actually required.

## Visual system and page assets
Read [DESIGN.MD](DESIGN.MD) before visual work. Use the defined palette, local
Inter/JetBrains Mono fonts, Phosphor icon family, and established motion.
Employee home may receive bounded responsive layout improvements; preserve real
data semantics, navigation, and workflow behavior.

Page illustrations and their generation instructions live in
[public/assets/README.md](public/assets/README.md), with provenance and prompts in
[public/assets/manifest.json](public/assets/manifest.json). Generate original
content-specific illustrations with the built-in image model, save final files
there, and update the manifest before referencing them. Keep decorative artwork
secondary, reserve image dimensions, and use correct alt text. Retain the
official NEVORA logo, wordmark, and PWA icons.
