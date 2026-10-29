# Active remote branch limit: seven

On October 27, Jose authorized a maximum of seven remote branches and the new
`claude-codex-collab-nevora` branch. He clarified: “we will increase to 7 branches
but if ci spending controls needs to be updated due to this action then make sure
is worked too”. This supersedes the October 23 six-branch ceiling.

The validator and source inventory now allow at most seven active remote heads.
The named collaboration branch is an allowed assembly branch alongside existing
`codex/` assembly names. Its current remote head must remain an ancestor of the
checkout; the name does not bypass source custody. An eighth branch, an
unclassified source, changed held head, missing included ancestor or changed
archive still fails the gate. Main retains its protected disposition.

This change starts at development `dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2`.
The six observed remote branches are preserved; the collaboration branch fills
the seventh slot. Current separately active Claude and light-default heads are
recorded as held, without merging, approving or altering their application work.
Historical archives and local worktrees remain intact.

## CI spending compatibility

PR27, `codex/ci-spend-controls-20261023` at
`e49edcd8607be18a40fd2c7ae3fc48542d801597`, remains a separate draft. Its changes
do not modify the branch validator, its regression file or the source inventory
relative to its merge base. Its event/draft-based scheduling has no branch-count
condition. A normal merge therefore retains development's seven-branch policy;
no change to that PR, workflow triggers, account billing budget or subscription
is required for the seventh branch.

Development's existing workflow runs on development/main pushes and candidate
PRs, not feature-branch pushes. Creating the collaboration ref does not add a
second CI run for that push. The development policy publication follows its
existing CI trigger. All mandatory release checks and the global Vercel Git
deployment hold remain unchanged. This is not activation or full acceptance of
the separate draft spending proposal.

## Verification

- The two new scenarios first failed against the old implementation: the
  collaboration name was rejected and a seven-branch ceiling was invalid.
- Thirty source-inventory, archive-custody and current CI-contract tests pass.
  Existing local installed `js-yaml` was supplied through `NODE_PATH`; no package
  or lockfile was changed. The initial worktree-only test attempt could not load
  that dependency; the complete rerun passes.
- The draft spending policy's four existing tests, including its actual CLI,
  pass from an isolated temporary copy of its exact committed scripts.
- The live source gate passes against the six existing remotes before
  publication; the same gate must pass with seven after branch creation.
- Inspector archive custody verifies all 409 files, including 50 reports and
  310 screenshots. This does not accept historical findings.
- `git diff --check` passes. No application build, browser or database test is
  claimed for this tooling-only change; hosted CI is reported separately.

Engineering/Governance: the explicit branch-count authorization is implemented
without a release-gate exception. Release impact: no application or database
change. No main update, deployment, customer-data mutation or branch retirement
is authorized by this policy. Rollback is a normal policy revert after the
seventh head has been separately reconciled; reverting alone would correctly
make the source gate reject seven active heads.
