# R6 amendment builder

BLOCK / REQUEST_CHANGES before execution.

HIGH — amend-publication-r6.py:18 compares every changed path from published Y4 to C7 with exactly four QA files. The actual Git comparison includes 50 documentation paths from the intervening R5 metadata and six-guide freeze. The assertion will always stop generation on the intended clean C7 source. Verify exactly four non-documentation paths across Y4 to C7, retain the exact two-path Y5 to C7 guard, and explicitly bind the accumulated documentation paths to Y4 to Y5. The R5 metadata and PDFs retain their own historical provenance.

No critical, medium or low findings. Elsewhere the original 220-file inventory, three failed R5 jobs, Mobile success and unproven initiating cause remain separate from future R6 outcomes. The reviewed per-cell preflight supplies engine/width binding. The operating-ref check requires Y4 on Development. Programming and remove-ai-slops perspectives identified the impossible base comparison as a concrete correctness failure. Static review only; no builder or suite executed.

## Corrected historical comparison

CLEAR / APPROVE for evidence generation after the clean C7 replay closes and its passing receipts are available. Lines 17–20 now test exactly four aggregate non-documentation inputs and compare the historical documentation set with Y4 to Y5. The exact two-file Y5 to C7 guard also excludes later documentation modifications. This matches the inspected Git trees and resolves the HIGH finding. No remaining blockers. Static review did not execute the builder.
