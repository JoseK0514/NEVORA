// Runs in the real browser after native keyboard traversal. Direction B's
// sidebar paints its inset focus edge on ::after above the count badge.
export function measureKeyboardFocusIndicator(element, minimum = 2) {
  const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
  const after = getComputedStyle(element, '::after');
  const opaqueColor = text => {
    const match = text.match(/^rgba?\(([^)]+)\)$/);
    if (!match) return false;
    const values = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return (values.length === 3 || values.length === 4 && values[3] === 1) && values.every(Number.isFinite);
  };
  const focused = document.activeElement === element && element.matches(':focus-visible') && document.hasFocus();
  let visible = rect.width > 0 && rect.height > 0;
  for (let node = element; node; node = node.parentElement) {
    const value = getComputedStyle(node);
    visible &&= value.visibility === 'visible' && value.display !== 'none' && value.opacity === '1' && value.filter === 'none' && value.mixBlendMode === 'normal';
  }
  const owned = (x, y) => {const hit = document.elementFromPoint(x, y); return hit === element || hit !== null && element.contains(hit);};
  const edges = [[rect.left + rect.width / 2, rect.top + 1], [rect.left + rect.width / 2, rect.bottom - 1], [rect.left + 1, rect.top + rect.height / 2], [rect.right - 1, rect.top + rect.height / 2]].map(([x, y]) => ({x, y, owned: owned(x, y)}));
  const outlineWidth = parseFloat(style.outlineWidth);
  const outline = style.outlineStyle !== 'none' && opaqueColor(style.outlineColor) && outlineWidth >= minimum;
  const color = after.boxShadow.match(/rgba?\([^)]+\)/)?.[0] ?? '';
  const lengths = after.boxShadow.replace(/rgba?\([^)]+\)/g, '').match(/-?(?:\d*\.)?\d+px/g)?.map(Number.parseFloat) ?? [];
  const inset = [after.top, after.right, after.bottom, after.left].every(value => parseFloat(value) === 0);
  const boxExtent = (axis, first, second) => parseFloat(after[axis]) + (after.boxSizing === 'border-box' ? 0 : ['padding', 'border'].reduce((sum, kind) => sum + parseFloat(after[kind + first + (kind === 'border' ? 'Width' : '')]) + parseFloat(after[kind + second + (kind === 'border' ? 'Width' : '')]), 0));
  const coverage = {width: boxExtent('width', 'Left', 'Right'), height: boxExtent('height', 'Top', 'Bottom'), targetWidth: rect.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth), targetHeight: rect.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth)};
  const fullExtent = Math.abs(coverage.width - coverage.targetWidth) <= .75 && Math.abs(coverage.height - coverage.targetHeight) <= .75;
  const pseudo = after.content !== 'none' && after.display !== 'none' && after.visibility === 'visible' && after.opacity === '1' && after.position === 'absolute' && after.transform === 'none' && after.filter === 'none' && after.clipPath === 'none' && after.mixBlendMode === 'normal' && inset && fullExtent && parseFloat(after.width) > 0 && parseFloat(after.height) > 0 && Number(after.zIndex) >= 2 && /\binset\b/.test(after.boxShadow) && opaqueColor(color) && lengths.length === 4 && lengths.slice(0, 3).every(value => value === 0) && lengths[3] >= minimum;
  const source = outline ? 'outline' : pseudo ? 'pseudo-inset-shadow' : 'none';
  return {focused, visible, minimum, source, thickness: outline ? outlineWidth : pseudo ? lengths[3] : 0, meetsMinimum: focused && visible && edges.every(point => point.owned) && source !== 'none', width: rect.width, height: rect.height, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor, coverage, after: {content: after.content, display: after.display, position: after.position, top: after.top, right: after.right, bottom: after.bottom, left: after.left, opacity: after.opacity, visibility: after.visibility, zIndex: after.zIndex, boxShadow: after.boxShadow}, edges};
}
