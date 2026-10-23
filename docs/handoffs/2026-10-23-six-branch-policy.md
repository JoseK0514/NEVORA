# Active remote branch limit

Jose explicitly changed the limit on 2026-10-23: “We will now leave it on 6 for now not more”, then clarified “One is for Claude”.

Preserve the six existing remote branches, including Claude-UI-Fix. Do not archive or retire that branch under the superseded five-branch proposal. This authorizes a maximum of six, not a seventh branch or automatic acceptance of new work. Exact source heads, ancestry, classification, recoverable historical archives and the main/development protections remain enforced.

The inventory and validator both cap active remotes at six. The regression retains five-versus-six enforcement when a lower limit is configured, accepts six fully classified heads under the approved limit, rejects a seventh and rejects a configured ceiling above six. The new six-branch case failed against the previous validator before the bounded correction; its RED log remains in the external integration evidence.

This policy update does not waive CI, independent QA findings, deployment/environment custody or production authorization. Owner AI publication continues through the existing PR25 after a fresh source-gate PASS. All local branches and worktrees remain preserved.
