# Commerce recovery UI — bounded Codex completion

November 12, 2026. This supersedes the earlier missing-page note in the finisher
handoff. Jose explicitly reassigned these two screens: "do them so you can finish
it and merge into dev, but claude will then remake them". Codex implemented the
bounded functional pages; Claude retains the later redesign. This does not
reassign unrelated UI or authorize main/production promotion.

Application commit: d2180f7cd (billing, paused Clocker and layout). Browser
qualification source:6aac8f4a23a58064f3c687a95113ec2ff3aec8a7,
tree74b0007c823c622d41fe40de143537006484befd. Later commits freeze documentation
and manuals; candidate/development CI and hosted acceptance remain separate.
The coordinated9d11 middleware patch and every earlier worker/QA fix are retained.

## Result and boundaries

- /app/billing requires a current session. Only the Owner mounts the private
  status component. Other roles receive contact-Owner guidance and an own-pay
  link when enabled. The API independently rechecks current Owner/company
  authority; the UI never supplies business, customer or installation IDs.
- Status uses the existing no-store GET /api/commerce/status and strict public
  parser. Loading, missing configuration, invalid payload, denied authority,
  restricted/trial/paid/grace presentation and manual refresh have bounded states.
  A failed or denied refresh clears prior private status. No automatic polling.
- An explicit Owner action uses the existing POST /api/commerce/handoff. The
  trusted exact-origin /pages/plans#handoff destination is validated before
  navigation. No token is logged, persisted or sent to analytics. There is no
  charge, enrollment, Tax or direct subscription mutation from rendering a page.
  A return from Stripe is not presented as payment confirmation.
- /clocker/access/paused has no private billing read. It offers a bounded original
  /clocker/<key> return and normal Owner sign-in; arbitrary destinations, queries,
  fragments, arrays and overlength keys are refused. English and Spanish copy
  use existing language selection and Signature tokens.
- Proxy overwrites the recovery presentation marker on exact admitted GETs and
  removes any caller marker on ordinary app routes, including disabled commerce.
  The server layout keeps current session/native-role admission first, then skips
  operational shell readers on the exact billing/export/own-pay recovery paths.
  Protected page/API authorization is unchanged.
- A client boundary unmounts retained operational pollers and parallel sheets on
  recovery entry. A recovery-first layout obtains a fresh document before opening
  an operational route. Aborted/unmounted status and handoff requests cannot
  later update the view or navigate away. The marker is presentation only.

## Actual evidence

Seven added layout/header regressions failed against the earlier source while
52 existing controls passed. The corrected initial set passed59. New page,
role, safe-destination and retained-layout controls brought the direct UI set to
79; the broader affected commerce/backend set passed138. Existing independent
resource-scope tests cover preserved primary/teardown failures and all cleanups.
The first UI review found teardown could skip the owned app after browser-close
failure. The test now reuses the established withOwnedTestResources utility,
registering each cleanup immediately; no assertion was suppressed.

At exact6aac source, both new browser tests passed in Chromium and WebKit:
normal fictional Owner/Employee password sign-in, anonymous admission, actual
Next recovery routes, missing-configuration/handoff failure, bounded response
fixtures for restricted/paid/invalid/revoked presentation, no operational poller
requests, mobile/tablet/desktop widths320/390/768/1440,200% text, measured text
contrast>=4.5, keyboard focus and actual billing→My Pay→Back navigation. Errors[];
owned app and PostgreSQL cluster stopped. Screenshots and reports are retained.

A separate presentation fixture bundles the actual production components with
real React effects and Next PathnameContext. It verifies retained shell removal
and re-entry, loading exclusion, delayed read/handoff aborts with zero attempted
external navigation, trusted handoff navigation to an intercepted fictional
page, and recovery-first exit's native browser reload. It does not substitute
for full Next-router/provider/hosted acceptance. No live third-party HTTP,
provider charge, email, push or hosted quota action occurred in these tests.

Initial fixture/environment errors are retained externally: missing explicit PG
binary selection rejected before allocation; first standalone effect bundle
lacked process.env and failed before mounting. Corrections use the existing
owned PostgreSQL runtime and explicit browser-build environment; application
assertions/timeouts/authority guards were not weakened.

## Claude and release handoff

Preserve these API/session/company boundaries and failure/cancellation behavior
when remaking the screens. Keep Signature tokens, accessible controls, language
selection and the shell-free recovery composition. Do not blind-port the older
single-company04fe layout. Run rendered browser checks and all exact-source
candidate/development gates after changes.

Development remains the primary operating/acceptance release at production
standards. Only the exact verified combined release may be promoted after Jose's
approval. The finite hosted packet remains held/unstarted until release/source,
provider/capacity/restore/principal/normal-sign-in gates pass;50minutes maximum,
cleanup by45, no additional effects. These local browser fixtures do not certify
Stripe, payroll publication, push receipt, hosted worker recovery or financial
policy. SCRUM-190/146 and separate Rondo155 retain their actual open criteria.


Final source follow-up: TypeScript identified stale narrowing after the async
fixture's handoff slot was cleared. Test-only commit4336dd89f reads that callback
slot through its declared optional route type. Scoped lint/typecheck,83 direct
UI/resource controls and both native-engine effects checks pass afterward. No
production UI, authorization, assertion or timeout changed. The initial compiler
failure remains retained outside the repository. Six guides are regenerated
against4336dd89f; final candidate/development runs must bind the resulting commit.
