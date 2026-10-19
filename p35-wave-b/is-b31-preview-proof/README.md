# IS-B31 proposed Enter pending-focus fix

Frozen source9bd265e, read-only. Exact `IS-B31.patch` was applied only to the owned external preview mirror. Source and mirror baseline hashes were recorded; the mirror was restored before clean shutdown. No claude/release-candidate edits or business writes.

Before:16/16 cases reproduce pending focus dropping to BODY. After:16/16 pass across staffing, coverage period and both policy forms in Chromium/WebKit at390/100% and320/200%. The original field remains active, enabled and read-only while held; ArrowUp/Backspace cannot edit it. Native second Enter plus requestSubmit produce exactly1 intercepted POST per case. Failure leaves the original field active, restores prior disabled/readOnly states and FormData. No action reaches the server. Action binding IDs remain unchanged before/after. Existing server action/revision/payload construction and synchronous busy guard are unchanged by the patch.

The initial baseline selector run is preserved separately as harness-incomplete evidence. One WebKit policy submit timed out without a request, then its isolated retry reproduced the defect; both raw attempts are kept. Chromium320/200 staffing also failed to restore focus after failure in the source run; the after patch restores and preserves it.

Patch, full before/after JSON, exact harness, logs, crops, provenance and source/closed runtime manifests are beside this file. This is implementation validation, not independent finding closure or full exit certification. Source remains open.
