type MenuGeometryInput = {
  trigger: { left: number; right: number; top: number; bottom: number };
  viewport: { width: number; height: number; offsetLeft?: number; offsetTop?: number };
  naturalHeight: number;
  align?: "start" | "end";
  /** Overrides the 318px default (still clamped to the viewport). */
  preferredWidth?: number;
};

const VIEWPORT_MARGIN = 12;
const MENU_GAP = 8;
const PREFERRED_WIDTH = 318;

export function actionMenuGeometry({ trigger, viewport, naturalHeight, align = "end", preferredWidth = PREFERRED_WIDTH }: MenuGeometryInput) {
  const width = Math.max(0, Math.min(preferredWidth, viewport.width - VIEWPORT_MARGIN * 2));
  const leftBound = (viewport.offsetLeft ?? 0) + Math.min(VIEWPORT_MARGIN, viewport.width / 2);
  const rightBound = (viewport.offsetLeft ?? 0) + viewport.width - Math.min(VIEWPORT_MARGIN, viewport.width / 2);
  const topBound = (viewport.offsetTop ?? 0) + Math.min(VIEWPORT_MARGIN, viewport.height / 2);
  const bottomBound = (viewport.offsetTop ?? 0) + viewport.height - Math.min(VIEWPORT_MARGIN, viewport.height / 2);
  const spaceBelow = Math.max(0, bottomBound - trigger.bottom - MENU_GAP);
  const spaceAbove = Math.max(0, trigger.top - topBound - MENU_GAP);
  const openAbove = naturalHeight > spaceBelow && spaceAbove > spaceBelow;
  // If neither side can fit the content, use the visible rectangle and clamp
  // its position. A side-only strip can be smaller than one native action.
  const sideSpace = openAbove ? spaceAbove : spaceBelow;
  const available = naturalHeight > sideSpace ? bottomBound - topBound : sideSpace;
  const maxHeight = Math.max(0, Math.floor(Math.min(bottomBound - topBound, available)));
  const desiredLeft = align === "end" ? trigger.right - width : trigger.left;
  const left = Math.min(Math.max(leftBound, Math.round(desiredLeft)), rightBound - width);
  const height = Math.min(naturalHeight, maxHeight);
  const desiredTop = openAbove ? trigger.top - MENU_GAP - height : trigger.bottom + MENU_GAP;
  const top = Math.min(Math.max(topBound, Math.round(desiredTop)), bottomBound - height);
  return { left, top, width, maxHeight };
}
