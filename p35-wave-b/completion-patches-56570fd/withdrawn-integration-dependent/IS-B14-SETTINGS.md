# IS-B14 Settings candidate completion (also preserves IS-B27 initiating-form intent)

Candidate-only against56570fd. Source9bd/ready368 already fixed these IDs with SavingForm; no new ready patch is needed beyond B31-ready PendingLabel reservation. Primary report interaction-states.md:30 (IS-B14 all three Payroll settings buttons); source fixed row147; IS-B27 initiating-only requirement165/202.

Use existing PendingLabel around the unchanged three idle labels with Saving…. Pending condition is busy plus the distinct canonical action (SAVE_SETTINGS/SAVE_EXCEPTION/SET_GRANT), so only the actual initiating form changes its label. Depends on transient UI metadata supplied by IS-B33. Original requests and submit handlers are unchanged. This proposal is a separate named historical completion; IS-B31 does not claim it.

This patch is against56570fd's original button lines. If applying after IS-B31, retain the new aria-disabled props when adjusting those three one-line label hunks; do not replace the full external after-file over newer work. No app edits/tests/runtime.
