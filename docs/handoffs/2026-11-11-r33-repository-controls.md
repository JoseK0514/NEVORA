# R33 repository protection and candidate publication

Repository: private `JoseK0514/NEVORA`. Authenticated administrator access was
verified. The GitHub connector lacks protection administration, so the existing
authenticated GitHub CLI performed these bounded administrative changes. No
purchase, subscription upgrade, repository visibility change, Actions dispatch,
branch push, main commit or production deployment occurred in this step.

## Applied and read back

Prepared exact payloads: `docs/security/repository-controls/{development,main}.json`.
Live API PUT followed by separate GET readback succeeded for both branches:

- Strict required statuses, bound to the verified GitHub Actions App15368:
  validate, clocker-postgres, phase-d-attendance-ui, management-review-ui,
  release-postgres, phase-e-postgres, phase-e-ui, phase-e-evidence, onboarding-backend, mobile-access.
- Administrator enforcement; linear history and conversation resolution required.
- Force pushes and branch deletion disabled. Repository remains private.

No required-human-review count is invented for this sole-collaborator repository.
Independent local QA and Jose's production approval remain procedural gates, and
main/production remain held. Protection settings do not certify a source or grant
production authorization. Any later weakening requires the explicit approval
required by AGENTS.md; do not delete protection merely to complete a push.

Dependabot vulnerability alerts were enabled and GET returned204. Automatic
security-fix PRs remain disabled; no bot PR or extra CI was started. Ten currently
open alerts describe the older default main dependency (Next16.3.6), including
critical findings patched in16.4.1. This candidate is pinned16.4.2 and its current
full npm audit reports zero vulnerabilities. Do not dismiss default-branch alerts
or imply main has been patched: main integration is separately unauthorized.
Code-scanning API explicitly reports disabled. No CodeQL/GHAS scan, paid feature,
clean scanning result or full vulnerability certification is claimed.

Sanitized raw apply/readback receipts, enabled-alert response, open-alert metadata,
code-scanning response and npm audit are outside source at
`/Users/josek0514/.codex/release-completion-20261111/r33/`.
GitHub preserves existing check order when appending a new one; verification
compares the exact context/App pairs independent of presentation order.

## Actions before development, preserving three branches

Jose requires all implementation, local checks and independent review complete
before Actions, then development publication. The CI and web Mobile Access workflows now support an
explicit `candidate/backend-completion/**` tag push. This permits an immutable
candidate SHA to run the full unchanged required graph without a fourth branch,
touching held Claude's branch or first updating development. All checkouts and
receipts continue to bind to the commit SHA. No tag is published until those local
gates pass. This mechanism is prepared, not evidence of a hosted run.

After every required check succeeds on that exact commit, re-fetch development,
reconcile the source inventory and confirm fast-forward ancestry. Publish only
the reviewed candidate to development, with no force or administrator bypass.
If development advances, stop the stale publication, integrate/requalify the
changed candidate and rerun affected gates. The ordinary development push pipeline
remains enabled. Tags are immutable custody; never move a failed tag to new bytes.
Main, Vercel Git deployment hold, hosted migrations and production stay separate.

Fresh API readback proves supported server controls, superseding historical
“unavailable private-plan protection” statements for these two branches. Final
independent review, exact-candidate CI, development publication and any hosted
acceptance still require their own receipts. No control exception is requested.

Primary references:
[GitHub branch protection API](https://docs.github.com/en/rest/branches/branch-protection),
[push workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#push).
