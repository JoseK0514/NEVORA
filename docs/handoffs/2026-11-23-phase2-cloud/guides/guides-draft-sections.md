# Draft guide sections (not built)

Jose approved three sections. Draft text commit `bb8fd629` on ref `guides-draft-sections`, on top of the
payroll-exports text `9a58b09c` (parent `d31842a9`). Not built; after the final SHA both text commits are
cherry-picked onto it and the build goes on top.

- Owner: **Deactivate a location**, **Activity log**, **Delete your own account** (end of `owner.md`).
- Manager/Lead: **Delete your own account** (end of `manager-lead.md`).
- `sources.json`: evidence for each (edit-location-form, location-retirement-copy, activity copy/page, deletion copy and
  screen, access-recovery copy, legal policies).

Exact new text: `guides-draft-sections.diff`. Quoted privacy wording is copied word for word from
`src/components/employee-mobile/deletion-copy.ts`, `src/lib/legal/policies.ts` (DELETION_COMPLETION_PERIOD, support
address) and `src/components/access-recovery/copy.ts` (only-Owner card). A trial build passed check-manuals (owner 9
pages, others unchanged) and was discarded.
