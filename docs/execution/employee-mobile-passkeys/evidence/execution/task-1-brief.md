## Task 1: own binding and finite controller

Add opt-in Employee/Lead lifetime binding to existing protected endpoints; absent header retains legacy contracts. Server always requires current actual session. Own metadata has a DB-clock/session-bounded <=45second lease. Reuse guarded canonical list and registration/removal. Strict metadata/receipt parsing, bounded headers/body, abort/fence late results, no private persistence. Synchronously expire stale command admission. Native prompt may blur the page: release visible private facts without launching a second ceremony; recheck canonical authority before verification. Pagehide/offline/signout/account storage end or cancel safely. Unknown verification is never resubmitted; fresh list reveals current facts without claiming original success. Removal retries cannot target a different ID.

Tests: original HTTP contracts plus own binding/lease/session loss, parser faults, delayed/ignored abort/expiry, prompt cancellation/blur, late verification/account switch, uncertain writes/current reads. Expected: new regressions RED before production changes, then targeted GREEN.

