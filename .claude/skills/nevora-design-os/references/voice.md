# Voice and writing standard

Shared by Claude and Codex.

## Product copy: follow `docs/design/voice.md`

Every interface string (labels, buttons, messages, notifications, empty states, assistant answers) in English and Puerto
Rico Spanish follows **`docs/design/voice.md`**, Jose's approved writing guide (Nov 21, 2026): calm coworker, tú for
everyone, Dueño for Owner, quiet past-tense confirmations, "what happened, then what to do", neutral facts about people,
protected strings and its pre-ship checklist. That guide wins over this file. Approved payroll and legal text wins over
both; flag a problem in it, don't rewrite it.

This file adds two things the guide doesn't cover: the AI-cliché ban (which applies to product copy too) and the
standard for everything that isn't product copy.

## Specs, docs, reviews, handoffs, commit messages and chat reports

Based on the Google developer documentation style guide (https://developers.google.com/style/highlights,
https://developers.google.com/style/tone): conversational, friendly and respectful, without slang; not formal.

1. Second person and active voice. Say who does what.
2. Lead with the point; put conditions before instructions ("To swap a shift, open Schedule").
3. Sentence case for titles and headings.
4. Numbered lists for sequences; serial commas; interface element names in bold.
5. One idea per sentence; short paragraphs.
6. Findings first, ranked by severity; each has location, what's wrong, why it matters, the fix.
7. State what was checked and how; say plainly what wasn't checked. No praise padding, no restating the request.

Words to avoid, from Google's tone page and word list (https://developers.google.com/style/word-list): please in
instructions; simply, "it's easy" and quickly in a procedure; "let's"; "please note", "at this time"; click here; above
and below for interface position; "allows you to" (write "lets you"); could where can works; comprise; and/or; and so
on; abort; access as a verb when see, edit, find, use or view fits; actionable; blacklist and whitelist (write
blocklist or denylist, and allowlist). NEVORA additions: utilize, leverage as a verb, facilitate, in order to,
obviously, of course, e.g. and i.e., a trailing etc.

## AI clichés: banned everywhere

In product copy, specs and reports, in both languages:

- delve, dive into, deep dive, unlock, unleash, elevate, empower, supercharge, seamless(ly), effortless(ly), robust,
  cutting-edge, game-changer, revolutionize, next-level, world-class, bespoke, curated, holistic, synergy, journey (for
  a task), tapestry, landscape, realm, testament, navigate (meaning "deal with")
- "In today's fast-paced world", "It's important to note that", "It's worth noting", "Let's explore", "Whether you're X
  or Y", "Not only X but also Y", "At the end of the day", "Look no further"
- "Great question", "Certainly!", "Absolutely!", "I hope this helps", "Feel free to"
- Spanish equivalents: "sin problemas" or "sin fisuras" as filler, "potenciar", "llevar al siguiente nivel", "en el
  mundo actual", "es importante destacar que", "sumergirse en"
- Rule-of-three padding where only one claim is true; em dash chains for drama; exclamation marks; emoji in product copy

If a sentence still works with the cliché removed, remove it. If it doesn't, replace it with the specific fact.
