/** Arrow-key movement in dense lists (D6). A list opts in with data-row-nav, whose
 * value is the row selector (":scope > *" when empty). Up and Down move focus to the
 * same control in the neighbouring row, or the nearest one it has. Text fields keep
 * their own arrow keys, and modified keys are left alone. */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),summary,[tabindex="0"]';
const TEXT_ENTRY = 'input:not([type="checkbox"]):not([type="radio"]),select,textarea,[contenteditable="true"]';

const visible = (element: HTMLElement) => element.getClientRects().length > 0;

/** Resolves an opt-in list target without moving focus or consuming keys used by text inputs. */
export function rowNavigationTarget(event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'target'>): HTMLElement | null {
  if ((event.key !== 'ArrowDown' && event.key !== 'ArrowUp') || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target || target.matches(TEXT_ENTRY)) return null;
  const list = target.closest<HTMLElement>('[data-row-nav]');
  if (!list) return null;
  // A row inside a closed <details> isn't reachable; the group's own <summary> is (IS-P4-06).
  const inClosedGroup = (row: HTMLElement) => { const group = row.closest('details:not([open])'); return !!group && !(row.matches('summary') && row.parentElement === group); };
  const rows = [...list.querySelectorAll<HTMLElement>(list.dataset.rowNav || ':scope > *')].filter(row => visible(row) && !inClosedGroup(row));
  const row = rows.find(candidate => candidate.contains(target));
  if (!row) return null;
  // A row that is itself focusable (a group's <summary>) is its own control (IS-P4-06).
  const controls = (container: HTMLElement) => [...(container.matches(FOCUSABLE) ? [container] : []), ...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
  const next = rows[rows.indexOf(row) + (event.key === 'ArrowDown' ? 1 : -1)];
  if (!next) return null;
  const options = controls(next);
  return options[Math.min(Math.max(0, controls(row).indexOf(target)), options.length - 1)] ?? null;
}

/** Prevents default scrolling only when a visible neighbouring focus target exists. */
export function handleRowNavigation(event: KeyboardEvent) {
  const destination = rowNavigationTarget(event);
  if (!destination) return;
  event.preventDefault();
  destination.focus();
}
