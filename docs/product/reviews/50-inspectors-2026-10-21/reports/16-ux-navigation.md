# 16 UX Designer — information architecture and navigation

**Verdict.** The skeleton is sound. The phone tab bar, the Inbox count, the bell dot and ⌘K all match the approved plan, and most manager jobs take one or two taps. Three things are weak. The new "Team tools" group sorts tools by where they used to live (Home), not by what they do. The three request lists, plus the Owner's settings pages on a phone, take three or four taps. Search, the Settings hub and the back links call the same places by different names or send people to the wrong parent.

## Two-tap check (new Manager or Owner, from any page; code reading, not timed)

| Job | Phone | Desktop | Pass |
|---|---|---|---|
| See today, act on Inbox items, approve time off | Home / Inbox tab → item (1–2) | same (1–2) | Yes |
| Add a shift | Schedule → Add shift (2) | Top bar on Home, or Schedule (1–2) | Yes |
| Team list / a person / add a person | Team tab (1) / 2 / 2 | same | Yes |
| Timecards, Payroll, Time exports, Insights, Templates, Scheduling rules, Updates | More → row (2) | sidebar (1); Time exports and Templates 2 | Yes |
| **Time off list, Shift requests, Availability** | Inbox → expand "All requests" → page (3). **4** when no request is waiting: Inbox → Requests filter → expand → page | Inbox → expand → page (3) | **No** |
| Team tools (Attendance … Account recovery) | More → **scroll** → row (2 + scroll) | sidebar (1) | Partly |
| **Owner: Locations, Positions, Clocker devices, Break types, Policies** | More → scroll → Settings → row (**3** + scroll) | Settings → row (2) | **No on phone** |
| Send an update | More → Updates → Compose (3) | Updates → Compose (2) | Phone no |
| Payroll settings | More → Timecards → tab (3) | Timecards → tab (2) | Phone no (rare) |

## Recommendations

1. **Break up "Team tools" and put each tool with its job.** Move Attendance to Time and pay, and Schedule activity to Schedule (history or the toolbar). Merge Team overview into Team as a "This week" view. Clocker recovery and Account recovery already have a home on the person page ("Clocker PIN", "Account recovery" rows) and in Settings › Access & recovery, so they don't need a sidebar slot.
   *Why:* `navigation.ts:84-95` says these tools are grouped because they "used to sit on Home". The group is the largest in the sidebar: 5 of 15 Owner entries, 33% of the list, for occasional tools (QAOWNER-home-1440, AUDIT-M-home-1440). On the phone it pushes Clocker recovery, Account recovery, My pay and Settings below the fold of More at 390×844 (qa-out/mgr/more-QAOWNER-chromium-390.png). "Team overview" also sits next to "Team", and "Team tools" sits next to "People › Team", so three labels compete for one idea (Hick's law, naming).
   *Impact:* High · *Effort:* M · *Owner:* Product (decide homes), then UI.

2. **Make the request lists reachable in two taps, and always visible.** Replace the collapsed "All requests" disclosure with a plain row of three links (Time off · Shift requests · Availability), shown under every Inbox filter, including when nothing is waiting. On desktop, show the three as indented sub-items under Inbox while you are on Inbox or one of those pages.
   *Why:* The disclosure only renders inside the Requests section. That section is hidden under "All" when nothing is waiting (`manager-inbox.tsx:426-431`), so the way in disappears exactly when someone wants history. The approved spec asked for one visible row named "All time off, shift requests and availability" (spec.md:50). The sidebar removed all three pages (`navigation.ts:51-53`), so desktop has no direct path either.
   *Impact:* High · *Effort:* S · *Owner:* UI.

3. **Let search (⌘K and More › Search) find everything the navigation hides.** Index the team tools, Notifications, Payroll settings and each Settings sub-page (Locations, Positions, Clocker devices, Break types, Company policies, Branding, Features). Add synonyms: "team, staff, people" → the people page; "reports" → Insights; "PTO, vacation, leave" → Time off; "swap, cover, callout" → Shift requests. Add Spanish synonyms too: horario, vacaciones, nómina, empleados, ajustes.
   *Why:* `finder.ts:19` indexes only `navigationForRole`, so none of these places can be found. The finder labels the people page "Employees" (`navigation.ts:144`) and has no keyword for "team", so typing "team" finds "Add an employee" but not the Team page. Search is the safety net for every item the sidebar removed, so its gaps show up first in the IA.
   *Impact:* High · *Effort:* S · *Owner:* UI.

4. **Give the people page one name.** It is "Team" in the sidebar, the tab bar and the page title (`navigation.ts:72,191`; `employee-directory.tsx:33`). It is "Employees" in search, and "Employees & access" in Settings (`settings/page.tsx:53`). The sidebar also ignores the company's own word: a company that chose "Associates" sees "Team" in the sidebar and "Associates" in search. Pick one rule, for example "Team" everywhere with the company word in the summary line, and apply it to search, Settings and the crumb.
   *Impact:* Medium · *Effort:* S · *Owner:* Product (rule), UI.

5. **Fix the stale "‹ Home" back links.** Attendance, Team overview and Schedule activity (`manager-dashboard.tsx:217`), Clocker recovery (`clocker-recovery-review.tsx:42`), Account recovery (`assisted-recovery.tsx:34`) and the recovery loading state (`settings/wave-c-recovery-loading.tsx:11`) all point back to Home. v3 moved these tools off Home, so the back link names a place that no longer holds them, and the sidebar lights a different group. Point each one back to where the user came from (sidebar group or person), or drop it on desktop, where the sidebar already shows where you are.
   *Impact:* Medium · *Effort:* S · *Owner:* UI.

6. **Close the Manager dead ends.** The Scheduling rules empty states link "Manage locations" to `/app/settings/locations` (`schedule/settings/page.tsx:119,148`). That page is Owner-only, and `requireRoles` silently redirects a Manager to Home (`auth/permissions.ts:30-31`), so a Manager sees no explanation. Show Managers "Ask the owner to add a location" instead, the way `employees/new/page.tsx:42` already checks the role. Also, `module-off.tsx:14` tells Managers to "Ask your manager"; it should say "Ask the owner".
   *Impact:* Medium · *Effort:* S · *Owner:* UI.

7. **Keep Settings to settings, and name its phone group correctly.** The Owner's Settings hub repeats places that already have their own entry: Team ("Employees & access"), Updates ("Company updates"), Scheduling rules, and both recovery tools (`settings/page.tsx:43,53-54,70-71`). Opening one of them jumps the sidebar to another group, and the destination has no way back to Settings. Remove the "Team & communications" group, and keep the recovery tools in one place (see 1). On the phone, Settings is filed under the **Account** heading in More (`navigation.ts:117`), but it is company settings, not the user's account. Give it a "Workspace" heading, as on desktop.
   *Impact:* Medium · *Effort:* S · *Owner:* Product, UI.

8. **Rename "Profile and device settings" and keep it in one place.** The button sits right under the Profile row in More and in the account menu (`app-shell.tsx:306,435`). It only opens the "Device settings" popover (`portal-device-setup.tsx:141`), which the Profile page already reaches as "Alerts on this device" (`profile/page.tsx:33`). Two neighbouring items both say "Profile". Keep it on the Profile page only, labelled "Alerts on this device".
   *Impact:* Low · *Effort:* S · *Owner:* UI.

9. **Choose one wayfinding device on desktop: the crumb or the back link.** The shell builds a "Section › Page › Sub-page" trail (`app-shell.tsx:88-101,284-291`), but CSS hides every item except the last (`premium-clean-manager.css:442`). On a person page the top bar therefore says "Team" (a link), and the band repeats "‹ Team" at the far right (QAOWNER-person-1440), away from the top-left position people expect. Either show a two-level trail with the parent linked and drop the back link on desktop, or make the top bar a plain title and keep one back link at top left. Related: Scheduling rules is a peer in the sidebar (Plan) but its page says "‹ Schedule" (`schedule/settings/page.tsx:65`).
   *Impact:* Low–Medium · *Effort:* S · *Owner:* UI.

10. **Make the Time and pay siblings consistent.** Timecards, Payroll, Time exports and Payroll settings share one section-tab row (`navigation.ts:232-237`). Yet Payroll keeps a sidebar entry while Time exports is hidden under Timecards (`navigation.ts:54`), and the sidebar says "Payroll" where the tab says "Payroll runs", which breaks the rule at TCD-19 that tabs use sidebar names. Either show both in the sidebar or hide both, and use one label.
    *Impact:* Low · *Effort:* S · *Owner:* UI.

## What's good

- The tab bar is unchanged and the holder model works: Time off lights Inbox, Time exports lights Timecards (`navigation.ts:48-82`). Old URLs keep working and moved tools keep their names, so existing users keep their muscle memory.
- Every list in the navigation is filtered by role, module and payroll (`navigationForRole`, `pathEnabled`, section tabs that drop a single tab). Turned-off features vanish everywhere at once, with no orphaned links in the navigation itself.
- On phones there is one count (the Inbox badge) plus a bell dot, and search is in the header on every manager page. ⌘K opens instantly with keyboard support and returns focus on close.

## Not checked / limits

- I did not use a browser (not allowed for this lens). Tap counts come from reading the code and existing screenshots, not from timed tasks with users.
- The More-sheet screenshot comes from an earlier QA round. The current code puts the profile card at the top of More (`app-shell.tsx:416`), so the fold position may differ slightly.
- I did not check Employee and Lead navigation in depth (outside v3). Leads get exactly the Employee navigation; whether they need lead tools is a product question.
- I did not check Spanish navigation labels beyond noting that navigation and search are English-only (`navigation.ts`; only the Clocker has a language toggle).
- I did not check deep links from notifications or emails, Android back, iOS edge swipe, or the 761–1023px tablet layout.
