# AL-WA-10 candidate-only repair — 06be59a

The genuine Review replacement branch loses its content gutter because form.wa-form resets the same element's nv-content padding/margin. Candidate-only commit **06be59aee4ab8869656209fa65dc04b3dc912449** wraps that form in the existing content/narrow container and leaves form behavior unchanged. It changes one file, five insertions/two deletions; no shared CSS, command, hidden value, authorization or wording changes.

The pre-edit file is byte-identical in candidate45, frozencd764f6 and newer15a0fcd7. [Named measured finding](../../../p35-wave-a/combined-cd764f6-cloud-full/alignment.md), [one-finding git-format-patch](../later-unpublished-patches/46-AL-WA-10.patch), [receipt](receipt.json).

Existing focused tests14/14, focused ESLint and whole-project TypeScript pass. Browser checks of the repaired SHA remain pending. The independent fullcd review still records this finding as open; no exit is self-closed. This commit is local on codex/release-candidate, separate from the immutable published33. The obsolete45 base's six unrelated full-lint errors are still documented; focused checks are not a fresh all-gates result. Claude should review/port only this named commit/patch, not merge the entire old45 base.
