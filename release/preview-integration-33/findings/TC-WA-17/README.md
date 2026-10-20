# TC-WA-17 candidate repair

Commit4cadf00f on codex/release-candidate makes the unconfirmed copy receipt describe the recovery actually available. With a retained command it keeps the existing retry guidance; without a command it directs the person to open the schedule and check the outcome. It changes one conditional paragraph and no commands, storage, retries or server behavior.

The independent measured null-command condition and two real viewport crops remain in [the original finding](../../../../p35-wave-a/combined-cd764f6-cloud-full/findings/TC-WA-17/README.md). The fresh QA Owner browser had no pending command; this does not establish that all browsers have no recoverable local command.

The existing page test (one safe unknown-outcome case) and changed-file lint pass. Fresh fixed-source browser proof and owning-review closure are pending. Current complete candidate is4cadf00f; the immutable exact33 ref is unchanged.
