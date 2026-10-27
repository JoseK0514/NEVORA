# Employee mobile account deletion requests

Implemented **Your account → Help and legal → Delete my account** in the isolated React prototype. The review is open in the existing Employee browser tab. Final HTML SHA-256: `39824ad0714e00496ed97019a2297e9d4b607783993a2ffcbacd94e7ff547cda`.

## Behavior and boundaries

The read-only source at46e202786863279302026ee03a0e225c359fa55c derives identity from the signed-in session, requires password verification, records the policy version and accepts one open request per employee. Acceptance stores the request, ends sessions and revokes calendar feeds in one transaction. Received/duplicate is not completed erasure. Ten frozen source hashes are in `work/employee-mobile/references/deletion-source/manifest.json`. The existing policy snapshot supplies completion/retention text; this task does not certify legal validity.

The mobile review identifies only the sample employee, separates immediate access consequences from later erasure, and provides retention/full legal details. Confirmation uses only **demo-only**, explicitly prohibits real passwords, and requires acknowledgement. Keep remains available before submission; pending submission blocks duplicate presses/navigation. Wrong demo verification, known pre-acceptance failure, unavailable service, loading/failed reads, policy changes, and unconfirmed results have distinct behavior. The connected-app integration must preserve the difference between a definitely unaccepted failure and an uncertain transaction outcome.

Own identity/proof/active-access and published legal facts gate entry, review, confirmation and receipts. Foreign/denied/expired/disabled identity never exposes private records or controls. Password text lives only in the form component and is discarded after submission/unmount; Model receives only a demo-verification boolean. There is no target employee selector, manager erasure, Employee withdrawal, retention editing or workspace deletion.

Received/duplicate/unknown results close only this sample session, clear private work/capability state and fence old callbacks. Received/duplicate retains a transient fictional reference; unknown has no reference or blind resubmission. Direct public receipt URLs cannot retrieve/invent a receipt. Leaving/refreshing loses the in-memory reference; the UI tells users to keep it. The existing public legal reader remains separate and gains a sample-review entry only for a trusted active sample account.

No real credential, request, account deletion, biometric/device permission, API/DB/authentication mutation or email occurs. The only persistence is the preexisting namespaced sessionStorage ended boolean; identity, credentials, references and work data are not stored.

## Checks actually run

- Strict TypeScript and esbuild source/saved/served comparison pass. CSS variables and source-size limits pass:75 modules, maximum183 nonblank/noncomment lines.
-33 deletion groups pass in each Chromium/WebKit/Firefox, including own/policy gates, explicit acknowledgement, missing/wrong password, repeat verification, Keep/Back, retention/public-details round trips, received/duplicate/unknown, lost-session fencing, read refresh and keyboard Enter/Space.350 prior groups also pass in each engine, for383 grouped checks per engine. Final-hash records are aggregated in [checks.json](checks.json).
-18 pure deletion groups pass: own/active/proof/legal/read gates, acknowledgement/demo verification, operation/policy binding, stale callbacks, idempotent completion and duplicate reference, known/unknown failures, receipt matching and sign-out clearing. Existing model suites also pass.
-31 current screenshots cover review/confirmation at320/390/430/884 in Light/Dark, retention, wrong password, accepted/duplicate/failed/unknown, and200% text confirmation/action/receipt views.884 evidence is the430px app-element crop from that viewport. All current capture hashes/origins are checked.
-No page errors, native credential/permission calls or external/mutation requests were captured by the focused runner. Cookies/private storage remain empty apart from the allowed anonymous ended marker. No real account data is used for QA.
-21st catalog metadata was searched; existing primitives fit without component installation or paid generation. Its final review reports7 files,0 findings. The active design hook reported no deterministic findings; it was not rerun as a separate detector.
-87 public PNGs have current origin metadata and verified hashes. The preceding77-image bundle and checks are preserved under evidence/deletion-pass/before/published. Shared Light/Dark palette files match the baseline byte for byte.

## Review and handoff

The [independent full review](deletion-ui-review.md) records **ship / APPROVE**, no required corrections, within screenshot/source scope. The [design record](deletion-design-record.md) compares the extension with existing tokens and controls. Substitute reviewer/documenter roles were used because the skill’s named roles are unavailable. Neither record substitutes for the executor’s separate browser runs or claims native-device, assistive-technology, production-authentication or legal certification.

New files under work/employee-mobile/src: AccountDeletion.tsx, DeletionConfirmation.tsx, DeletionResult.tsx, deletion-model.ts and AccountDeletion.css. Integration is confined to Employee App/model/session/AccountTools/PolicyReader/build and scoped tests/docs. Actual app checkout was read-only; no branch, commit, PR or deployment was created. Next user action: review the local mobile journey. Real password/session-backed submission remains integration work; gated Pay statements and the final desktop/mobile parity audit remain next prototype steps.
