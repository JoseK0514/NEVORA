# Owner confirmations review A (captures cap/confA-final; reviewer Nov 20, 2026). Paths under src/.
Models that already work: ca-73-publish-result-390 (mark, title, one line, one tinted step), ca-92 company-profile-saved, the question block in ca-23-leave-cancel-confirm.
1 H shift-request results (ca-34/38/42): green strip "Completed. The current schedule…" under two disabled pills. -> BState done 36px, "Swap approved"/"Cover approved"/"Call-out approved", one next fact, buttons removed. components/shift-change-form-state.ts
2 H declined shift request (ca-36/40/44) is the same green strip, "Request closed. Review its current status below." (nothing below). -> neutral grey result "Swap declined", "Ana and James keep their shifts."
3 H desktop publish result (ca-73-1440): dark teal sentence on the band (~1.5:1). -> same done card as phone. app/app/schedule/page.tsx
4 H add shift saved (ca-64): no result; lands on an off-brand "Opened for review" Schedule view (phone: white top bar, boxed select, red "Open shift"; desktop: unreadable band text, square button, square teal outline). app/app/schedule/page.tsx
5 H server refusal on Add shift (ca-65): pink sliver under the button (Jose flagged this himself). ConfigurationForm now draws a kit note; wording still the server's sentence (lib/scheduling/validate-shift.ts).
6 H four looks for a destructive confirm: ca-11 (grey Keep, text Decline), ca-16 (tinted Keep, solid red Decline), ca-23 (quiet Keep it, red-outline Cancel time off), ca-61 (outline red text over Keep shift). -> one pair: quiet text left, red-edged pill right. components/owner-b/inbox-b.tsx, components/time-off-waiting-list.tsx, app/app/schedule/edit/delete-shift-button.tsx, app/app/b-workforce.css
7 H time off Decline step asks no question (ca-11, ca-16); buttons swap places under the thumb. -> one 600 line "Decline this request?" + consequence, reuse the ca-23 block.
8 H results as loose grey text on the canvas: ca-17 "Decision saved.", ca-24 "Time off cancelled…", ca-53/55 corrections. -> the ca-92 one-row done card. components/manager-time-off.tsx, app/app/requests/page.tsx, components/time-off-admin/copy.ts, components/manager-time-corrections.tsx
9 M phone card drops off the band when a result line appears (ca-17-390, ca-24-390). -> result inside the first card.
10 M said twice: ca-17 inline line + toast. Keep one (rule: inline result sends no toast). components/toaster.tsx
11 M delete shift confirm not a block (ca-61): desktop sentence left, buttons 650px right outside the card; phone no title, destructive on top. -> title "Delete this shift?", consequence, quiet Keep shift + red Delete shift on one row in the card footer.
12 M "Review before publishing" (ca-72): browser bullets, no glyph, only "Publish … anyway", no way back. -> one row per warning (18px Warning, count 600), quiet "Back to schedule". components/publish-warning-review-surface.tsx
13 M list after a decision (ca-17-390): "Checking the schedule..." under every row, Approve becomes "Review", grey slab header. components/time-off-waiting-list.tsx
14 M toasts: "The employee" not the name; ca-90 three lines; covers next row's buttons on phones. -> one fact, two lines max. components/toaster.tsx, app/app/settings/actions.ts
15 M Positions saves with a toast, Company profile with an inline card: pick the card.
16 M Already approved/declined page (ca-14/20/21): lines end on the dot, time range splits, chip floats, two equal link rows. -> BSegs/BWhen, chip on name line, one tinted "Back to Things to do".
17 M Approved tab rows (ca-22..24): dot-ending lines; "Approved" chip on every row; underlined "Cancel approval" link. -> no chip on this tab, b-rowact--quiet right-aligned. app/app/b-workforce.css
18 M orphan "Ana gets a notification either way." under the uncertain note (ca-13). Hide while the note shows. components/manager-time-off.tsx
19 M publish list rows (ca-70-390): range breaks, "Added" twice. BSegs+BWhen.
20 M finder icons generic (ca-83): one bolt for every action, one blank file for every page. -> each destination's own glyph. components/command-finder.tsx. 26 L no results: "Nothing matches 'x'", keep only Esc hint.
21 M menus (ca-74/75): dividers inset left only; chevrons on plain items; thin check; phone sheet list style differs, last item on the bottom edge. app/app/schedule/schedule-corp.css, b-foundation.css
22 M nested card: ca-55-390 "Nothing to fix" state card inside the outer card under the result line.
23 L confirm pills 40px/13px beside 44px/15px (ca-16-1440). 24 L cover detail repeats "Picked up by…". 25 L two empty states (bare "You're all caught up." vs state card). 27 L stray teal curved line ca-51-390 y~1060 (clipped focus ring?). 28 L ca-73-390 band still says "Publish changes" over the result. 29 L add shift errors (ca-62): doubled red edge; off switch dark grey reads disabled.
30 pattern: tinted notes/chips/count pills hurt most in ca-13, ca-74-1440, ca-70/72, ca-12/18 "Waiting", ca-22..24, ca-51..54 (pill in tinted box in card), ca-31..44 (grey detail box).
Behaviour table (needs Jose): time off asks before Decline (no question text); swap/cover/call-out/correction decline on one tap; results are toast / canvas line / in-card line / green strip / done card; some rows leave, some stay until reload.
