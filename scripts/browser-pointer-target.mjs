// Browser-side measurement. Compact kit buttons use a real ::after hit area;
// CSS dimensions alone do not establish that an expanded target is clickable.
export function measurePointerTarget(element, minimum = 44) {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const center = {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
  const owned = (x, y) => {
    const hit = document.elementFromPoint(x, y);
    return hit === element || (hit !== null && element.contains(hit));
  };
  const available = rect.width > 0 && rect.height > 0 && style.visibility === 'visible' && style.pointerEvents !== 'none';
  const samples = [];
  if (available) {
    const offset = minimum / 2 - 0.25;
    for (const x of [-offset, 0, offset]) for (const y of [-offset, 0, offset]) {
      samples.push({x: center.x + x, y: center.y + y, owned: owned(center.x + x, center.y + y)});
    }
  }
  const hitArea = available && samples.length === 9 && samples.every(point => point.owned);
  const visual = hitArea && rect.width >= minimum && rect.height >= minimum;
  return {minimum, visual: {width: rect.width, height: rect.height}, source: visual ? 'visual-box' : hitArea ? 'verified-hit-area' : 'none', samples, meetsMinimum: hitArea};
}
