/** TC-P3-09: times ("8:00 AM"), month and day ("Oct 28"; TC-P3-32: only those two are glued, so a long date can wrap after its weekday or before its year) and durations ("3h 40m") never break inside
 * themselves; a range breaks only after its dash, and a " · " separator never starts a line.
 * TC-P3-26: Safari writes "Oct 19 at 9:11 AM" where Chrome writes "Oct 19, 9:11 AM"; both read the Chrome way. */
export function keepWhole(text: string) {
  return text
    .replace(/(\d) at (\d{1,2}:\d{2})/g, '$1, $2')
    .replace(/(\d{1,2}:\d{2}(?::\d{2})?) ([AP]M)/g, '$1 $2')
    // WR-B-11: a short weekday stays with a short date ("Mon, Oct 19"); a long one ("Monday, October 19, 2026") may wrap.
    .replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d)/g, '$1, ')
    .replace(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*) (\d{1,2})(, (\d{4}))?/g, (_, month, day, _y, year) => `${month} ${day}${year ? `, ${year}` : ''}`)
    .replace(/\b(\d+h) (\d+m)\b/g, '$1 $2')
    // Review B6 (NV-069): an hours figure keeps its unit ("11.5 h", "8 h 30").
    .replace(/\b(\d+(?:\.\d+)?) h\b/g, '$1 h')
    .replace(/ – /g,' – ')
    .replace(/ · /g, ' · ');
}
