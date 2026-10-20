# Task 1 manualQa matrix

No ulw-loop plan exists (ULW_LOOP_PLAN_MISSING); caller task evidence directory used. PASS applies only to the exact named scenario. Screenshots were opened and inspected with view_image.

```json
{
  "manualQa": {
    "verdict": "FAIL / UI NO-GO / QA NO-GO for zero-exit certification",
    "surfaceEvidence": [
      {
        "scenarioId": "AL-01",
        "criterionRef": "v3 handoff \u00a75: title x264/y84, system type,16px insets",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "node /tmp/nevora-verify-33-manual/manual.cjs; Owner Home1440, Manager Timecards768, Owner Settings1024",
        "verdict": "PASS (sampled title geometry only)",
        "artifactRefs": [
          "o-home-desktop.json",
          "o-home-desktop.png",
          "m-timecards-768.json",
          "o-settings-1024.json"
        ]
      },
      {
        "scenarioId": "WR-01",
        "criterionRef": "inspection WR:320/390/landscape/768/1024/1440; role consistency",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "manual.cjs scenarios m-home-phone, o-home-desktop, m-inbox-320, m-schedule-landscape, m-schedule-webkit, m-timecards-768, o-settings-1024, o-payroll-phone",
        "verdict": "PASS (sampled page-level overflow:0px; not full matrix)",
        "artifactRefs": [
          "actions.json",
          "m-inbox-320.png",
          "m-schedule-landscape.png",
          "o-settings-1024.png",
          "o-payroll-phone.png"
        ]
      },
      {
        "scenarioId": "WR-02",
        "criterionRef": "inspection WR:200% text; long names",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "manual.cjs m-team-text200: Chromium AUDIT-M390x844 /app/employees; root fontSize200%",
        "verdict": "PASS (single route:0px page overflow; visible form labels)",
        "artifactRefs": [
          "m-team-text200.json",
          "m-team-text200.png"
        ]
      },
      {
        "scenarioId": "TC-01",
        "criterionRef": "v3 \u00a75 text distinction, WCAG1.4.1",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "manual.cjs m-schedule-webkit: WebKit AUDIT-M1440x900 /app/schedule; axe link-in-text-block + color-contrast",
        "verdict": "FAIL: TC-MAN-01",
        "artifactRefs": [
          "schedule-axe.json",
          "m-schedule-webkit.png"
        ]
      },
      {
        "scenarioId": "ST-01",
        "criterionRef": "inspection ST: initial layout shift\u22640.01",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "followup.cjs owner-stability and manager-stability: hold /api/manager/action-center then continue",
        "verdict": "FAIL: ST-MAN-01",
        "artifactRefs": [
          "owner-stability-held.json",
          "owner-stability-ready.json",
          "owner-stability-held.png",
          "owner-stability-ready.png",
          "manager-stability-held.png",
          "manager-stability-ready.png",
          "manager-stability-ready.json"
        ]
      },
      {
        "scenarioId": "ST-02",
        "criterionRef": "inspection ST: initial layout shift\u22640.01",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "final-cases.cjs timecards-first-load: Chromium AUDIT-M768x900 fresh /app/timecards; hold ALL /api/timecards reads, then release",
        "verdict": "FAIL: ST-MAN-02",
        "artifactRefs": [
          "timecards-first-load-held.json",
          "timecards-first-load-ready.json",
          "timecards-first-load-held.png",
          "timecards-first-load-ready.png"
        ]
      },
      {
        "scenarioId": "IS-01",
        "criterionRef": "inspection IS:sheet focus/Escape/return",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "states.cjs inbox-keyboard: Chromium AUDIT-M390x844 /app/inbox; focus first data-inbox-key; Enter;Tab;Escape",
        "verdict": "PASS",
        "artifactRefs": [
          "state-actions.json",
          "inbox-sheet-open.png",
          "inbox-sheet-tab.png",
          "inbox-sheet-closed.json"
        ]
      },
      {
        "scenarioId": "IS-02",
        "criterionRef": "inspection IS:Timecard sheet focus/Escape/return",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "states.cjs timecards-ready: /app/timecards; keyboard activate Casey review row;Escape",
        "verdict": "PASS",
        "artifactRefs": [
          "timecard-sheet.png",
          "timecard-closed.json",
          "state-actions.json"
        ]
      },
      {
        "scenarioId": "IS-03",
        "criterionRef": "clean-manager spec: request lists reachable on phone",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "states.cjs inbox-requests: click Requests; inspect actual Time off,Shift requests,Availability hrefs",
        "verdict": "PASS (link destinations present; not downstream end-to-end decisions)",
        "artifactRefs": [
          "inbox-requests.json",
          "inbox-requests.png",
          "state-actions.json"
        ]
      },
      {
        "scenarioId": "IS-04",
        "criterionRef": "inspection IS:failed protected read clears private data, recovery",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "states.cjs timecards-failed: local503 /api/timecards;Refresh;Try again with real read",
        "verdict": "PASS",
        "artifactRefs": [
          "timecards-failed.png",
          "timecards-failed.json",
          "timecards-recovered.json",
          "state-actions.json"
        ]
      },
      {
        "scenarioId": "IS-05",
        "criterionRef": "inspection IS:offline privacy",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "states.cjs timecards-offline: context.setOffline(true);capture;restore online",
        "verdict": "PASS (browser offline transition)",
        "artifactRefs": [
          "timecards-offline.png",
          "timecards-offline.json",
          "state-actions.json"
        ]
      },
      {
        "scenarioId": "IS-06",
        "criterionRef": "inspection IS:paused privacy",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "states.cjs timecards-paused: window.dispatchEvent(new Event(\"blur\"));capture;focus event",
        "verdict": "PASS (synthetic handler only; native window-blur remains GAP)",
        "artifactRefs": [
          "timecards-paused.png",
          "timecards-paused.json",
          "state-actions.json"
        ]
      },
      {
        "scenarioId": "IS-07",
        "criterionRef": "inspection IS:signed out mid-use",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "states.cjs timecards-signed-out: local401 /api/timecards;Refresh;verify Sign in",
        "verdict": "PASS (client401 presentation only)",
        "artifactRefs": [
          "timecards-signed-out.png",
          "timecards-signed-out.json",
          "state-actions.json"
        ]
      },
      {
        "scenarioId": "IS-08",
        "criterionRef": "inspection IS:pending/failure/double activation",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "states.cjs timecards-submission plus final-cases.cjs timecards-doubletap; Last week Alexandra; block approval endpoint; two taps same coordinates;503",
        "verdict": "FAIL: IS-MAN-01 pending copy and geometry; duplicate prevention PASS independently",
        "artifactRefs": [
          "submission-before.json",
          "submission-pending.json",
          "submission-failed.json",
          "submission-pending.png",
          "submission-failed.png",
          "final-actions.json",
          "timecards-doubletap-pending.png"
        ]
      },
      {
        "scenarioId": "IS-09",
        "criterionRef": "v3 \u00a75 small touch targets44px",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "followup.cjs touch-inbox: Chromium AUDIT-M320x700 Requests visible32px; tap x+20,y-4",
        "verdict": "PASS:44px pseudo hit area, filter selected",
        "artifactRefs": [
          "followup-actions.json",
          "touch-inbox-tap.png"
        ]
      },
      {
        "scenarioId": "IS-10",
        "criterionRef": "inspection IS:menus Escape/focus",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "menus.cjs: WebKit AUDIT-M768x900 /app/schedule; focus More schedule actions;Enter;Escape",
        "verdict": "PASS (Escape and focus return only)",
        "artifactRefs": [
          "menu-actions.json",
          "webkit-menu-keyboard-schedule-close.png",
          "webkit-menu-keyboard-schedule-close.json"
        ]
      },
      {
        "scenarioId": "IS-11",
        "criterionRef": "inspection IS:Insights export and custom period",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "followup.cjs insights-actions: WebKit AUDIT-M390x844 /app/reports;Export;Escape;Custom",
        "verdict": "PASS (menus render;custom fields visible; no export execution)",
        "artifactRefs": [
          "insights-actions-export.png",
          "insights-actions-custom.png",
          "followup-actions.json"
        ]
      },
      {
        "scenarioId": "IS-12",
        "criterionRef": "inspection IS:reduced motion",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "followup.cjs insights-actions: WebKit390 page.emulateMedia reducedMotion reduce; document.getAnimations",
        "verdict": "PASS (Insights only:matches=true,0 running animations)",
        "artifactRefs": [
          "followup-actions.json"
        ]
      },
      {
        "scenarioId": "IS-13",
        "criterionRef": "inspection IS:export keyboard focus sequence",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "menus.cjs WebKit AUDIT-M768 /app/reports;focus Export;Enter;Tab;Escape",
        "verdict": "FAIL / RISK:Tab lands on Period details while export popover remains open; native WebKit keyboard preference not isolated",
        "artifactRefs": [
          "webkit-menu-keyboard-export-open.png",
          "webkit-menu-keyboard-export-open.json",
          "webkit-menu-keyboard-export-close.json"
        ]
      },
      {
        "scenarioId": "GAP-01",
        "criterionRef": "inspection complete exit matrix and states",
        "surface": "browser: pinned Playwright 1.62.1; saved viewport screenshots inspected with view_image",
        "exactInvocation": "No comprehensive per-route/per-role/per-state execution in this bounded task; root owns full matrix",
        "verdict": "FAIL:missing full matrix and expanded manual state evidence",
        "artifactRefs": [
          "coverage-gaps.txt"
        ]
      },
      {
        "scenarioId": "IS-14",
        "criterionRef": "v3 handoff \u00a75:44px touch targets;IS correct target",
        "surface": "browser: fresh pinned Playwright touch contexts; real touchscreen.tap plus elementFromPoint",
        "exactInvocation": "node /tmp/nevora-verify-33-manual/targets.cjs: both engines AUDIT-M768x900125%,hasTouch true,isMobile false and true; target-overlap.cjs tap(115.5,258),2px inside visible Inbox bottom",
        "verdict": "FAIL IS-MAN-02:neighbor Schedule receives tap; effective non-overlapped sampled vertical span34px",
        "artifactRefs": [
          "target-results.json",
          "target-overlap-results.json",
          "target-overlap-chromium-sidebar-desktop.png",
          "target-overlap-webkit-sidebar-desktop.png"
        ]
      },
      {
        "scenarioId": "WR-03",
        "criterionRef": "WR landscape responsive layout",
        "surface": "browser: fresh pinned Playwright touch contexts; real touchscreen.tap plus elementFromPoint",
        "exactInvocation": "node /tmp/nevora-verify-33-manual/targets.cjs: both engines AUDIT-M844x390100%,hasTouch true,isMobile false and true; fresh contexts verify pointer/landscape media and sidebar visibility",
        "verdict": "PASS:landscape sidebar candidate dismissed; sidebar hidden in all4 fresh contexts",
        "artifactRefs": [
          "target-results.json",
          "target-chromium-landscape-mobile.png",
          "target-webkit-landscape-mobile.png"
        ]
      },
      {
        "scenarioId": "IS-15",
        "criterionRef": "v3 handoff \u00a75:44px touch width",
        "surface": "browser: fresh pinned Playwright touch contexts; real touchscreen.tap plus elementFromPoint",
        "exactInvocation": "node /tmp/nevora-verify-33-manual/targets.cjs: both engines AUDIT-M320x844125%;Inbox All point tests and taps right+2px / top-4px",
        "verdict": "FAIL IS-MAN-03:39.453125px width,vertical44px expansion only",
        "artifactRefs": [
          "target-results.json",
          "target-chromium-inbox-mobile.png",
          "target-webkit-inbox-mobile.png"
        ]
      },
      {
        "scenarioId": "IS-16",
        "criterionRef": "v3 handoff \u00a75:44px touch width;numeric tolerance43.5",
        "surface": "browser: fresh pinned Playwright touch contexts; real touchscreen.tap plus elementFromPoint",
        "exactInvocation": "node /tmp/nevora-verify-33-manual/targets.cjs: both engines AUDIT-M320x844100%;Schedule Monday point scan and taps at right boundary\u00b10.25px",
        "verdict": "FAIL IS-MAN-04:P2 precision discrepancy43.421875px width,not a severe usability orWCAG-AA minimum-size claim",
        "artifactRefs": [
          "target-results.json",
          "target-chromium-days-mobile.png",
          "target-webkit-days-mobile.png"
        ]
      }
    ],
    "adversarialCases": [
      {
        "scenarioId": "ADV-01",
        "criterionRef": "IS pending/slow-network",
        "adversarialClass": "delayed read",
        "expectedBehavior": "Reserve initial geometry while reads are held",
        "verdict": "FAIL ST-MAN-01/02",
        "artifactRefs": [
          "owner-stability-held.png",
          "timecards-first-load-held.png"
        ]
      },
      {
        "scenarioId": "ADV-02",
        "criterionRef": "IS failed read",
        "adversarialClass": "HTTP503",
        "expectedBehavior": "Clear private rows,show retry,recover after good read",
        "verdict": "PASS",
        "artifactRefs": [
          "timecards-failed.json",
          "timecards-recovered.json"
        ]
      },
      {
        "scenarioId": "ADV-03",
        "criterionRef": "IS session/privacy",
        "adversarialClass": "401 mid-use/offline",
        "expectedBehavior": "Clear private rows and show correct recovery path",
        "verdict": "PASS (client simulation)",
        "artifactRefs": [
          "timecards-signed-out.json",
          "timecards-offline.json"
        ]
      },
      {
        "scenarioId": "ADV-04",
        "criterionRef": "IS submission concurrency",
        "adversarialClass": "double tap",
        "expectedBehavior": "Exactly one request while first is pending",
        "verdict": "PASS (browser-local only)",
        "artifactRefs": [
          "final-actions.json",
          "timecards-doubletap-pending.png"
        ]
      },
      {
        "scenarioId": "ADV-05",
        "criterionRef": "WR text scale",
        "adversarialClass": "200% text/long fictional names",
        "expectedBehavior": "Sampled Team form stays readable without page overflow",
        "verdict": "PASS (sample only)",
        "artifactRefs": [
          "m-team-text200.json",
          "m-team-text200.png"
        ]
      },
      {
        "scenarioId": "ADV-06",
        "criterionRef": "IS state completeness",
        "adversarialClass": "empty/partial/large data/all-page success/no-access",
        "expectedBehavior": "Execute and inspect every applicable state",
        "verdict": "FAIL:missing bounded local fixtures and expanded scenarios; not inferred from ready screen",
        "artifactRefs": [
          "coverage-gaps.txt"
        ]
      },
      {
        "scenarioId": "ADV-07",
        "criterionRef": "IS native pause",
        "adversarialClass": "native window blur/assistive technology",
        "expectedBehavior": "Actual window blur and native screen-reader focus verified",
        "verdict": "FAIL:synthetic blur only; native-device prerequisite missing",
        "artifactRefs": [
          "coverage-gaps.txt"
        ]
      },
      {
        "scenarioId": "ADV-08",
        "criterionRef": "scope",
        "adversarialClass": "webhook replay/signature/payment-provider retries",
        "expectedBehavior": "not_applicable: this read-only UI candidate review invokes no webhook or payment-provider integration",
        "verdict": "not_applicable",
        "artifactRefs": []
      },
      {
        "scenarioId": "ADV-09",
        "criterionRef": "IS correct target",
        "adversarialClass": "adjacent invisible hit areas",
        "expectedBehavior": "Tapping inside Inbox must activate Inbox,not its neighbor",
        "verdict": "FAIL IS-MAN-02",
        "artifactRefs": [
          "target-overlap-results.json",
          "target-overlap-chromium-sidebar-desktop.png"
        ]
      },
      {
        "scenarioId": "ADV-10",
        "criterionRef": "WR native viewport",
        "adversarialClass": "fresh landscape context versus resized matrix context",
        "expectedBehavior": "Phone landscape hides desktop sidebar consistently in both mobile-emulation modes",
        "verdict": "PASS",
        "artifactRefs": [
          "target-results.json",
          "target-chromium-landscape-mobile.png",
          "target-webkit-landscape-mobile.png"
        ]
      }
    ],
    "artifactRefs": [
      {
        "id": "actions.json",
        "kind": "action-log / measurement",
        "description": "actions.json",
        "path": "/tmp/nevora-verify-33-manual/actions.json",
        "bytes": 3859,
        "sha256": "854f711a8930f24217a076dee4a6ad3f59d36a5bd5b1ab84cbd899c41b367b29"
      },
      {
        "id": "coverage-gaps.txt",
        "kind": "script / evidence note",
        "description": "coverage-gaps.txt",
        "path": "/tmp/nevora-verify-33-manual/coverage-gaps.txt",
        "bytes": 783,
        "sha256": "6ec52d6585f344d774ca408d7295ef429461779cb17faea13c2f80f74a4f46da"
      },
      {
        "id": "final-actions.json",
        "kind": "action-log / measurement",
        "description": "final-actions.json",
        "path": "/tmp/nevora-verify-33-manual/final-actions.json",
        "bytes": 6084,
        "sha256": "99a3fd9a5d31d7d6af7eb9e1883183b91caf6d3dfeae671609cee6ed37be1913"
      },
      {
        "id": "final-cases.cjs",
        "kind": "script / evidence note",
        "description": "final-cases.cjs",
        "path": "/tmp/nevora-verify-33-manual/final-cases.cjs",
        "bytes": 4401,
        "sha256": "fb734843824e9317989c39781211a22d70a1b18296ed15306f8d9d011d5f026b"
      },
      {
        "id": "followup-actions.json",
        "kind": "action-log / measurement",
        "description": "followup-actions.json",
        "path": "/tmp/nevora-verify-33-manual/followup-actions.json",
        "bytes": 4595,
        "sha256": "61578a5ff6272e70cdfe3cf4bfb502a23719e56bf677646ceb816fb4ac4ff235"
      },
      {
        "id": "followup.cjs",
        "kind": "script / evidence note",
        "description": "followup.cjs",
        "path": "/tmp/nevora-verify-33-manual/followup.cjs",
        "bytes": 4511,
        "sha256": "0b16a50c33493226ae2bf896938e6dd27d027decb05d5567aa67de0c570cde6c"
      },
      {
        "id": "inbox-requests.json",
        "kind": "action-log / measurement",
        "description": "inbox-requests.json",
        "path": "/tmp/nevora-verify-33-manual/inbox-requests.json",
        "bytes": 533,
        "sha256": "f388b14893314b463c7b65ca565fbc57fe62530d543f1af8cb65879c35e1f4d5"
      },
      {
        "id": "inbox-requests.png",
        "kind": "screenshot",
        "description": "inbox-requests.png",
        "path": "/tmp/nevora-verify-33-manual/inbox-requests.png",
        "bytes": 36288,
        "sha256": "14022c624c5eb07b1b44c781f63f7e1cc2aa8af17bedc3cebcae7e311530ab90"
      },
      {
        "id": "inbox-sheet-closed.json",
        "kind": "action-log / measurement",
        "description": "inbox-sheet-closed.json",
        "path": "/tmp/nevora-verify-33-manual/inbox-sheet-closed.json",
        "bytes": 1276,
        "sha256": "c6ed17d31c1cc4636859b68fbf6099408c4fc198a44f94e84aaeb01db030d3f9"
      },
      {
        "id": "inbox-sheet-open.png",
        "kind": "screenshot",
        "description": "inbox-sheet-open.png",
        "path": "/tmp/nevora-verify-33-manual/inbox-sheet-open.png",
        "bytes": 55282,
        "sha256": "df808ca36576e9f5e7bfaf1301c1e860bd81d57a2685c94c8297aef0ab21b58c"
      },
      {
        "id": "inbox-sheet-tab.png",
        "kind": "screenshot",
        "description": "inbox-sheet-tab.png",
        "path": "/tmp/nevora-verify-33-manual/inbox-sheet-tab.png",
        "bytes": 56172,
        "sha256": "3def2c6a5b749bc3166decc52023544c0cc98d2dea971c29379cce12638ba637"
      },
      {
        "id": "insights-actions-custom.png",
        "kind": "screenshot",
        "description": "insights-actions-custom.png",
        "path": "/tmp/nevora-verify-33-manual/insights-actions-custom.png",
        "bytes": 51856,
        "sha256": "fbcd6e803722f93c2797ac535d8b9d988ca5f6321677f959a49d76caa8166e42"
      },
      {
        "id": "insights-actions-export.png",
        "kind": "screenshot",
        "description": "insights-actions-export.png",
        "path": "/tmp/nevora-verify-33-manual/insights-actions-export.png",
        "bytes": 56204,
        "sha256": "ee8afecb002d51fbe6046bc2fada4a3bbf2697662638fed1e94492b6b8e5f510"
      },
      {
        "id": "m-inbox-320.png",
        "kind": "screenshot",
        "description": "m-inbox-320.png",
        "path": "/tmp/nevora-verify-33-manual/m-inbox-320.png",
        "bytes": 44546,
        "sha256": "94583a3522462389af905a5e74354a067972842566d2dffad6642db3febb765a"
      },
      {
        "id": "m-schedule-landscape.png",
        "kind": "screenshot",
        "description": "m-schedule-landscape.png",
        "path": "/tmp/nevora-verify-33-manual/m-schedule-landscape.png",
        "bytes": 35889,
        "sha256": "90146b7ba525f4883dfb52b6e7084f5929c665d24e2de2fed78ad6a23fbfd9d6"
      },
      {
        "id": "m-schedule-webkit.png",
        "kind": "screenshot",
        "description": "m-schedule-webkit.png",
        "path": "/tmp/nevora-verify-33-manual/m-schedule-webkit.png",
        "bytes": 177115,
        "sha256": "9b11dc93496489a0e7080ef2d3140a236ad33819bedfc28fd3f52e3256aa3cd7"
      },
      {
        "id": "m-team-text200.json",
        "kind": "action-log / measurement",
        "description": "m-team-text200.json",
        "path": "/tmp/nevora-verify-33-manual/m-team-text200.json",
        "bytes": 8940,
        "sha256": "ed72613fc3fefe4aa7b29b818f56703ed2e1dbddd42a1017209b4f07b5179203"
      },
      {
        "id": "m-team-text200.png",
        "kind": "screenshot",
        "description": "m-team-text200.png",
        "path": "/tmp/nevora-verify-33-manual/m-team-text200.png",
        "bytes": 47728,
        "sha256": "408114091d1041ba2bcefc80b7e5071350dc053008cfb93570c2281845e4a0bb"
      },
      {
        "id": "m-timecards-768.json",
        "kind": "action-log / measurement",
        "description": "m-timecards-768.json",
        "path": "/tmp/nevora-verify-33-manual/m-timecards-768.json",
        "bytes": 7902,
        "sha256": "630b4e70908389c282e6b4be0c46f2b0fc1a786868e3b53c8eab52be571b38cf"
      },
      {
        "id": "manager-stability-held.png",
        "kind": "screenshot",
        "description": "manager-stability-held.png",
        "path": "/tmp/nevora-verify-33-manual/manager-stability-held.png",
        "bytes": 37712,
        "sha256": "dbf7bda52c110624d4d37f593920580065e7f9e55b6771c1068c31fa6426b1d7"
      },
      {
        "id": "manager-stability-ready.json",
        "kind": "action-log / measurement",
        "description": "manager-stability-ready.json",
        "path": "/tmp/nevora-verify-33-manual/manager-stability-ready.json",
        "bytes": 1664,
        "sha256": "3fc894adcdb2d11b50c2ec773a559b862952ea0bcfaa0aeb389927331d3033a6"
      },
      {
        "id": "manager-stability-ready.png",
        "kind": "screenshot",
        "description": "manager-stability-ready.png",
        "path": "/tmp/nevora-verify-33-manual/manager-stability-ready.png",
        "bytes": 45319,
        "sha256": "32073e646655d32cfc089d87f154d9e98bf679b78161fa22ecb1c2222587efec"
      },
      {
        "id": "manual.cjs",
        "kind": "script / evidence note",
        "description": "manual.cjs",
        "path": "/tmp/nevora-verify-33-manual/manual.cjs",
        "bytes": 4062,
        "sha256": "e05a5ee740a12bc64f692430d8982db04cff654311ead4569d1b03c62bb505af"
      },
      {
        "id": "menu-actions.json",
        "kind": "action-log / measurement",
        "description": "menu-actions.json",
        "path": "/tmp/nevora-verify-33-manual/menu-actions.json",
        "bytes": 4021,
        "sha256": "538c73c17ab7f9800fe97b9ff1b6396490b4bae1721bea56ce27cfe4094fe1f8"
      },
      {
        "id": "menus.cjs",
        "kind": "script / evidence note",
        "description": "menus.cjs",
        "path": "/tmp/nevora-verify-33-manual/menus.cjs",
        "bytes": 4341,
        "sha256": "313918b7fba1dd1be12619e25b626e8ad7f97ce8a368f3087c61d2e60533aafd"
      },
      {
        "id": "o-home-desktop.json",
        "kind": "action-log / measurement",
        "description": "o-home-desktop.json",
        "path": "/tmp/nevora-verify-33-manual/o-home-desktop.json",
        "bytes": 4410,
        "sha256": "7681ce196b86ea601b2cc84b768c15f46f681ea30b48fc2c5840d0276551da2f"
      },
      {
        "id": "o-home-desktop.png",
        "kind": "screenshot",
        "description": "o-home-desktop.png",
        "path": "/tmp/nevora-verify-33-manual/o-home-desktop.png",
        "bytes": 118950,
        "sha256": "3f33f78a55c8c1770d674ebbd48fe5fca447f436e4369d0694a438995d402f86"
      },
      {
        "id": "o-payroll-phone.png",
        "kind": "screenshot",
        "description": "o-payroll-phone.png",
        "path": "/tmp/nevora-verify-33-manual/o-payroll-phone.png",
        "bytes": 69546,
        "sha256": "d9f1271efaf602d2f243b795f00545a59530ef59b895660aee227068208f8fb0"
      },
      {
        "id": "o-settings-1024.json",
        "kind": "action-log / measurement",
        "description": "o-settings-1024.json",
        "path": "/tmp/nevora-verify-33-manual/o-settings-1024.json",
        "bytes": 5155,
        "sha256": "20153c1eb58cd9cb172f69d02948456e154684f60cfaeca894729d60d0316358"
      },
      {
        "id": "o-settings-1024.png",
        "kind": "screenshot",
        "description": "o-settings-1024.png",
        "path": "/tmp/nevora-verify-33-manual/o-settings-1024.png",
        "bytes": 172006,
        "sha256": "c96937a04cf39501c819995eb492748789b8c73ccfa8e18cdb97d920e0e42fd4"
      },
      {
        "id": "owner-stability-held.json",
        "kind": "action-log / measurement",
        "description": "owner-stability-held.json",
        "path": "/tmp/nevora-verify-33-manual/owner-stability-held.json",
        "bytes": 2508,
        "sha256": "d24976b028e63ce774cb1246e2fd354c8380c1a4f66bdf04a53b4eb398e40788"
      },
      {
        "id": "owner-stability-held.png",
        "kind": "screenshot",
        "description": "owner-stability-held.png",
        "path": "/tmp/nevora-verify-33-manual/owner-stability-held.png",
        "bytes": 106306,
        "sha256": "9a6127f489a70c4093e78035b5667b6538f49f69569fd249b1b18de11ff67bb8"
      },
      {
        "id": "owner-stability-ready.json",
        "kind": "action-log / measurement",
        "description": "owner-stability-ready.json",
        "path": "/tmp/nevora-verify-33-manual/owner-stability-ready.json",
        "bytes": 3447,
        "sha256": "318b6b6d3dea54f6cbb0dc42cbe405608f798903b7890daf26786f05407f76c0"
      },
      {
        "id": "owner-stability-ready.png",
        "kind": "screenshot",
        "description": "owner-stability-ready.png",
        "path": "/tmp/nevora-verify-33-manual/owner-stability-ready.png",
        "bytes": 118383,
        "sha256": "acb2a4106ed396352e4ed446b6f9ef36ca5d3e2a90d1e4b2a7e2dd2eec840794"
      },
      {
        "id": "schedule-axe.json",
        "kind": "action-log / measurement",
        "description": "schedule-axe.json",
        "path": "/tmp/nevora-verify-33-manual/schedule-axe.json",
        "bytes": 2384,
        "sha256": "60d510761369c8a41f830ca8601eea75ebafc57f15f694a1152311e7f5d2c442"
      },
      {
        "id": "source-custody.json",
        "kind": "action-log / measurement",
        "description": "source-custody.json",
        "path": "/tmp/nevora-verify-33-manual/source-custody.json",
        "bytes": 1205,
        "sha256": "4b3824d6615b2f483aa46c847af27fd898b1760eca44bee3866c1ee56caab3e9"
      },
      {
        "id": "state-actions.json",
        "kind": "action-log / measurement",
        "description": "state-actions.json",
        "path": "/tmp/nevora-verify-33-manual/state-actions.json",
        "bytes": 5357,
        "sha256": "41c5652d32a1daf9f1577bc4e878160ce3d08ae722220973fa88892677aab17b"
      },
      {
        "id": "states.cjs",
        "kind": "script / evidence note",
        "description": "states.cjs",
        "path": "/tmp/nevora-verify-33-manual/states.cjs",
        "bytes": 7495,
        "sha256": "6da53c53dacd845ff8008409e38aff84da572eb91870b58c5c0a9943a13757ee"
      },
      {
        "id": "submission-before.json",
        "kind": "action-log / measurement",
        "description": "submission-before.json",
        "path": "/tmp/nevora-verify-33-manual/submission-before.json",
        "bytes": 1410,
        "sha256": "67b5453a0f76219e16608fe1e4bd07230759e11e433a2014561a7b99ed8c16c4"
      },
      {
        "id": "submission-failed.json",
        "kind": "action-log / measurement",
        "description": "submission-failed.json",
        "path": "/tmp/nevora-verify-33-manual/submission-failed.json",
        "bytes": 1756,
        "sha256": "8ce38a4ea7d56a2656f90e5ce54bae53c88a119a2749ad283b7ac49f64155bb5"
      },
      {
        "id": "submission-failed.png",
        "kind": "screenshot",
        "description": "submission-failed.png",
        "path": "/tmp/nevora-verify-33-manual/submission-failed.png",
        "bytes": 51823,
        "sha256": "897e85d7178c16b1d6da2b0523627a82760efb5bacee005562f1971d3d86cdb1"
      },
      {
        "id": "submission-pending.json",
        "kind": "action-log / measurement",
        "description": "submission-pending.json",
        "path": "/tmp/nevora-verify-33-manual/submission-pending.json",
        "bytes": 1621,
        "sha256": "0aca088d80202cfe1e9d53c8bb90494b489163d78760d476bd777ce465a34601"
      },
      {
        "id": "submission-pending.png",
        "kind": "screenshot",
        "description": "submission-pending.png",
        "path": "/tmp/nevora-verify-33-manual/submission-pending.png",
        "bytes": 49909,
        "sha256": "3d43fe0185d05c65a13f33355d575418743bcb89be60b538425da64d211ad3b0"
      },
      {
        "id": "timecard-closed.json",
        "kind": "action-log / measurement",
        "description": "timecard-closed.json",
        "path": "/tmp/nevora-verify-33-manual/timecard-closed.json",
        "bytes": 720,
        "sha256": "7e6bae6a8a7f940c56a603a24c60abbf2248ae7729ee6e0c0d823f40d8e0bd81"
      },
      {
        "id": "timecard-sheet.png",
        "kind": "screenshot",
        "description": "timecard-sheet.png",
        "path": "/tmp/nevora-verify-33-manual/timecard-sheet.png",
        "bytes": 55467,
        "sha256": "316146f2603230212212a8a720b4541738c4ab86e4593244179a20b2b68ce99a"
      },
      {
        "id": "timecards-doubletap-pending.png",
        "kind": "screenshot",
        "description": "timecards-doubletap-pending.png",
        "path": "/tmp/nevora-verify-33-manual/timecards-doubletap-pending.png",
        "bytes": 53861,
        "sha256": "af1270ce9d70f255390e46af6818370b64886f905935c0cb75e0164c59bd050b"
      },
      {
        "id": "timecards-failed.json",
        "kind": "action-log / measurement",
        "description": "timecards-failed.json",
        "path": "/tmp/nevora-verify-33-manual/timecards-failed.json",
        "bytes": 406,
        "sha256": "49f8e3ff4c98d339e215c2ab96a2e292a6642ec7f1251dc17aafa9d81c6b6738"
      },
      {
        "id": "timecards-failed.png",
        "kind": "screenshot",
        "description": "timecards-failed.png",
        "path": "/tmp/nevora-verify-33-manual/timecards-failed.png",
        "bytes": 27547,
        "sha256": "5ce392643eec2eff27474a72bb5a1d1cf7a10d53e1fe3f0bf33a9ec37adb30c2"
      },
      {
        "id": "timecards-first-load-held.json",
        "kind": "action-log / measurement",
        "description": "timecards-first-load-held.json",
        "path": "/tmp/nevora-verify-33-manual/timecards-first-load-held.json",
        "bytes": 2324,
        "sha256": "928c8778436c3e70d8466a14830b2e5d49d2fe917a62f5b56e0dc49210b465da"
      },
      {
        "id": "timecards-first-load-held.png",
        "kind": "screenshot",
        "description": "timecards-first-load-held.png",
        "path": "/tmp/nevora-verify-33-manual/timecards-first-load-held.png",
        "bytes": 60370,
        "sha256": "3ad8ac2904e2eac2604d63867f63ec9a220e2daca33c39e75a1753497ededb61"
      },
      {
        "id": "timecards-first-load-ready.json",
        "kind": "action-log / measurement",
        "description": "timecards-first-load-ready.json",
        "path": "/tmp/nevora-verify-33-manual/timecards-first-load-ready.json",
        "bytes": 4355,
        "sha256": "01559c3d288e239b6125a26da98ddfd56d9378e8478b66f0db2e4c18e432cbdb"
      },
      {
        "id": "timecards-first-load-ready.png",
        "kind": "screenshot",
        "description": "timecards-first-load-ready.png",
        "path": "/tmp/nevora-verify-33-manual/timecards-first-load-ready.png",
        "bytes": 103283,
        "sha256": "4512918f19c57762ea31d238cba02e5b7f23042cd61d3a64a7b1d80a60dcd2bf"
      },
      {
        "id": "timecards-offline.json",
        "kind": "action-log / measurement",
        "description": "timecards-offline.json",
        "path": "/tmp/nevora-verify-33-manual/timecards-offline.json",
        "bytes": 363,
        "sha256": "7da711af73182162e4d18918e05086f7aa49a183e6a227702620fcc9d0529527"
      },
      {
        "id": "timecards-offline.png",
        "kind": "screenshot",
        "description": "timecards-offline.png",
        "path": "/tmp/nevora-verify-33-manual/timecards-offline.png",
        "bytes": 21811,
        "sha256": "c65ac65ca971dfc6ee31b86a33301c2aacb135141727bb836140c5e5baeed738"
      },
      {
        "id": "timecards-paused.json",
        "kind": "action-log / measurement",
        "description": "timecards-paused.json",
        "path": "/tmp/nevora-verify-33-manual/timecards-paused.json",
        "bytes": 380,
        "sha256": "7ffc664af4ae64bdf2e74b12299ab78f18810aade79daf90ba5695dbfe7948ec"
      },
      {
        "id": "timecards-paused.png",
        "kind": "screenshot",
        "description": "timecards-paused.png",
        "path": "/tmp/nevora-verify-33-manual/timecards-paused.png",
        "bytes": 24119,
        "sha256": "7e5df0c2aec27e797fdb51364f7d8a319e304768cc9a5d5b51a53efe2fa8cd47"
      },
      {
        "id": "timecards-recovered.json",
        "kind": "action-log / measurement",
        "description": "timecards-recovered.json",
        "path": "/tmp/nevora-verify-33-manual/timecards-recovered.json",
        "bytes": 663,
        "sha256": "7395f791734144979abaadf96dbd804fb3e48651e4ab35de439361b5060907db"
      },
      {
        "id": "timecards-signed-out.json",
        "kind": "action-log / measurement",
        "description": "timecards-signed-out.json",
        "path": "/tmp/nevora-verify-33-manual/timecards-signed-out.json",
        "bytes": 389,
        "sha256": "b910f3ebfba144f894aebbacefbe49797a24032c6612b764daa820c0e596da49"
      },
      {
        "id": "timecards-signed-out.png",
        "kind": "screenshot",
        "description": "timecards-signed-out.png",
        "path": "/tmp/nevora-verify-33-manual/timecards-signed-out.png",
        "bytes": 26384,
        "sha256": "72a6ac34a5f5cc1c99629fcd4122aac13529d3e51dd88e93ba06c2eb6c81d332"
      },
      {
        "id": "touch-inbox-tap.png",
        "kind": "screenshot",
        "description": "touch-inbox-tap.png",
        "path": "/tmp/nevora-verify-33-manual/touch-inbox-tap.png",
        "bytes": 34228,
        "sha256": "e60a2610753548162a29009bea7cc29d55995dbf6464ac1e5f5a3112f3050181"
      },
      {
        "id": "webkit-menu-keyboard-export-close.json",
        "kind": "action-log / measurement",
        "description": "webkit-menu-keyboard-export-close.json",
        "path": "/tmp/nevora-verify-33-manual/webkit-menu-keyboard-export-close.json",
        "bytes": 1134,
        "sha256": "48dae17058d1288c30e8082b9eb5157d63c982fa02bd817639ac7d58e7873f9f"
      },
      {
        "id": "webkit-menu-keyboard-export-open.json",
        "kind": "action-log / measurement",
        "description": "webkit-menu-keyboard-export-open.json",
        "path": "/tmp/nevora-verify-33-manual/webkit-menu-keyboard-export-open.json",
        "bytes": 1250,
        "sha256": "538105c5e8f683d5d93e06999c47ad81f8ad5543455acda788c2539c37f75f7a"
      },
      {
        "id": "webkit-menu-keyboard-export-open.png",
        "kind": "screenshot",
        "description": "webkit-menu-keyboard-export-open.png",
        "path": "/tmp/nevora-verify-33-manual/webkit-menu-keyboard-export-open.png",
        "bytes": 108392,
        "sha256": "66f520a1454ffe921d2a14da0b1fa79f610e4af1878b939da1229ed77e10715e"
      },
      {
        "id": "webkit-menu-keyboard-schedule-close.json",
        "kind": "action-log / measurement",
        "description": "webkit-menu-keyboard-schedule-close.json",
        "path": "/tmp/nevora-verify-33-manual/webkit-menu-keyboard-schedule-close.json",
        "bytes": 2350,
        "sha256": "fac174e9192bb708fe8e2d14d286e07e44c3c2895e9ded8de59d9f52f9d85fbd"
      },
      {
        "id": "webkit-menu-keyboard-schedule-close.png",
        "kind": "screenshot",
        "description": "webkit-menu-keyboard-schedule-close.png",
        "path": "/tmp/nevora-verify-33-manual/webkit-menu-keyboard-schedule-close.png",
        "bytes": 150722,
        "sha256": "0aed6f9b949541feb100737fe89727f102fa81bcf20f78f9205252fed6330c6e"
      },
      {
        "id": "target-chromium-days-mobile.png",
        "kind": "screenshot",
        "description": "Independent touch candidate triage: target-chromium-days-mobile.png",
        "path": "/tmp/nevora-verify-33-manual/target-chromium-days-mobile.png",
        "bytes": 57349,
        "sha256": "0632940b7ab7d894b7f2a598d8c6d0da058edde3d715fc192cbce2a6be3808e5"
      },
      {
        "id": "target-chromium-inbox-mobile.png",
        "kind": "screenshot",
        "description": "Independent touch candidate triage: target-chromium-inbox-mobile.png",
        "path": "/tmp/nevora-verify-33-manual/target-chromium-inbox-mobile.png",
        "bytes": 60071,
        "sha256": "c6cf681528d800bcb76b983e86c5378d7a4a67490ce2def36f1c32fe65e716c8"
      },
      {
        "id": "target-chromium-landscape-mobile.png",
        "kind": "screenshot",
        "description": "Independent touch candidate triage: target-chromium-landscape-mobile.png",
        "path": "/tmp/nevora-verify-33-manual/target-chromium-landscape-mobile.png",
        "bytes": 26030,
        "sha256": "b41e315d52ea9d55cc15adaf173d34a08b7b92b08c8f7b2cda9d58f228a966f1"
      },
      {
        "id": "target-overlap-chromium-sidebar-desktop.png",
        "kind": "screenshot",
        "description": "Independent touch candidate triage: target-overlap-chromium-sidebar-desktop.png",
        "path": "/tmp/nevora-verify-33-manual/target-overlap-chromium-sidebar-desktop.png",
        "bytes": 110190,
        "sha256": "11d42205b201ab45de3938dedbd58eef822c4747afb1253fb2a1afe5142105d5"
      },
      {
        "id": "target-overlap-results.json",
        "kind": "measurement/action-log",
        "description": "Independent touch candidate triage: target-overlap-results.json",
        "path": "/tmp/nevora-verify-33-manual/target-overlap-results.json",
        "bytes": 8556,
        "sha256": "d94bbbe8d31dda7bed097fa96110a60b2e1608b2b345cc1d88cc6cb41da61ea8"
      },
      {
        "id": "target-overlap-webkit-sidebar-desktop.png",
        "kind": "screenshot",
        "description": "Independent touch candidate triage: target-overlap-webkit-sidebar-desktop.png",
        "path": "/tmp/nevora-verify-33-manual/target-overlap-webkit-sidebar-desktop.png",
        "bytes": 132916,
        "sha256": "365f3711af748f28698ae02fa42cd4c6b99a1af7329e8f45fa49ca5f82031bb1"
      },
      {
        "id": "target-overlap.cjs",
        "kind": "script",
        "description": "Independent touch candidate triage: target-overlap.cjs",
        "path": "/tmp/nevora-verify-33-manual/target-overlap.cjs",
        "bytes": 5797,
        "sha256": "3feb7341333c1acd0e85b22d7c4a452c6474704b62800ce55a83d2c04befae16"
      },
      {
        "id": "target-results.json",
        "kind": "measurement/action-log",
        "description": "Independent touch candidate triage: target-results.json",
        "path": "/tmp/nevora-verify-33-manual/target-results.json",
        "bytes": 37763,
        "sha256": "ea3aebf68453b917e114adf710703997f6e5a1f301c5c61d3eb7bbfda5297cc3"
      },
      {
        "id": "target-webkit-days-mobile.png",
        "kind": "screenshot",
        "description": "Independent touch candidate triage: target-webkit-days-mobile.png",
        "path": "/tmp/nevora-verify-33-manual/target-webkit-days-mobile.png",
        "bytes": 69898,
        "sha256": "1972d567acd4f5632d3b8835312c7ceb91f92a49b252f14c0495e688d69451ab"
      },
      {
        "id": "target-webkit-inbox-mobile.png",
        "kind": "screenshot",
        "description": "Independent touch candidate triage: target-webkit-inbox-mobile.png",
        "path": "/tmp/nevora-verify-33-manual/target-webkit-inbox-mobile.png",
        "bytes": 73880,
        "sha256": "6506ab9915db7a7b67b0f07feda4fe92b82a5b2246dd539be210cd4f72e3aef3"
      },
      {
        "id": "target-webkit-landscape-mobile.png",
        "kind": "screenshot",
        "description": "Independent touch candidate triage: target-webkit-landscape-mobile.png",
        "path": "/tmp/nevora-verify-33-manual/target-webkit-landscape-mobile.png",
        "bytes": 35124,
        "sha256": "2bfa95b858ce724765009c0fca09b3b85c0a5b11e6c54693f03af3e9a0dec9c3"
      },
      {
        "id": "targets.cjs",
        "kind": "script",
        "description": "Independent touch candidate triage: targets.cjs",
        "path": "/tmp/nevora-verify-33-manual/targets.cjs",
        "bytes": 5880,
        "sha256": "c00a80c485aad949b877b7541aa2d1c538f64277e41d72858ed0b66013080bd4"
      }
    ]
  }
}
```
