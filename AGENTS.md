# NEVORA Repository Operating Instructions

These instructions apply to implementation work in this repository.

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
