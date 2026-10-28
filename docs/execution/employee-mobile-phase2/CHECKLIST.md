# Employee mobile Phase 2 — working checklist

Continuation of `codex/employee-mobile-local-resume-20261027` at `003bbe2c`, on branch
`claude/employee-mobile-phase2-20261027` (isolated worktree; the main checkout and the Codex
checkout are both occupied by other work). Phase 3 stays closed until every Phase 2 item below
is done and independently accepted.

Legend: `[ ]` open · `[~]` in progress · `[x]` done with evidence · `[!]` blocked (reason given)

## Feature ports

- [~] 1. Own account-deletion request (mobile + shared lifecycle)
  - [ ] Lost reply never reports "nothing happened" or "completed"; reference recoverable by password check
  - [ ] Unknown storage error classified as uncertain, not "nothing was saved"
  - [ ] Password re-verification counted by the existing login limit (was unthrottled)
  - [ ] Account-changed and signed-out outcomes instead of a bare redirect
  - [ ] One state owner across resize/rotation; Quiet desktop and Manager/Owner preserved
  - [ ] Unit + real-Postgres integration (concurrency, duplicates, stale session, lost reply, consequences)
  - [ ] Browser evidence (3 engines, both themes, 200% text, coarse landscape, keyboard)
  - [ ] Independent code/security, UI/UX, QA review
- [ ] 2. Own published Pay and protected PDFs
- [ ] Phase 2 exit review

## Open corrections and risks (inherited)

- [ ] A. Communications CR4 / UI002 / UI003 (original authors own closure)
- [ ] B. QA-OWN-3 compound notification recovery (unsafe; open)
- [ ] C. Legacy unbound status-cookie race
- [ ] D. Default suite: 13 deterministic request/scheduling + 3 process-observation failures
- [ ] E. Calendar QA-CAL-1 Firefox request-monitor anomaly
- [ ] F. Earlier landscape evidence audit/replay (full-page capture disabled touch emulation)
- [ ] G. Communications fixture forced-abort / cleanup-failure paths

## Findings raised in this continuation

- DEL-1 (security, pre-existing): deletion password re-check bypassed the login attempt limit.
- DEL-2 (correctness, pre-existing): a storage error after commit was reported as "Nothing was
  deleted and you're still signed in". Neon HTTP can commit before the reply is lost.
- DEL-3 (correctness, pre-existing): a lost action reply reached the error boundary; the next
  navigation went to sign-in with no reference, because acceptance ends every session.
- DEL-4 (UX, pre-existing): mobile Profile focus-return hash `#profile-account-deletion` had no
  matching row id.
