/** TC-P3-09: times ("8:00 AM"), dates ("Mon, Oct 28, 2026") and durations ("3h 40m") never break inside
 * themselves; a range breaks only after its dash, and a " · " separator never starts a line.
 * TC-P3-26: Safari writes "Oct 19 at 9:11 AM" where Chrome writes "Oct 19, 9:11 AM"; both read the Chrome way. */
export function keepWhole(text: string) {
  return text
    .replace(/(\d) at (\d{1,2}:\d{2})/g, '$1, $2')
    .replace(/(\d{1,2}:\d{2}(?::\d{2})?) ([AP]M)/g, '$1 $2')
    .replace(/\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*), /g, '$1, ')
    .replace(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*) (\d{1,2})(, (\d{4}))?/g, (_, month, day, _y, year) => `${month} ${day}${year ? `, ${year}` : ''}`)
    .replace(/\b(\d+h) (\d+m)\b/g, '$1 $2')
    .replace(/ – /g, ' – ')
    .replace(/ · /g, ' · ');
}
