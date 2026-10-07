# Phase D canonical exports and provider mappings

One NEVORA canonical model (version 1) preserves finalized period/employee revision references, source fingerprints, exact recorded elapsed duration, separate break duration and effective entry/break provenance. Its time basis is recorded elapsed time including breaks. It does not classify earnings, calculate overtime, deduct breaks, apply rates, calculate taxes or run payroll.

Mappings are additive, versioned profiles above that model. A profile identifies the exact target product/edition, template verification reference, ordered CSV headings and value sources, fixed account values, employee identifier mappings, date format and hour precision. Missing identifiers, duplicate identifiers, unsupported fields, incomplete finalization or lost authority block generation. Precision loss is rejected by default; half-up rounding requires an explicitly reviewed profile. Canonical durations retain their exact values. Profile and export history are append-only business receipts; generated file fingerprints and immutable source references establish reproducibility. Downloading or regenerating a file does not send it to a payroll provider.

## Verified preset status — October 7, 2026

- **Provider neutral:** NEVORA normalized CSV is available without any provider compatibility claim.
- **ADP RUN generic v1, IID / Employee ID variant:** [ADP's published import guide](https://support.adp.com/adp_payroll/content/hybrid/@runcomplete/doc/pdf/GTS_payroll_guide.pdf) documents the version row, comma-delimited title/detail layout, date examples, account identifiers and numeric widths. The guide is dated 2018; customers must confirm their current enabled account template and account-specific codes before saving a profile. This adapter supports that specific documented layout, not other ADP editions or variants. No earnings/rate code is invented or preselected.
- **QuickBooks Time Premium/Elite:** [Intuit's guidance, updated August 5, 2026](https://quickbooks.intuit.com/learn-support/en-us/help-article/time-tracking/export-import-time-data-quickbooks-time/L1f77o0jJ_US_en_US), directs users to the in-account sample and Help tab for the import columns. Those fields are not in the public article. A QuickBooks preset remains unavailable until an authoritative current template is supplied/verified. Configurable mappings can then describe the verified layout without changing the canonical model. No QuickBooks Online Payroll/Desktop compatibility is asserted.

External provider import acceptance, account feature enablement and payroll business policies remain separate from local format/protocol verification. No provider connection, paid service or production import was created during development.

## Custody and rollback

Migration `0019_payroll_export_mappings.sql` is additive. It introduces profile revisions and generation receipts; it does not rewrite operational records. Application rollback may disable export routes while leaving immutable historical business receipts intact. Production migration, retention governance and hosted provider acceptance retain existing release gates.
