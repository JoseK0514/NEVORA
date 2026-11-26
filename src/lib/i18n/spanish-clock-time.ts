/** Add the definite article to a formatted 12-hour clock time, preserving its spacing. */
export function withSpanishHourArticle(time: string): string {
  return `${time.startsWith("1:") ? "la" : "las"} ${time}`;
}
