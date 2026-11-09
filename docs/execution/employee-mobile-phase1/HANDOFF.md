# Employee mobile Phase 1 — implementation and local acceptance

Phase 1 is implemented in the real Next application and accepted within the bounded local scope. Independent UI and QA recommend GO WITH CONDITIONS; code review approves with no blockers. The approved teal direction remains the visual authority. This does not complete Phase 2 or authorize a release.

Application candidate: `74979bbb6e2694eb54a57191f0a8f1267f56d7b8`.
Branch: `codex/employee-mobile-phase1-20261026`.
Base: freshly fetched `origin/development`, `46e202786863279302026ee03a0e225c359fa55c`.
Worktree: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-app-phase1`.
Any subsequent handoff-only commit preserves the tested application bytes; the source manifest and candidate-verification record identify those bytes. No push, merge, PR or deployment occurred.

## Implemented scope

- Shared Employee/Lead mobile palette, semantic typography and spacing, original wordmark, regular Phosphor icons, header and five-destination navigation. Legacy style ownership is explicitly fenced with zero-specificity filters. The native navigation measures its changing height and reserves content clearance.
- Home uses the existing own-data reader and lifecycle controller. Current/next published assignments, attention, week glance and the independently read recorded-clock card retain real semantics. No planned shift fabricates a punch. The recorded-time card remains available when there is no upcoming shift; phone punching remains with the location Clocker.
- Schedule retains own published assignments, source-week/day/shift links, split and overnight meaning, module gates and existing shift details. Its mobile title leads the page; desktop retains its former bar position. The native date field chooses a canonical Monday week and selected day, with keyboard Escape returning focus. Calendar sync retains its original destination.
- Weekly confirmation retains its current displayed revision, original operation ID and server authority. Only a canonical read renders confirmation. A lost committed response retries the same operation; changed or removed publications require a new review, including an empty week.
- Calendar's inherited title/deep-link issue is resolved without changing its public fragment. The fragment targets the visible disclosure, while its panel has a separate accessible heading ID. This avoids the observed browser/React hydration race and preserves disclosure focus.
- Loading, empty, partial, unavailable, offline/resume, module-off, workspace-deactivated, revoked-session and expired-session paths have real local evidence. Foreign assignment entry cannot open another employee's shift. No authorization, service policy or business-data source was weakened.

Main implementation: `src/components/employee-mobile/`, AppShell, EmployeeHomeQuietView, EmployeeMySchedule, CalendarSubscriptionPanel and ProfileCalendarDisclosure. The owned browser suite is `src/test/integration/employee-mobile-phase1.integration.ts`. The SQL runner adds only the explicit new test config to its existing invocation allowlist. No new dependency, provider, migration or duplicated business controller was introduced.

## Verification

| Check | Actual result and scope |
| --- | --- |
| Unit/component/server | 23 files, 283 tests pass. Retained logs identify candidate and invocation. Existing mocked-link prefetch warnings remain in unit output; they are not a browser-runtime certification. |
| PostgreSQL | 3 suites, 63 tests pass using an invocation-owned disposable loopback cluster. Coverage includes current actor/session/role/eligible-location guards, publication and private-data boundaries. Server/service bytes remain unchanged by the final CSS/test-only corrections. |
| Root authenticated browser | One orchestrated Vitest integration test passes 55 named journey checks across Chromium, WebKit and Firefox; 70.83 seconds on the final candidate. |
| Independent authenticated browser | Separate fixture/runtime replay passes the same 55 checks in 81.83 seconds; exact candidate/source/mirror ownership and cleanup verified. |
| Independent supporting checks | 178 component/server checks and 63 PostgreSQL checks pass; the QA report states their exact candidate and carried-forward byte comparison. |
| TypeScript / targeted ESLint | Pass. No assertion, failure or server guard was removed to obtain a pass. |
| Visual/accessibility evidence | Light/Dark at 320/390/430px; 44px controls, 48px primary/recovery controls, root-font enlargement, nav/content clearance, keyboard focus and 1440px Employee Home/Schedule checks. These are local browser checks, not physical-device certification. |
| Explicit contrast | Enabled Refresh: 5.425:1 light, 9.562:1 dark across all three engines and widths. Settled retry: 6.089:1 light, 12.582:1 dark. Twenty exact control measurements plus rendered focused captures retained. |
| Refusal / console | Eight actual refusal metadata records contain no private data. Deliberate network failures and current-authority refusals are retained and correlated with the scenario; no unmatched console error, page error or hydration issue remains. A low diagnostic limitation is documented by code review. |

The browser suite additionally exercises actual past overnight data, exact foreign-shift refusal, persisted module-off policy, source-cap partial state, lost-response recovery, changed/removed publication, no-upcoming-shift clock access, workspace deactivation/restoration, Lead expiry and role-owned navigation. Chromium covers the expanded state cases; all three engines cover the common Home/Schedule path. Named checks are not independent top-level tests or a feature-completion percentage.

Independent findings and final decisions are authored by their reviewers:

- [UI review](ui-review.md)
- [QA review and scenario matrix](qa-review.md)
- [Code review](code-review.md)

Initial failures, RED foundation tests and intermediate diagnostic captures/logs remain in `.omo/evidence/employee-mobile-phase1/`. They were corrected rather than hidden. Final root captures/results are outside the checkout at `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/evidence`. Independent replay is under `outputs/employee-mobile-phase1/independent-qa/final-74979bbb`. The read-only review gallery is `outputs/employee-mobile-phase1/index.html` in the design task workspace.

## Controls and remaining gates

Product/experience: retain the approved clean teal Employee mobile world and simple factual tasks. Engineering: reuse current controllers/contracts, isolate responsive styles and preserve existing desktop presentation. Security: current own actor/session/workspace/module authority remains server-enforced. Assurance: canonical readbacks, real SQL and independent replay support the result. Governance/delivery: this is a feature branch with local acceptance, not an assembly or production authorization. No exception was accepted or gate waived.

1. Development source inventory already failed on the unchanged base: missing `Claude-UI-Fix` and `codex/owner-ai-release-testing-20261023`; unclassified `claude/home-clock-row`, `claude/quiet-everywhere` and `codex/mobile-access-onboarding-20261026`. Reconcile those sources before assembly/release. This task did not merge unrelated work or edit inventory dispositions.
2. Physical iPhone/Android, OS text scaling/native pickers, VoiceOver/TalkBack, safe areas/virtual keyboards, device performance and hosted/staging parity remain later-phase gates. Root-font enlargement does not certify uniform scaling of the inherited Profile page. Owner/Manager captures verify shell/navigation isolation while some body content is loading; they do not certify complete management workflows.
3. The `21st review` CLI is not installed in this checkout; its attempted invocation is recorded. Free authenticated MCP metadata search informed native controls; existing project primitives were reused. No paid retrieval, new package or hosted generation was used. See the [scoped design record](../../product/specs/employee-mobile-teal/README.md).
4. All 34 workflow groups now have verified source markers and service-owner paths in [workflow-source-map.json](workflow-source-map.json). The remaining workflow implementation batches belong to Phase 2, followed by integrated acceptance/release readiness in Phase 3. Ownership mapping is not end-to-end completion of those workflows.

No local test used production credentials, customer data, real notifications, provider prompts or analytics collection. Owned Next/PostgreSQL runtimes are closed, source/mirror verification succeeded, and derived dependency/build artifacts were released. The existing prototype preview and other worktrees remain available.

Next required work is Phase 2 in small verified batches, beginning with Requests and Availability. No additional Jose decision is needed to understand or review this Phase 1 result. Production merge/deployment requires separate explicit authorization.
