# Phase C release control

Phase C release control is SHA-based, not branch-name-based.

## Required path

**Frozen SHA → exact CI → isolated Preview → hosted schema/runtime validation → independent Codex review → ChatGPT executive review → Jose production approval.**

No earlier CI run, local checkpoint, branch name or Vercel URL certifies a later commit.

## GitHub enforcement limitation

For this private repository, the GitHub branch protection / ruleset API currently returns a plan-level 403 indicating that the feature requires a higher plan or a public repository. Until that account constraint changes, do not claim GitHub-enforced branch protection.

The procedural control is therefore mandatory:

1. Freeze and record one exact candidate SHA.
2. Do not direct-push a release into `main` or `development`.
3. Require the candidate SHA's CI jobs to succeed.
4. Preserve exact-SHA local browser evidence for browser suites that are not CI-capable.
5. Deploy only that candidate to isolated Preview and map the deployment back to the SHA.
6. Validate the numbered migration chain on the isolated Preview database.
7. Complete FR-AUTH-001 independent review on that same integrated SHA.
8. Require Jose's explicit production authorization.

## CI boundary

Normal CI validates unit tests, typecheck, lint, production build, production dependency audit and persisted Clocker PostgreSQL. Phase C and release branches additionally run the release PostgreSQL integration gate: Foundation, Phase B authorization replay, generation, shift-change and notifications.

Current Chromium/WebKit acceptance scripts depend on the controlled browser runtime used by the local QA environment and are not represented as GitHub-hosted browser CI. They remain an exact-SHA mandatory release artifact until a repository-owned browser dependency and deterministic CI harness are separately approved.

## Production boundary

Live Clocker punches remain disabled unless `NEVORA_CLOCKER_PUNCH_ENABLED === 'true'`. Enabling the flag is a separate production action after all release gates close. Hosted database migration, provider activation and production deployment are never implied by a passing local suite.
