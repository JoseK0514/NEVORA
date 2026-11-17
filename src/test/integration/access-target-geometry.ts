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
    if (rect.height - top - bottom < 44) return rect.height;
    // The probe points must be on screen: elementFromPoint answers null above or below the viewport (a scrolled phone
    // band). Bring the control into view for the probe only, then put the scroll back as it was.
    const scroll = [window.scrollX, window.scrollY];
    element.scrollIntoView({block: 'center', inline: 'nearest'});
    try {
      const shown = element.getBoundingClientRect(), height = shown.height - top - bottom, x = shown.left + shown.width / 2;
      for (const y of [shown.top + top + 0.5, shown.bottom - bottom - 0.5]) {
        const hit = document.elementFromPoint(x, y);
        if (!hit || !element.contains(hit)) return rect.height;
      }
      return height;
    } finally { window.scrollTo(scroll[0], scroll[1]); }
  });
}
