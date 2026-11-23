# Owner and Manager page sweep (Nov 22, 2026)

Every page in `page-inventory.md` sections B–J that the Owner (O) or a company-wide Manager (M) can open, captured as
both at 390 and 1440 px on the owned app's **production build** with fictional data. Raw records, with kit-marker
counts, button-style and type-size detail, notices and flags, are in `sweep-owner-manager.json`; thumbnails are in
`thumbs/om/<row>-<profile>-<width>.webp` (full-size PNGs stayed in `/tmp/nevora-sweep/om/`).

- **O** = Owner (fictional Jose Natal). **M** = Elena Ruiz, Manager with company-wide access and no Owner-given grants.
  **Mg** = the same Manager with Publish schedules, Approve leave and Review time exceptions granted (only on the rows
  that depend on a grant).
- **Cell** = family · visible words in the page body · distinct button styles. A state prefix means the page did not
  render normally (notice, restricted, not reachable, redirected).
- **Family**: B = teal band carrying the title over the #F2F5F4 canvas with white cards; Older = no band, older kit
  look; Mixed = the B band over a body still built from older-kit parts (10+ visible older-kit elements; most of
  these read as B on screen). Called from the screenshot pixels and the DOM kit-class counts,
  then checked on contact sheets; the JSON keeps both counts and says where the screenshot review changed the call.
- Rondo, payroll, Updates and open shifts were on. The modules all default to on; Rondo ran without an AI provider,
  so no generation happened.

## B. Home, navigation and messages

| # | Page | O 390 | O 1440 | M 390 | M 1440 | Notable problem |
|---|---|---|---|---|---|---|
| B1 | Home | B · 169w · 4b | B · 252w · 4b | B · 160w · 3b | B · 243w · 3b | Two filled CTAs for the same job above the fold (payroll notice 'Prepare Nov 2–8' and the dark payday card 'Prepare payroll'); 13 type sizes at 1440; phone page about 1,800 px tall |
| B2 | More (phone menu) | B · 23w · 1b | B · 15w · 1b | B · 24w · 1b | B · 17w · 1b | None seen |
| B3 | Notifications | B · 9w · 3b | B · 8w · 3b | Mixed · 40w · 2b | Mixed · 39w · 3b | Owner: 'Notifications didn't load' at both widths in two separate runs (the Manager's list loads); no failing /api response was recorded, so the failing read is probably a server action or client error and needs a dev-mode check |
| B4 | Things to do (manager inbox) | B · 365w · 4b | B · 364w · 4b | B · 317w · 4b | B · 317w · 4b | Long work list (~320–365 words, ~3,250 px tall on phone); the same time ranges repeat across sections |
| B5 | Requests hub (employee) | notice: B · 20w · 1b | notice: B · 19w · 1b | notice: B · 20w · 1b | notice: B · 19w · 1b | Dead-end notice for both profiles ('This Requests page is for employees'), one link to Things to do |
| B6 | Updates (messages) | Mixed · 47w · 3b | Mixed · 44w · 3b | Mixed · 47w · 3b | Mixed · 44w · 3b | B band over an older-kit (q-) list body |
| B7 | Update detail | Mixed · 41w · 2b | Mixed · 41w · 2b | Mixed · 41w · 2b | Mixed · 41w · 2b | Older-kit body under the band; destructive 'Withdraw update' sits as a full-width card under the message |
| B8 | Compose an update | Mixed · 20w · 1b | Mixed · 20w · 2b | Mixed · 20w · 1b | Mixed · 20w · 2b | Compose form built from older-kit parts (36+ visible q-/wb- elements); no h1 on the page (title lives in the sheet bar) |
| B9 | Help | B · 101w · 0b | B · 100w · 0b | B · 94w · 0b | B · 93w · 0b | Two explanatory callouts stacked under Contact before any help topics |
| B10 | Restricted ("That page is for Owners") | notice: B · 18w · 1b | notice: B · 17w · 1b | notice: B · 16w · 1b | notice: B · 15w · 1b | Owner opening it directly sees 'That page is for Owners and Managers' (no reason it applies to the Owner) |
| B11 | Page not found | not reachable: B · 24w · 1b | not reachable: B · 23w · 1b | not reachable: B · 24w · 1b | not reachable: B · 23w · 1b | None seen |

## C. Schedule, availability and shift changes

| # | Page | O 390 | O 1440 | M 390 | M 1440 | Notable problem |
|---|---|---|---|---|---|---|
| C1 | Schedule | B · 140w · 6b | Mixed · 476w · 7b | B · 140w · 6b | Mixed · 439w · 6b | Densest desktop page (450–480 words, 6–7 button styles, 10–11 type sizes); '40 h assigned this week' repeats per person; Owner gets a 'No pay rates' callout above the grid |
| C2 | Add shift | B · 20w · 1b | B · 21w · 2b | B · 20w · 1b | B · 21w · 2b | Phone uses the B sheet bar (Cancel/Save); Person picker lists every employee |
| C3 | Find cover: Review replacement | Older · 105w · 2b | Older · 105w · 2b | Older · 101w · 1b | Older · 101w · 1b | Older screen: no band, white sheet on a grey #F2F2F7 phone canvas, older kit (wa-/q-/nv-); two stacked explanatory notes and a 20-word approval checkbox before Save; the Manager without the grant gets 'Publishing permission needed' and no Save at all, only 'Back to coverage' |
| C3 (Mg) | Find cover: Review replacement, Manager with grants | | | Older · 105w · 2b | Older · 105w · 2b | With Publish schedules granted: Save replacement appears, with the approval checkbox |
| C4 | Edit shift / shift details | B · 42w · 2b | B · 43w · 3b | B · 42w · 2b | B · 43w · 3b | Phone sheet bar; 3 button styles at 1440 (Delete, Cancel, Save) |
| C5 | Find cover (who can cover) | B · 67w · 2b | B · 67w · 2b | B · 67w · 2b | B · 67w · 2b | Find cover renders as B (open shift card, 'Who can cover' list, Assign); same for both profiles |
| C5 (Mg) | Find cover (who can cover), Manager with grants | | | B · 67w · 2b | B · 67w · 2b | Same as without the grant |
| C6 | Build and publish | B · 27w · 0b | B · 27w · 1b | notice: B · 29w · 1b | notice: B · 29w · 1b | Manager without the grant: dead-end 'Publishing permission needed' card; with the grant the page matches the Owner's |
| C6 (Mg) | Build and publish, Manager with grants | | | B · 24w · 0b | B · 24w · 1b | With Publish schedules granted: same page as the Owner |
| C7 | Templates (copy a week) | Mixed · 27w · 1b | Mixed · 27w · 1b | Mixed · 27w · 1b | Mixed · 27w · 1b | Empty state card stacked over a one-field form; older-kit (wave) body under the band |
| C8 | Copy receipt | Older · 778w · 1b | Older · 778w · 1b | Older · 54w · 1b | Older · 54w · 1b | Older screen: no band, older kit (236 visible wa-/nv- elements); about 780 words because 'This week's availability has not been confirmed…' repeats 54 times; 5,000+ px tall on phone; the Manager opening the Owner's receipt gets 'Copy not confirmed' with a warning not to copy again |
| C9 | Scheduling rules | Mixed · 70w · 0b | Mixed · 70w · 0b | Mixed · 70w · 0b | Mixed · 70w · 0b | Older-kit rows (39 visible) under the band; no buttons, rows only |
| C10 | Availability | Mixed · 31w · 2b | Mixed · 34w · 2b | Mixed · 31w · 2b | Mixed · 34w · 2b | Older-kit (q-) list body under the band; deadline row reads Not set |
| C11 | Availability agreement | redirected: Mixed · 31w · 2b | redirected: Mixed · 34w · 2b | redirected: Mixed · 31w · 2b | redirected: Mixed · 34w · 2b | Redirects to team Availability (/app/availability) for both profiles; the agreement screen itself is not reachable from these roles |
| C12 | Shift changes (swaps and call-outs) | Mixed · 85w · 3b | Mixed · 104w · 3b | Mixed · 85w · 3b | Mixed · 104w · 3b | Heaviest older-kit body under a B band (~70–76 visible q-/sig-/wa- elements); 3 button styles; an earlier run showed an inline 'We couldn't check this right now. Reload to try again.' under a request on phone (not repeated in the final run) |
| C13 | Open shifts | B · 22w · 1b | B · 22w · 1b | notice: B · 22w · 0b | notice: B · 22w · 0b | Manager without the grant: two callouts stacked ('Posting and withdrawal require…' and 'No shift postings…') over an empty page |

## D. Time and timecards

| # | Page | O 390 | O 1440 | M 390 | M 1440 | Notable problem |
|---|---|---|---|---|---|---|
| D1 | Timecards | B · 134w · 2b | B · 168w · 4b | B · 133w · 2b | B · 168w · 4b | None seen; status pills repeat 'Correction waiting' |
| D2 | Time corrections (review) | B · 176w · 2b | B · 176w · 2b | notice: B · 46w · 1b | notice: B · 46w · 1b | Manager without the grant: the same 'You don't have access' message twice (page card and a toast) |
| D2 (Mg) | Time corrections (review), Manager with grants | | | B · 176w · 2b | B · 176w · 2b | With Review time exceptions granted: same page as the Owner |
| D3 | Fix someone's time (delegated correction) | B · 49w · 1b | B · 46w · 1b | B · 49w · 1b | B · 46w · 1b | Title repeated (band and card heading both 'Request time correction') |
| D4 | My time | notice: B · 16w · 1b | notice: B · 16w · 1b | notice: B · 16w · 1b | notice: B · 16w · 1b | Dead-end notice for both ('My time is for employees') |
| D5 | Clocker recovery review | B · 75w · 2b | B · 86w · 2b | restricted: B · 16w · 1b | restricted: B · 15w · 1b | Manager is sent to Restricted (Owner only, as the inventory says) |

## E. Time off and requests

| # | Page | O 390 | O 1440 | M 390 | M 1440 | Notable problem |
|---|---|---|---|---|---|---|
| E1 | Time off | Mixed · 71w · 3b | Mixed · 88w · 3b | notice: B · 31w · 1b | notice: B · 31w · 1b | Owner list body is older-kit (46 visible) under the band; Manager without Approve leave gets a dead-end 'Time off is decided by an Owner' card |
| E1 (Mg) | Time off, Manager with grants | | | Mixed · 71w · 3b | Mixed · 88w · 3b | With Approve leave granted: the Owner's list |

## F. Team

| # | Page | O 390 | O 1440 | M 390 | M 1440 | Notable problem |
|---|---|---|---|---|---|---|
| F1 | Team | B · 123w · 4b | B · 124w · 3b | B · 124w · 4b | B · 125w · 3b | None seen |
| F2 | Add person | B · 73w · 1b | B · 74w · 2b | B · 73w · 1b | B · 74w · 2b | Long single-column form at 1440 (1,200 px) |
| F3 | Import a staff list | notice: B · 26w · 1b | notice: B · 26w · 1b | notice: B · 24w · 1b | notice: B · 24w · 1b | Owner: 'Staff list import isn't available for this workplace yet' (feature off in this build); Manager: notice |
| F4 | Person (profile, role, access) | B · 54w · 2b | B · 56w · 2b | B · 46w · 2b | B · 46w · 2b | None seen |
| F5 | Person's pay rate | B · 62w · 1b | B · 64w · 1b | restricted: B · 16w · 1b | restricted: B · 15w · 1b | Two notes stacked (no pay rate callout + 'Only Owners see pay rates' note); Manager restricted |
| F6 | When they can be scheduled (restrictions) | B · 65w · 2b | B · 67w · 2b | B · 65w · 2b | B · 67w · 2b | Callout plus a footnote explaining weekly availability vs the agreement |
| F7 | Time off balance | B · 40w · 0b | B · 42w · 0b | restricted: B · 16w · 1b | restricted: B · 15w · 1b | Empty: callout to set up policies plus an explanatory note; Manager restricted |
| F8 | Clocker PIN | B · 25w · 1b | B · 27w · 1b | restricted: B · 16w · 1b | restricted: B · 15w · 1b | Owner: 'PINs can't be set right now' (this build has no Clocker PIN key, a harness setting); Manager restricted |
| F9 | Help someone sign in | Mixed · 125w · 1b | Mixed · 134w · 1b | Mixed · 112w · 1b | Mixed · 121w · 1b | Older-kit body (q-/wc-) under the band; 'Help someone sign in' repeated (band + card) on phone; ~125 words of instructions |

## G. Payroll and exports

| # | Page | O 390 | O 1440 | M 390 | M 1440 | Notable problem |
|---|---|---|---|---|---|---|
| G1 | Payroll | B · 140w · 2b | B · 117w · 2b | notice: B · 23w · 1b | notice: B · 22w · 1b | Manager gets 'Payroll is for Owners' (inventory marks M ✓) |
| G2 | Prepare payroll | B · 80w · 3b | B · 80w · 3b | notice: B · 23w · 1b | notice: B · 22w · 1b | Manager gets 'Payroll is for Owners' |
| G3 | Review pay | B · 54w · 2b | B · 54w · 2b | notice: B · 23w · 1b | notice: B · 22w · 1b | Manager gets 'Payroll is for Owners' |
| G4 | People in this payroll | B · 81w · 0b | B · 81w · 0b | notice: B · 23w · 1b | notice: B · 22w · 1b | Manager gets 'Payroll is for Owners' |
| G5 | Fix payroll | B · 9w · 0b | B · 9w · 0b | notice: B · 23w · 1b | notice: B · 22w · 1b | Nearly empty for the Owner ('Nothing stops this payroll'); Manager gets 'Payroll is for Owners' |
| G6 | Import payroll | B · 21w · 1b | B · 21w · 1b | notice: B · 23w · 1b | notice: B · 22w · 1b | Without a run it is a dead-end card ('Choose a payroll to import into'); Manager gets 'Payroll is for Owners' |
| G7 | Payroll history | B · 80w · 1b | B · 80w · 1b | notice: B · 23w · 1b | notice: B · 22w · 1b | Manager gets 'Payroll is for Owners' |
| G8 | Time exports | B · 82w · 1b | B · 86w · 2b | B · 74w · 1b | B · 74w · 1b | None seen; Create export disabled until timecards are approved |
| G9 | Paid time export | B · 31w · 1b | B · 31w · 1b | B · 31w · 1b | B · 31w · 1b | Dead-end card until people are chosen on Time exports |

## H. Rondo AI and insights

| # | Page | O 390 | O 1440 | M 390 | M 1440 | Notable problem |
|---|---|---|---|---|---|---|
| H1 | Rondo AI | B · 426w · 5b | B · 435w · 5b | B · 113w · 2b | B · 120w · 2b | Owner page: ~430 words, 5 button styles, about 4,200 px tall on phone (second only to C8); 'Not relevant today' and other chips repeat per item; the Manager gets a short question list |
| H2 | Weekly plan ("Where are we short this week?") | B · 38w · 2b | B · 43w · 2b | not reachable: B · 24w · 1b | not reachable: B · 23w · 1b | Small controls on phone (4 under 32 px); Manager: Page not found |
| H3 | Business records | B · 20w · 2b | B · 26w · 2b | not reachable: B · 24w · 1b | not reachable: B · 23w · 1b | Empty state; Manager: Page not found |
| H4 | Company knowledge | B · 22w · 1b | B · 28w · 1b | not reachable: B · 24w · 1b | not reachable: B · 23w · 1b | Empty state; Manager: Page not found |
| H5 | Insights | B · 97w · 2b | B · 94w · 2b | B · 97w · 2b | B · 94w · 2b | Callout '55 clock-ins couldn't be compared' sits between metrics |
| H6 | Christmas bonus | B · 55w · 1b | B · 64w · 1b | B · 55w · 1b | B · 64w · 1b | Informational callout on top of a near-empty page |

## I. Profile and account

| # | Page | O 390 | O 1440 | M 390 | M 1440 | Notable problem |
|---|---|---|---|---|---|---|
| I1 | Profile | Mixed · 25w · 1b | Mixed · 22w · 1b | Mixed · 108w · 0b | Mixed · 106w · 0b | Manager profile repeats 'Jose Natal can change this' per field |
| I2 | Policy document | redirected: Mixed · 34w · 1b | redirected: Mixed · 31w · 1b | redirected: Mixed · 117w · 0b | redirected: Mixed · 115w · 0b | Redirects to Profile with Privacy and terms opened (/app/profile#profile-privacy); the document page itself did not open in this production build |
| I3 | Calendar subscription | notice: B · 24w · 1b | notice: B · 23w · 1b | notice: B · 24w · 1b | notice: B · 23w · 1b | Dead-end notice for both ('Calendar links are for Employees and Leads') |
| I4 | Device alerts | redirected: Mixed · 25w · 1b | redirected: Mixed · 22w · 1b | redirected: Mixed · 108w · 0b | redirected: Mixed · 106w · 0b | Redirects to Profile (#profile-device-alerts); device alerts were off in this build |
| I5 | Passkeys | redirected: Mixed · 35w · 3b | redirected: Mixed · 31w · 3b | redirected: Mixed · 118w · 2b | redirected: Mixed · 115w · 2b | Redirects to Profile (#profile-passkeys); the passkeys API answers 404 not_supported in this build (no passkey origin configured), yet the Profile shows 'Couldn't load your passkeys. Try again' instead of hiding the section |
| I6 | Delete my account | Mixed · 170w · 3b | Mixed · 170w · 3b | Mixed · 154w · 3b | Mixed · 154w · 3b | Long confirmation page (~155–170 words, 3 button styles); older-kit (q-) body under the band |

## J. Settings and billing (Owner)

| # | Page | O 390 | O 1440 | M 390 | M 1440 | Notable problem |
|---|---|---|---|---|---|---|
| J1 | Settings | B · 44w · 0b | B · 43w · 0b | notice: B · 20w · 1b | notice: B · 19w · 1b | Manager gets 'Settings are for Owners' |
| J2 | Workspace | Mixed · 22w · 0b | Mixed · 22w · 0b | notice: B · 23w · 1b | notice: B · 22w · 1b | Older-kit (wave-c) form under the band; Manager notice |
| J3 | Branding | Mixed · 28w · 1b | Mixed · 28w · 1b | notice: B · 22w · 1b | notice: B · 21w · 1b | Older-kit body under the band; Manager notice |
| J4 | Features (modules) | Mixed · 71w · 0b | Mixed · 71w · 0b | notice: B · 25w · 1b | notice: B · 24w · 1b | Older-kit body (41 visible); 5 small toggles on phone; Manager notice |
| J5 | Locations | Mixed · 26w · 0b | Mixed · 26w · 0b | notice: B · 22w · 1b | notice: B · 21w · 1b | Older-kit (q-/wc-) settings body under the band; Manager notice |
| J6 | Add location | Mixed · 16w · 1b | Mixed · 16w · 2b | notice: B · 22w · 1b | notice: B · 21w · 1b | Older-kit (q-/wc-) settings body under the band; Manager notice |
| J7 | Edit location | Mixed · 20w · 2b | Mixed · 20w · 2b | notice: B · 22w · 1b | notice: B · 21w · 1b | Older-kit (q-/wc-) settings body under the band; Manager notice |
| J8 | Positions | Mixed · 30w · 1b | Mixed · 30w · 1b | notice: B · 22w · 1b | notice: B · 21w · 1b | Older-kit (q-/wc-) settings body under the band; Manager notice |
| J9 | Breaks | Mixed · 20w · 2b | Mixed · 20w · 2b | notice: B · 23w · 1b | notice: B · 22w · 1b | Older-kit (q-/wc-) settings body under the band; Manager notice |
| J10 | Time off policies | B · 52w · 3b | B · 52w · 3b | notice: B · 20w · 1b | notice: B · 19w · 1b | Empty state with three action styles (filled 'Add Vacation', plain 'Add Sick', link 'Add another policy') plus a note (QA A1-05 still visible); Manager notice |
| J11 | Company policies | Mixed · 48w · 0b | Mixed · 48w · 0b | notice: B · 23w · 1b | notice: B · 22w · 1b | Older-kit toggle list (~50 visible); 6 controls under 32 px on phone; Manager notice |
| J12 | Payroll settings | B · 52w · 0b | B · 67w · 1b | notice: B · 23w · 1b | notice: B · 22w · 1b | Manager notice |
| J13 | Clocker devices | B · 36w · 3b | B · 46w · 3b | notice: B · 23w · 1b | notice: B · 22w · 1b | Manager notice |
| J14 | Clocker schedule matching | B · 49w · 0b | B · 59w · 0b | notice: B · 24w · 1b | notice: B · 23w · 1b | Manager notice |
| J15 | Clocker photos | B · 105w · 0b | B · 116w · 0b | notice: B · 23w · 1b | notice: B · 22w · 1b | Callout 'Punch photos aren't available yet' above settings that cannot take effect; 5 small toggles on phone; Manager notice |
| J16 | Clocker photo review | B · 47w · 1b | B · 57w · 1b | notice: B · 23w · 1b | notice: B · 22w · 1b | Manager notice |
| J17 | Clocker PINs | B · 139w · 3b | B · 139w · 3b | notice: B · 23w · 1b | notice: B · 22w · 1b | Manager notice |
| J18 | Billing (account recovery / plan) | Mixed · 58w · 4b | Mixed · 69w · 4b | notice: Mixed · 31w · 2b | notice: Mixed · 42w · 2b | Separate recovery frame (no app shell). Owner: 'We can't check billing right now' (no billing service in the fictional build); Manager: 'Workplace access needs attention' |

## The 20 worst pages

Ranked by family (Older, then Mixed, then B), then the most visible words, then the most button styles, using the
worst Owner or Manager capture of each page that rendered or showed a notice. Rows that only redirect to another page
(C11 to Availability; I2, I4 and I5 to Profile sections) are left out because they show that page.

| Rank | # | Page | Family | Words (max) | Button styles (max) | Why |
|---|---|---|---|---|---|---|
| 1 | C8 | Copy receipt | Older | 778 | 1 | Older family; most words in the sweep, one warning repeated 54 times |
| 2 | C3 | Find cover: Review replacement | Older | 105 | 2 | Older family (no band, older kit); Manager without the grant is left with no primary action |
| 3 | C1 | Schedule | Mixed | 476 | 7 | Most words of any B page at 1440 (~440–480), 6–7 button styles, 10–11 type sizes; per-person facts repeat |
| 4 | I6 | Delete my account | Mixed | 170 | 3 | Older-kit body; long explanatory copy with 3 button styles |
| 5 | F9 | Help someone sign in | Mixed | 134 | 1 | Older-kit body; instruction-heavy |
| 6 | I1 | Profile | Mixed | 108 | 1 | Manager profile repeats 'Jose Natal can change this' per field |
| 7 | C12 | Shift changes (swaps and call-outs) | Mixed | 104 | 3 | Heaviest older-kit body under a B band; 3 button styles |
| 8 | E1 | Time off | Mixed | 88 | 3 | Older-kit list body under the band; Manager without the grant hits a dead end |
| 9 | J4 | Features (modules) | Mixed | 71 | 1 | Older-kit body (41 visible); small toggles on phone |
| 10 | C9 | Scheduling rules | Mixed | 70 | 0 | Older-kit rows (39 visible) under the band |
| 11 | J18 | Billing (account recovery / plan) | Mixed | 69 | 4 | Separate recovery frame (no app shell). Owner: 'We can't check billing right now' (no billing service in the fictional build); Manager: 'Workplace access needs attention' |
| 12 | J11 | Company policies | Mixed | 48 | 1 | Older-kit toggle list (~50 visible); 6 controls under 32 px on phone |
| 13 | B6 | Updates (messages) | Mixed | 47 | 3 | B band over an older-kit (q-) list body |
| 14 | B7 | Update detail | Mixed | 41 | 2 | Older-kit body under the band; destructive 'Withdraw update' sits as a full-width card under the message |
| 15 | B3 | Notifications | Mixed | 40 | 3 | Owner: 'Notifications didn't load' at both widths in two separate runs (the Manager's list loads); no failing /api response was recorded, so the failing read is probably a server action or client error and needs a dev-mode check |
| 16 | C10 | Availability | Mixed | 34 | 2 | Older-kit (q-) list body under the band; deadline row reads Not set |
| 17 | J8 | Positions | Mixed | 30 | 1 | Older-kit (q-/wc-) settings body under the band; Manager notice |
| 18 | J3 | Branding | Mixed | 28 | 1 | Older-kit body under the band; Manager notice |
| 19 | C7 | Templates (copy a week) | Mixed | 27 | 1 | Empty state card stacked over a one-field form; older-kit (wave) body under the band |
| 20 | J5 | Locations | Mixed | 26 | 1 | Older-kit (q-/wc-) settings body under the band; Manager notice |

### Heaviest B pages

Only C3 and C8 are Older, so the ranking above runs into Mixed pages with few words quickly. The densest pages that
are fully B (no older-kit body) are next in line for a words and hierarchy pass:

| # | Page | Words (max) | Button styles | Type sizes | Note |
|---|---|---|---|---|---|
| H1 | Rondo AI (Owner) | 435 | 5 | 9 | 4,200 px tall on phone; repeated chips per item |
| B4 | Things to do | 365 | 4 | 8 | ~3,250 px on phone; time ranges repeat across sections |
| B1 | Home | 252 | 4 | 13 | Most type sizes in the sweep; two filled CTAs for one payroll job |
| D2 | Time corrections | 176 | 2 | 8 | "Clock in / Clock out" repeats per request |
| D1 | Timecards | 168 | 4 | 9 | |
| G1 | Payroll | 140 | 2 | 11 | 11 type sizes on phone |
| J17 | Clocker PINs | 139 | 3 | 8 | Position and location line repeats per person |

## Across the sweep

- **Coverage:** 78 inventory rows (B1–J18), each as Owner and as company-wide Manager at 390 and 1440 = 312 captures,
  plus 10 captures of the Manager with grants (C3, C5, C6, D2, E1) and 4 of `/app` while billing needs attention (J18x),
  326 records in all. Rows C14, C15 and G10 are not in scope (neither O nor M can open them).
- **Phone overflow:** 98 of 163 phone captures are 392 css px wide, 2 px wider than the 390 phone (Chromium widens the
  mobile layout viewport to fit, so the page itself reports no overflow). It is every page with the back-link band: all
  of sections H–J except the J18 frame, and most of B–G. Tab roots (Home, Things to do, Schedule, Timecards, Team, Payroll), C3 and C8 fit.
- **Where the inventory and the screen disagree:** G1–G7 show the Manager "Payroll is for Owners" (inventory: M ✓);
  C11 Availability agreement redirects to team Availability for both; I2 Policy document, I4 Device alerts and
  I5 Passkeys redirect to the matching Profile section; C6, C13, D2 and E1 are notices for a Manager without the
  Owner-given grant and the full page with it; H2–H4 are "Page not found" for the Manager; F3 is a notice for the
  Owner too ("Staff list import isn't available for this workplace yet"); B10 opened directly by the Owner says
  "That page is for Owners and Managers".
- **Dead-end notice pages** (one card, one link): B5, B10, D4, I3 for both; C6, C13, D2, E1, F3, G1–G7 and J1–J18 for the
  Manager (34 of the Manager's 78 rows end on one). They are all B and consistent.
- **Older-kit code under B styling:** 22 pages render the B band over bodies still built from wave/quiet/kit/signature
  classes (the "Mixed" rows). On screen most read as B; the JSON `markers` field lists the prefixes per capture for
  the "retire the pre-Direction B screens" pass.

## Harness notes and gaps

- Production build of the owned app (`NEVORA_OWNED_APP_PRODUCTION=1`), fictional seed (`NEVORA_SCAN_RICH_OWNER`
  recipe, `NEVORA_SCAN_LEAVE=1`, payroll on, a real schedule copy for C8), Chromium only. `NEVORA_SCAN_STATES_OWNER`
  was not used: it captures interaction states, not page data.
- **Device alerts were left off.** With them on, the harness sets an `http:` portal origin, which a production build
  refuses, so every JSON request failed with "This connection isn't secure" (seen in a first run and discarded). I4
  therefore shows Profile without device alerts.
- **Passkeys:** the build had the passkeys switch on but no passkey origin, so the API answers `404 not_supported`
  and Profile shows "Couldn't load your passkeys".
- **F8 Clocker PIN:** no Clocker PIN key in this build, so the Owner sees "PINs can't be set right now".
- **J18 Billing:** a separate build with commerce recovery on and no billing service, so the Owner sees "We can't
  check billing right now"; it can't show a real plan or payment state.
- **Rondo** ran with the Owner and Manager switches, weekly, knowledge and business imports on and no AI provider, so
  typed questions are off and nothing was generated.
- **B3 Owner Notifications** failed to load in both runs with no failing `/api` response; worth a dev-mode check.
- Words, button styles and type sizes come from the DOM of `main.page-frame` (the billing frame has no app shell, so
  its counts include its brand panel). Full-size PNGs are in `/tmp/nevora-sweep/om/run-om2/full/` and
  `/tmp/nevora-sweep/om/run-billing2/full/` on the sweep machine.
