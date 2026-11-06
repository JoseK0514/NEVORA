/** Moves focus to the first of these elements that is on screen: the phone's Direction B screen or the corporate layout,
 * whichever CSS shows at this width. With neither measurable (no layout, as in a test DOM) the first one is used, as
 * before. A heading becomes a programmatic focus target. Returns the element that was focused. */
export function focusShown(...elements: (HTMLElement | null | undefined)[]) {
  const present = elements.filter((element): element is HTMLElement => !!element);
  const target = present.find(element => element.getClientRects().length > 0) ?? present[0] ?? null;
  if (target) {
    if (/^H[1-6]$/.test(target.tagName) && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus();
  }
  return target;
}
