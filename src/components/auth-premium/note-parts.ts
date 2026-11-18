/* Premium pass FD (Nov 18, 2026): how a signed-out page's message becomes a note (the kit's BCallout), word for word.
 * A note's bold title is a short first sentence that more text follows: "Too many attempts" over "For your safety, …".
 * A message of one sentence, or one whose first sentence runs past NOTE_TITLE_MAX characters, is all body text, so a
 * long sentence never turns into a bold block of three or four lines on a 320px phone (final review D, row 17). The
 * title drops its sentence's period; the body keeps every word and mark as written. */

/** About two lines of a note's 600 title on a 320px phone (a 188px measure at 14.5px). */
export const NOTE_TITLE_MAX = 48;

export type NoteParts = { title: string | null; body: string | null };

export function noteParts(message: string): NoteParts {
  const text = message.trim();
  if (!text) return { title: null, body: null };
  const split = /^(.+?)\.\s+(\S[\s\S]*)$/.exec(text);
  if (!split || split[1].length > NOTE_TITLE_MAX) return { title: null, body: text };
  return { title: split[1], body: split[2] };
}
