import type {ComponentPart} from '../../src/components/premium/treatments';
export const radixParts = {
  button: 'button',
  'busy-button': 'button',
  'icon-button': 'icon-button',
  switch: 'switch',
  checkbox: 'checkbox',
  radio: 'radio-group',
  segments: 'segmented-control',
  spinner: 'spinner',
  skeleton: 'skeleton',
  progress: 'progress',
  status: 'badge',
  notice: 'callout',
  card: 'card',
  avatar: 'avatar',
  field: 'text-field',
  search: 'text-field',
  'select-input': 'select',
  filters: 'segmented-control',
  timecard: 'data-list',
  pay: 'data-list',
  setup: 'text-field',
  'employee-id': 'text-field',
} as const;
export type RadixPart = keyof typeof radixParts;
export function usesRadix(part: ComponentPart): part is RadixPart {
  return Object.hasOwn(radixParts, part);
}
const radix = 'https://www.radix-ui.com/themes/docs/components/';
const carbon = 'https://carbondesignsystem.com/';
const material = 'https://developer.apple.com/design/human-interface-guidelines/materials';
type Reference = {name: string; url: string; detail: string};
const source = (name: string, url: string, detail: string): Reference => ({name, url, detail});
const alert = source(
  'IBM Carbon · Notifications',
  carbon + 'components/notification/usage/',
  'A status message sits next to the affected action. Each severity has a text label and a distinct visual cue.',
);
const menu = source(
  'Radix Themes · Dropdown Menu',
  radix + 'dropdown-menu',
  'Actions stay near the trigger. Keyboard focus returns to it when the menu closes.',
);
const dialog = source(
  'Radix Themes · Alert Dialog',
  radix + 'alert-dialog',
  'Keep the consequence and the decision together, with a visible way to cancel.',
);
const records = source(
  'Radix Themes · Data List',
  radix + 'data-list',
  'Pair each value with its label. The reading order and tabular figures keep records easy to scan.',
);
const icons = source(
  'Phosphor · Icon family',
  'https://phosphoricons.com/',
  'The gallery renders the installed Phosphor React artwork. The same subject stays recognizable across weights and containers.',
);
const empty = source(
  'IBM Carbon · Empty states',
  carbon + 'patterns/empty-states-pattern/',
  'Give the state a specific name and one useful next action.',
);
const other: Record<Exclude<ComponentPart, RadixPart>, Reference> = {
  toast: alert,
  row: source(
    'IBM Carbon · Tile',
    carbon + 'components/tile/usage/',
    'Give each actionable row one destination and an obvious affordance.',
  ),
  disc: icons,
  mark: icons,
  glass: source(
    'Apple HIG · Materials',
    material,
    'These NEVORA summary tiles use tinted content surfaces with consistent text contrast. More opaque treatments keep the metrics legible.',
  ),
  week: source(
    'Radix Themes · Icon Button',
    radix + 'icon-button',
    'Keep the previous and next controls balanced around a stable-width date range.',
  ),
  datetime: source(
    'IBM Carbon · Date picker',
    carbon + 'components/date-picker/usage/',
    'Keep labels visible and use native date and time input for direct entry.',
  ),
  navigation: source(
    'Radix Themes · Tab Nav',
    radix + 'tab-nav',
    'Keep link destinations in a stable order and indicate the current destination with shape as well as color.',
  ),
  overflow: menu,
  dialog,
  sheet: source(
    'Radix Themes · Dialog',
    radix + 'dialog',
    'Group related actions together and provide a clear dismissal action.',
  ),
  result: empty,
  shift: records,
  approval: source(
    'Radix Themes · Card',
    radix + 'card',
    'Put the employee, request details and decision controls on one surface.',
  ),
  tablet: source(
    'IBM Carbon · Tile',
    carbon + 'components/tile/usage/',
    'NEVORA’s kiosk anchors the location and connection state above the primary task.',
  ),
  pin: source(
    'Radix Themes · Button',
    radix + 'button',
    'The NEVORA keypad uses consistent digit targets, a masked field and an explicit submit action.',
  ),
  punch: source(
    'Radix Themes · Button',
    radix + 'button',
    'One prominent action identifies the next punch. The location stays with the action.',
  ),
  break: source(
    'Radix Themes · Button',
    radix + 'button',
    'Rest and meal retain separate labels and Phosphor symbols on large touch targets.',
  ),
  photo: source(
    'IBM Carbon · File uploader',
    carbon + 'components/file-uploader/usage/',
    'The Clocker uses local image selection, a preview and explicit acceptance.',
  ),
  receipt: alert,
  unconfirmed: source(
    'IBM Carbon · Notifications',
    carbon + 'components/notification/usage/',
    'The Clocker keeps an unknown outcome distinct from a recorded punch and offers a status check.',
  ),
};
export function styleSource(part: ComponentPart): Reference {
  if (usesRadix(part)) {
    const component = radixParts[part],
      name = component
        .split('-')
        .map(w => w[0].toUpperCase() + w.slice(1))
        .join(' ');
    return {
      name: 'Radix Themes · ' + name,
      url: radix + component,
      detail:
        'The first option runs the published Radix component. The other three treatments use NEVORA’s component kit.',
    };
  }
  return other[part];
}

export const radixPatterns: Record<Exclude<ComponentPart, RadixPart | 'mark'>, string> = {
  toast: 'callout',
  row: 'card',
  disc: 'badge',
  glass: 'card',
  week: 'icon-button',
  datetime: 'text-field',
  navigation: 'tab-nav',
  overflow: 'dropdown-menu',
  dialog: 'alert-dialog',
  sheet: 'dialog',
  result: 'card',
  shift: 'card',
  approval: 'card',
  tablet: 'card',
  pin: 'button',
  punch: 'button',
  break: 'button',
  photo: 'aspect-ratio',
  receipt: 'card',
  unconfirmed: 'card',
};
export function upstream(part: ComponentPart) {
  if (part === 'mark')
    return {name: 'Phosphor', url: 'https://phosphoricons.com/', component: 'Phosphor React'};
  const slug = usesRadix(part) ? radixParts[part] : radixPatterns[part];
  return {
    name: usesRadix(part) ? 'Radix Themes' : 'Built with Radix',
    url: 'https://www.radix-ui.com/themes/docs/components/' + slug,
    component:
      'Radix ' +
      slug
        .split('-')
        .map(v => v[0].toUpperCase() + v.slice(1))
        .join(' '),
  };
}
