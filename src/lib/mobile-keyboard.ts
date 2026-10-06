export function isMobileKeyboardVisible({
  hasFocusedField,
  hasMobileNavigation,
  layoutHeight,
  visualHeight,
}: {
  hasFocusedField: boolean;
  hasMobileNavigation: boolean;
  layoutHeight: number;
  visualHeight: number;
}) {
  return hasFocusedField && hasMobileNavigation && layoutHeight - visualHeight > 140;
}
