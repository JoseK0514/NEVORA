# NEVORA: three active branches

Jose authorized keeping only `development` (his “dev”), `main`, and
`claude-codex-collab-nevora` on October 28. This supersedes the October 27
seven-branch policy. New isolated work uses detached worktrees, rather than
additional local or remote branches.

## Retirement and recovery

The observed GitHub repository is the private `JoseK0514/NEVORA`; the checkout's
older `Fuel-Scheduler-` origin URL redirects there. Thirteen remote heads were
observed. The ten excluded heads have verified, exact lightweight tags at
`refs/tags/archive/branches/2026-10-28/<original-branch-name>` before deletion.
The source inventory records those exact hashes and a three-branch ceiling.
Retired sources retain their held or included status according to actual
ancestry; deleting a branch does not integrate or accept its work.

The four open source PRs at the retirement checkpoint are #27, #33, #34, and #36.
Deleting their source branches retires those PRs without merging them. Any
future proposal must use the retained collaboration branch and the normal
review and acceptance gates.

The original local inventory contains 128 named branches and 127 worktrees.
All original branch commits are pinned below
`refs/archive/branch-cleanup/2026-10-28T040215Z/` in the original repository.
The external recovery record is
`/Users/josek0514/Documents/ChatGPT/NEVORA-branch-backups/2026-10-28T040215Z/plan.json`.
It records local and remote branch names, exact hashes, and worktree paths.
Retired named worktrees are detached at their existing commits. Their tracked,
staged, untracked, and ignored files are retained in place. No worktree is
force-cleaned or removed. A local `main` ref is restored from unchanged remote
`main`, because the initial local inventory has no `main` branch.

To recover a remote source without recreating a branch, inspect its archive tag
in a detached worktree. To restore a retired named branch, obtain Jose's new
authorization, then use its exact hash from the archive or recovery record.
Only this task's temporary clean policy worktree may be removed after use.

## Verification and controls

The published-policy regression first fails against the seven-branch inventory.
After the update it verifies the three retained names, all exact archive
checkpoints, and rejection of a recreated fourth branch. The existing inventory
regressions continue to check ancestry, changed sources, missing or changed
archives, and protected main/development dispositions.

Before mutation, verify archive hashes and compare every current head with the
recorded expected hash. Publish the development policy, its collaboration
integration, and the ten remote deletions atomically with explicit expected-head
leases. Recheck GitHub and local branch names afterward. Preserve existing
worktree HEADs and complete status output across local detachment and deletion.
Run the live source gate from the collaboration candidate containing current
development; do not use historical inventory snapshots as current evidence.

Engineering/Governance: proceed within Jose's explicit retirement authorization,
with recoverable source custody and unchanged release controls. Owner: Codex.
Release impact: repository policy only; no application, schema, dependency,
workflow, main, deployment, or customer-data change. Hosted release checks remain
separate from local policy verification. No additional Jose decision is required
for this bounded cleanup. Reintroducing retired branches or promoting application
work requires a new authorized task and its normal gates.
