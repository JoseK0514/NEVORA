/** Test helper: the page's HTML without its Direction B phone screen (the corporate layout that tablets and desktop show),
 * and the phone screen alone. Both screens render on the server; CSS shows one per width. */
function bounds(html: string) {
  const start = html.search(/<div class="b-screen[\s"]/);
  if (start < 0) return null;
  const tag = /<(\/?)div\b[^>]*>/g;
  tag.lastIndex = start;
  let depth = 0;
  for (let match = tag.exec(html); match; match = tag.exec(html)) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return { start, end: match.index + match[0].length };
  }
  return null;
}
export function withoutB(html: string) {
  const range = bounds(html);
  return range ? html.slice(0, range.start) + html.slice(range.end) : html;
}
export function onlyB(html: string) {
  const range = bounds(html);
  return range ? html.slice(range.start, range.end) : "";
}
