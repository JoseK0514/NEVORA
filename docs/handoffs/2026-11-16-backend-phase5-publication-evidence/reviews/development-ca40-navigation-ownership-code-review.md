# ca40 Navigation route ownership

Confirmed the failed 320px Chromium exchange assertion at scripts/phase-e-navigation-browser-scenarios.mjs:222 against the ca40 navigation failure report and current route owners. Code quality WATCH, REQUEST_CHANGES for the driver. MEDIUM retired route-owner expectations. No CRITICAL, HIGH or LOW finding.

| Page | Phone Back and selected tab | Wider selected sidebar |
| --- | --- | --- |
| Time off, /app/requests?filter=decided | Requests, /app/requests/hub | /app/requests/hub |
| Pick up and swap, /app/exchange or /app/exchange?tab=requests | Schedule, /app/schedule | /app/schedule |

Both rows apply to EMPLOYEE and LEAD. src/lib/navigation.ts:186–191 and 265–272 explicitly assign both families for both roles. Rendered back links are defined at src/components/employee-b/timeoff-b.tsx:47 and requests-b.tsx:156–159. Keep native clicks, exact hrefs, one visible Back, one current destination, zero section tabs and browser Back. An explicit phone navigation to the My requests deep link preserves the existing single Back-to-hub history sequence. If choosing two native clicks through Open shifts to My requests instead, validate both intervening Back destinations or keep the original direct-link case separately.

RequestsHubB exposes a visible Pick up and swap row linking exactly to /app/exchange at every width (requests-b.tsx:122–128). Its old wide label is retired. The driver also assumes a v5 Lead shell: for this source Lead uses the same Schedule-owned Availability action, avatar-owned More, and unlit bottom tabs on More, Profile, Updates and Notifications as Employee. Keep the authenticated role text separate from the shared navigation rules. On More use the visible .c-more > .b-screen anchor order, including the hero profile link and actual notifications/updates/help rows (account-b.tsx:37–62), while retaining keyboard focus, Enter and Back. Availability is reached through the Schedule action in schedule-b.tsx:93. The more-page server explicitly projects the same UI for both roles (app/app/more/page.tsx:102).

The previously consulted remove-ai-slops/programming perspectives favor source-defined, exact expected results independent of the runtime renderer. No tracked source edits or heavy suites.

## Review of proposed Navigation changes

WATCH · REQUEST_CHANGES for one MEDIUM test oracle gap. At scripts/phase-e-navigation-browser-scenarios.mjs:223 the phone supplies /app/exchange?tab=requests but waits only on /app/exchange. Open shifts, For you and My requests all have an identical Back link and Schedule selection. A redirect dropping tab=requests would therefore pass the updated test. Assert the canonical final query and the current segment matching that exact href in the visible Exchange hero. BSeg emits aria-current="page" in src/components/owner-b/b-kit.tsx:73. ExchangeHeroB sets it from the actual page selection in src/components/employee-b/requests-b.tsx:159–165. Keep the decided filter and wide Open shifts destination exact as well.

LOW. The driver requires a current corporate shell for every fixture yet keeps unreachable v5 branches and comments for a legacy Lead. Remove the dead alternatives in the bounded navigation logic, retaining the independent authenticated role label and the current avatar/zero-selected-tab and keyboard/Back checks. At :87 explicitly select the visible Availability anchor for consistency with other dual-rendered layouts.

The remaining changes bind the expected route owners correctly, preserve the two-role fixtures, scope More ordering to rendered links, and exercise the desktop bell whose owning component emits the exact current-state attribute. No heavy runs or tracked edits performed.

## Navigation final follow-up and Attention 768

CLEAR · APPROVE for the bounded Navigation and Attention edits. The Navigation driver now verifies filter=decided and validates both tab=requests and the visible current My requests link. The independent Employee/Lead role label, native transitions, exact expected shell owner, Back, and privacy assertions remain. Availability selects a visible action and both roles use the current More presentation. No remaining findings at CRITICAL, HIGH, MEDIUM or LOW in the corrected oracles.

Attention matches its seeded data. The active actor has one published shift on scenario.sourceDate (src/test/integration/owned-app-fixture.ts:66–73). The Schedule component constructs its exact week/day href in employee-schedule-corp.tsx:104,157,188. At phone width the Days navigation exposes that day; at 768px and above the visible WeekCard renders a link for the shift in .eb-wk (employee-b/schedule-b.tsx:52–64). The driver waits for the visible link, requires exactly one matching fixture destination and verifies its exact href. The diff preserves the previous/next week, forged-confirmation refusal, session-hash absence, target size and lifecycle checks. This is source review; canonical CI execution on the corrected candidate remains outstanding.
