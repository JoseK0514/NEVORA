/** Measure the actual hit band, including the approved language pill's pseudo
 * element. A CSS declaration alone is insufficient: both outer edges must hit
 * the same native control. Serialize this function directly into Playwright. */
export function accessTargetHeights(elements: HTMLElement[]): number[] {
  return elements.map(element => {
    const rect = element.getBoundingClientRect();
    if (rect.height >= 44) return rect.height;
    const pseudo = getComputedStyle(element, '::after');
    if (pseudo.content === 'none' || pseudo.position !== 'absolute') return rect.height;
    const top = Math.min(0, parseFloat(pseudo.top) || 0), bottom = Math.min(0, parseFloat(pseudo.bottom) || 0);
    const height = rect.height - top - bottom, x = rect.left + rect.width / 2;
    if (height < 44) return rect.height;
    for (const y of [rect.top + top + 0.5, rect.bottom - bottom - 0.5]) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || !element.contains(hit)) return rect.height;
    }
    return height;
  });
}
