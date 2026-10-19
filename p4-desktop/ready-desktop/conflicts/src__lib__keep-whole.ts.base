/** TC-P3-09: times ("8:00 AM") and dates ("Oct 28, 2026") never break inside themselves; ranges break after the dash. */
export function keepWhole(text: string) {
  return text
    .replace(/(\d{1,2}:\d{2}) ([AP]M)/g, '$1\u00a0$2')
    .replace(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*) (\d{1,2})(, (\d{4}))?/g, (_, month, day, _y, year) => `${month}\u00a0${day}${year ? `,\u00a0${year}` : ''}`)
    .replace(/ – /g, '\u00a0– ');
}
