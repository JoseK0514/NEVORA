# Trial expiry during an active recorded shift

Jose explicitly answered: “Allow finishing the existing shift; block new clock-ins.”
This is a new approved rule, superseding the all-punch restriction only for an
authoritative trial_ended state. Existing punches are preserved. No grace period,
automatic close, paid/canceled/overcapacity waiver or outage fallback is added.

The exact tablet shell/manifest and setup/PIN/punch handlers may be admitted under
that validated trial authority. Existing origin, registered-device, current PIN,
active employee, location, revision and ledger authorization remain. Restricted
setup only reconciles an existing registered device; it cannot prepare/redeem a
new tablet. Enrollment and punch writes fence the effective grant deadline inside
their transactions before and after waits/writes. Operational trial grants also
end at min(validUntil,trialEndsAt), so a pre-expiry request cannot create a shift
or register a device after expiry. Only the exact open entry whose recorded
ClockIn predates trialEndsAt may record break changes or ClockOut. Existing
same-command ledger replay stays read-only; changed replay remains COMMAND_REUSED.

Own state/receipt reads remain usable after closure to recover an uncertain
ClockOut reply. Presentation enum finish_shift/paused hides new ClockIn and avoids
a false other-location notice; one necessary EN/ES paused notice uses the existing
component/layout. This is the minimum workflow behavior for the explicit policy,
not a redesign. Claude retains later UI redesign. Continuation creates no photo
intent/capture and opens no photo API. Other operations and unsupported restriction
reasons remain gated; unavailable authority never creates a false success.

Evidence in the sole finisher's projectless work directory:
- Route RED5fail/18pass then GREEN23; related110tests/10files pass.
- Initial real owned SQL RED9fail then GREEN9.
- Review reproduced two new tablet-enrollment expiry races (200 after before/after
  waits) and the changed-replay response difference. Fixed guards return rollback/
  conflict without changed time, credentials or ledger. Fifteen focused controls
  pass;26 other tests deliberately unselected in that focused run.
- Full five affected SQL files:179 passed,0 failed,0 skipped,121.05seconds; owned
  PostgreSQL17.10 stopped. Typecheck passed.
- Read-only design and code reviews retained their original REQUEST_CHANGES;
  trial-continuation-review-final.md is CLEAR/APPROVE after both fixes.
- Fixture mistakes (missing import, wrong pending active/version expectations)
  are retained as fixture failures, not claimed product defects.

No rendered browser/combined lifecycle, final-source publication, hosted provider
or physical-device acceptance is claimed by these source/SQL tests. Regenerate
source-bound manuals and run exact combined local/browser/CI gates after the
Cloud billing delta and Jose-approved durable idempotency change are assembled.
Main/production remain approval-gated; the original hosted packet remains held,
unstarted, with null timestamps/all effect counters zero.
