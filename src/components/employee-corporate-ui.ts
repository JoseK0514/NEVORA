// Native presentation ports of 21st Button 143, Input 167 and Item 8663.
// Keep the owning component's element, event handlers and accessibility intact.
export function employeeButtonClass(variant: 'primary' | 'secondary' | 'quiet' | 'destructive', legacyClassName = '') {
  return ['employee-corporate-button', `employee-corporate-button--${variant}`, legacyClassName].filter(Boolean).join(' ');
}

export function employeeInputClass(legacyClassName = '') {
  return ['employee-corporate-input', legacyClassName].filter(Boolean).join(' ');
}

export function employeeRowClass(legacyClassName = '') {
  return ['employee-corporate-row', legacyClassName].filter(Boolean).join(' ');
}
