# Independent QA review — Employee mobile Requests

Current candidate `7abcd315ae0f978b74d4a06c2cc1525cc67f362b`, branch `codex/employee-mobile-requests-20261027`.

**QA recommendation: GO for the bounded local QA gate.** Affected verification closes QA’s reproduced dark-band finding and incoming-unavailable presentation coverage gap. Independent UI owns its own finding closure. This is not hosted or production certification.

- Fresh affected browser replay **1/1 passed**, orchestrating28named checks across Chromium/WebKit/Firefox,18contrast measurements and36captures. Requests component **3/3 passed**, including null/0/1/2.
- Incoming-null presentation visibly reports unavailable, preserves the correct For-you link, and retry restores the actual checked-zero response. The fixture derives from actual own response and changes only incoming; it is presentation evidence, not a server-failure simulation or full destination journey.
- Frame/content computed backgrounds match across18engine/theme/width combinations; personally reviewed dark/enlarged-text captures show the old light strip removed.
- Exact current source and owned mirror1916inputs independently rehashed without mismatch. Ownership closed/sourceVerified/mirrorVerified true; owned PostgreSQL stopped.
- Prior independent38PGdomain results retained with1283server/data/schema/domain/helper/config file byte comparisons against d70487c6, zero differences. Those38were not independently rerun in this affected pass. Prior full39/39 twice and focused31/31 remain historical support.
- Raw current console:4deliberate transport/401errors,3WebKit dev CSS-preload warnings,0pageerrors. No claim of a clean console.

Current [affected manual QA matrix](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-requests/independent-qa/final-7abcd315/employee-mobile-requests-manual-qa.md) and [machine-readable manualQa](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-requests/independent-qa/final-7abcd315/manual-qa.json). Historical [initial matrix and preserved failures](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-requests/independent-qa/employee-mobile-requests-manual-qa.md).

Remaining release gates: source inventory/development reconciliation, exact hosted/environment/CI parity, physical devices/AT and Jose production authorization. Real background transitions and deeper management/swap workflows remain outside this bounded evidence. No product/test/config edits or release actions by QA. Next gate: implementation handoff and the independent UI owner’s closure; no user action needed for completed local verification.
