# NEVORA voice and writing standard

Applies to interface copy, specs, reviews, docs under `docs/product/`, commit messages and chat reports. Modelled on the
Google developer documentation style guide (https://developers.google.com/style). Payroll, tax and legal copy that Jose
has approved stays word for word; flag a problem in it, don't rewrite it.

## Tone

Professional, conversational and respectful, without slang (Google: "conversational, friendly, and respectful";
"conversational ... rather than a formal one"). Write like a capable colleague who respects the reader's time. Not
cute, not salesy, not apologetic, no exclamation marks.

## Rules

1. **Second person, active voice, present tense.** "You can change your shift", not "Shifts can be changed by users".
2. **Lead with the point.** The first words of a sentence, row, button or notice say what matters. Put conditions
   before instructions: "To swap a shift, open Schedule", not "Open Schedule to swap a shift".
3. **Sentence case** for headings, buttons, tabs and labels. Capitalise names only (NEVORA, Gusto).
4. **Plain words.** "use" not "utilize", "help" not "facilitate", "start" not "initiate", "about" not "approximately".
5. **Buttons are verbs that name the result:** "Approve request", "Save shift", "Send to payroll". Not "OK", "Submit",
   "Click here".
6. **Numbers as numerals,** units spelled the way the product shows them elsewhere. Dates and times in the reader's
   format.
7. **Errors say what happened and what to do next,** in that order, without blame. "We couldn't save the shift. Check
   your connection and try again." Never "Oops", never an error code alone.
8. **Empty states say why it's empty and offer the next step.** "No requests yet. When someone asks for time off, it
   shows here."
9. **One idea per sentence,** short paragraphs, lists for three or more parallel items.
10. **No directional or sensory-only instructions.** Not "click the green button on the right"; name the control.
11. **Inclusive, specific language.** "Manager", "team member" (or the role name the product uses), never gendered
    defaults. Use they/them for an unnamed person.

## Words and phrases to cut

From Google's tone page and word list (https://developers.google.com/style/tone,
https://developers.google.com/style/word-list):

- please in instructions; simply, "it's easy", quickly in a procedure; "let's"; "please note", "at this time"
- click here; above and below for position in the interface (name or link the target instead)
- allows you to (use "lets you"); could (use "can" where possible); comprise; and/or; and so on; abort
- access as a verb when a plainer verb fits (see, edit, find, use, view); actionable
- blacklist and whitelist (use blocklist or denylist, and allowlist)

NEVORA additions: utilize, leverage (as a verb), facilitate, in order to, obviously, of course, e.g. and i.e. (write
"for example" and "that is"), etc. at the end of a list (write "such as" and give the list).

## AI clichés: banned

Never write these, in product copy or in reports:

- delve, dive into, deep dive, unlock, unleash, elevate, empower, supercharge, seamless(ly), effortless(ly), robust,
  cutting-edge, game-changer, revolutionize, next-level, world-class (in product copy), bespoke, curated, holistic,
  synergy, journey (for a task), tapestry, landscape, realm, testament, navigate (meaning "deal with")
- "In today's fast-paced world", "It's important to note that", "It's worth noting", "Let's explore",
  "Whether you're X or Y", "Not only X but also Y", "At the end of the day", "Look no further"
- "Great question", "Certainly!", "Absolutely!", "I hope this helps", "Feel free to"
- Rule-of-three padding ("fast, simple and powerful") where only one claim is true
- Em dash chains used for drama, exclamation marks in product copy, emoji in product copy

If a sentence still works with the cliché removed, remove it. If it doesn't, replace it with the specific fact.

## Report style (for audits, reviews, chat)

- Findings first, ranked by severity; each has location, what is wrong, why it matters, the fix.
- State what you checked and how. Say plainly what you didn't check.
- No praise padding, no restating the request.
