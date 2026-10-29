# Rulings made during this continuation

These are implementation decisions, not Jose's risk acceptance, branch disposition or release approval.

1. Ruling: Continue approved Claude assembly in new detached worktree, rather than reassemble development again; user explicitly requested this continuation. No branch/push/deploy. Cost if wrong: assembly drift; fresh-head ancestry/inventory evidence retained.

2. Ruling: Policy decisions are recorded as reviewable proposals and release gates, never inferred approval. External physical-device/service checks cannot be certified by emulation. Cost: release remains gated until actual evidence/decisions exist.

3. Ruling: Task3 process-supervisor repair is a separate concurrency/security module; switch that bounded task to subagent-driven implementation plus task review while the parent investigates browser evidence. No overlapping ownership. Final whole-change review remains mandatory. Cost: one additional scoped review; no premature closure.

4. Ruling: Preserve the detached review checkout and its evidence for Claude, as Jose requested independent continuation; no automatic worktree deletion. Cost: local disk retained until review is finished.

5. Ruling: Execute the inspected four complete configurations covering all36 effective contracts of all13 specifications, plus affected strict replays, instead of duplicate13-command execution — files, aliases, database namespaces, workers/concurrency and deadlines are equal by executable inspection — cost if inspection misses a semantic dimension: false coverage; unsupported config options fail inspection and raw execution/proof are preserved.

No new minor code-review finding was deferred. Historical authored conditions and real physical/policy/release gates remain explicitly open in the handoff.
