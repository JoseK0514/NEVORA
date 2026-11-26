# Branch audit review: the 18 branches with remaining app, tool or test differences (Nov 26, 2026)

Reply to Jose's helper-branch retirement review (audited at Collab `c8bea18c`). All 41 branch refs stay in place until
Jose approves retirement. Browser evidence for this review is QA's run on `706eb75e` (production build, Chromium and
WebKit, EN and ES, fictional data), kept locally in the QA session under `/home/qa-evidence/audit-706eb75e/`.

## Changes made in this review (manuals rebuilt from bf4630a1 in `0d3cd176`)

| Commit | Change |
|---|---|
| `df149b8f` | Port of es-rest R2-A (`2acc7c31`). It applied cleanly. 19 Settings and Team server messages, including the feature-busy refusal, follow the saved account language (`readPageLang`). Its Spanish was updated to the "ponche" glossary. English is word for word; its Spanish action tests are included. |
| `706eb75e` | Signed-in first render: the `nv-portal-lang` hint ('en' or 'es' only) gives the root layout the person's language (`src/lib/i18n/portal-lang-cookie.ts`). The saved account language stays the authority. Feature-busy refusal built on the client from module and count (`featuresBusyText`), with EN and ES tests. timecards-final's Close open punch copy test ported, its glossary check moved to "ponche". |
| `bf4630a1` | After a busy refusal, the feature switches go back to the saved modules (QA saw Time off drawn off beside "Not saved"). |

## QA browser results on `706eb75e`

1. **Feature-busy refusal: PASS.** 1 POST → 409 busy. The notice reads in EN "1 request for time off is waiting for a decision. Decide it first." and in ES "1 solicitud de días libres espera una decisión. Decídela primero.". The module stayed on. The one LOW (the switch drawn off) is fixed in `bf4630a1`.
2. **Spanish server messages: PASS.** The PIN server check reads "El PIN no se guardó · Escribe el mismo PIN de cuatro dígitos dos veces."; EN is unchanged; no PIN was stored.
3. **Signed-in first render: PASS.** A Spanish Owner's raw `/app` HTML has `lang="es"` once the portal has run once in the browser. The first-ever visit uses the sign-in language. An English Owner gets `en`. After a language change, the hint follows on the next portal page load.
4. **Help someone sign in: PASS.** EN and ES at 390, 390-200 and 1440 in both engines: overflow 0, clipping 0, reach 0 misses, axe 0. Validation and an issued receipt both work.
5. **Manager Shift requests at 200% text: PASS on Collab's own CSS.** The kind chip is never cut, in 0 of 24 cases. At 390-200, Approve and Decline stack full width (272×44 each, overlap 0); at 390 they sit side by side.

## The 18 branches

| Branch | Disposition | Covered by, or what remains |
|---|---|---|
| account | **Superseded** | Help someone sign in (F9) is Collab's later Direction B version: `fa9f2b72` (12:03, after the branch's `0f8ae9fd` at 11:52), the end sweep `48724ab7`, and the Spanish `3104cf20`. The branch's `assisted-b.css` is the earlier alternative. The other 13 paths (account deletion, Manager profile and their tests) were changed again in Collab after the branch point. Ship Collab's layout (QA item 4). |
| es-employee | **Superseded** | Codex's Spanish (`abe50031`…`0f61b708`, Employee and Lead `596e1b93`), Jose's wording `445ab237`, copy slips `4c5235c5` and `f0c2edbd`. Schedule action messages are translated on the client in Collab. Archive for its earlier source and tests. |
| es-mobile | **Superseded** | `596e1b93` and the shared foundation `abe50031`. No server localization is missing. Archive. |
| es-owner | **Superseded** | `3104cf20` (Owner Home, Settings, Clocker and billing), plus the items under es-employee. Archive. |
| es-payroll | **Superseded** | `79ba7643` (Time and payroll). Archive. |
| es-rest | **Included, rest superseded** | Its Settings and Team server-message fix (R2-A, `2acc7c31`) is ported in `df149b8f`, with the busy path also in `706eb75e`. The rest is covered by Codex's Spanish. Archive. |
| es-rondo | **Superseded** | `e2273795` (Rondo). Archive. |
| messages-2 | **Superseded** | Collab's Manager Notifications and Compose: `1b311acf` (B3, B6, B7, B8), `0bfa2ebf`, and `a6a51d0e` (screen-reader names match the visible text, 44px targets). The branch's `manager-notifications-b.*` and `communication-compose-b.css` are an earlier alternative (11:58, against Collab's 12:53). Any residual focus or styling goes to SCRUM-71. |
| payroll-2 | **Superseded** | Its root-language change (`d9282e71`) is replaced by the hint in `706eb75e`, which keeps the saved account language as the authority (QA item 3). `corp-shell.css` and `portal-lang.tsx` were changed again in Collab. |
| qa | **Archive only** | `tools/ui-audit/` is one commit, `d99d6695`, which its author marked "WIP (paused, not ready)". It has never been run end to end or passed its self-test, and it changes `package.json`, the lockfile and a new `vitest.ui-audit.config.mts`. Today's verification used `tools/ui-scan` and QA's probes. Keep the exact package and the final Spanish QA report (`b00d1863`, `qa/es-rc/report.md`) in the archive tag. If Jose wants a one-command UI gate, finishing it (owner: QA) is its own task. |
| schedule-tools-2 | **Superseded** | Its fixes for 200% text (`e99e3daf` chip wrap, `0ec3f23f` Approve and Decline full width) aren't in Collab. Collab gets the same result from its own CSS: `0c1447f2` ("Decline and Approve stack full width with large text") and `f188ec11`, verified by QA item 5. Availability (C10) is Collab's `76e1cea6`. |
| screens-final | **Superseded, keep its tag** | Its guide commits `1c67cf9d` and `804cf0f8` are ancestors of Collab. Its earlier Spanish tree is superseded. It still holds the guide bundles used to deliver builds today, so keep it until the final guide build has landed. |
| settings-2 | **Superseded** | Every path was changed again in Collab (`a729db0c`, `3104cf20`, `f0c2edbd`, `445ab237`). The draft PIN help and dialog sizing passed QA's Settings and Clocker sweeps. Archive. |
| settings-policies | **Superseded** | `3104cf20`, `79ba7643`, `07978531`, `71ba44c5`. Archive. |
| settings-positions | **Superseded** | `3104cf20`, `baca629a`, `b9b1d458`. Archive. |
| staff | **Superseded** | Same as es-owner and es-employee; the Spanish sign-off is in `2026-11-26-spanish-integration-resume.md`. Archive for its earlier source and test evidence. |
| sweep-1 | **Included** | Its one change (`navigationCancelledReads: true` in `readiness-shift-concurrency-browser.integration.ts`) is in Collab from `a50f1ea1`, at line 77. The rest of the file is newer Collab work. Archive. |
| timecards-final | **Included, after this review** | The Close open punch copy test is ported in `706eb75e`. The rest is changed again in Collab: Codex's `79ba7643`, plus the card commits. The branch's translated `timecards-heading.tsx` differs, but Collab's `TimecardsHeading` isn't used by any page (only a test mocks it), so it's unused code to remove later, not an English heading on screen. |

## Nothing still needs a fix before retirement

The remaining items are for Jose or later:
- **Owner language control:** an Owner's Profile has no language control. QA switched it through `PUT /api/account/language`. Should Owners be able to change language in Profile? (Product decision.)
- **Receipt time zone:** the EN receipt shows "AST" and the ES one "GMT-4" (es-PR has no short zone name).
- **Unused code:** remove `src/components/timecards-heading.tsx` and its copy.

## Evidence to preserve

Each archive tag keeps its branch's evidence. The ones to know about:
- **qa:** `tools/ui-audit/`, `qa/es-rc/` (final Spanish QA report and data), and the probes.
- **screens-final:** the guide bundles.
- **es-\*, staff:** the earlier Spanish tests and reports.
- **sweep-1:** the WebKit concurrency evidence.
- **timecards-final:** the Close open punch records.
