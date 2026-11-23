import type {ReactNode} from 'react';
import './treatments.css';

export const treatmentKeys = ['original', 'line', 'soft', 'accent'] as const;
export type Treatment = (typeof treatmentKeys)[number];
export const componentFamilies = [
  {
    id: 'actions',
    title: 'Buttons and actions',
    items: [
      {
        id: 'button',
        label: 'Action button',
        options: ['Solid teal', 'Fine outline', 'Inset capsule', 'Split icon'],
      },
      {
        id: 'icon-button',
        label: 'Icon button',
        options: ['Quiet glyph', 'Outline ring', 'Tinted tile', 'Solid disc'],
      },
      {
        id: 'busy-button',
        label: 'Saving button',
        options: ['Solid teal', 'Fine outline', 'Inset capsule', 'Split icon'],
      },
    ],
  },
  {
    id: 'select',
    title: 'Switches and selection',
    items: [
      {
        id: 'switch',
        label: 'Switch',
        options: ['Pill track', 'Slim track', 'Inset setting', 'Labeled track'],
      },
      {
        id: 'checkbox',
        label: 'Checkbox',
        options: ['Inline check', 'Ruled row', 'Choice card', 'Selected band'],
      },
      {
        id: 'radio',
        label: 'Radio choice',
        options: ['Inline radio', 'Ruled row', 'Choice card', 'Selected band'],
      },
      {
        id: 'segments',
        label: 'Segmented control',
        options: ['Sliding tile', 'Underline tabs', 'Pill group', 'Dark bar'],
      },
    ],
  },
  {
    id: 'waiting',
    title: 'Waiting and progress',
    items: [
      {
        id: 'spinner',
        label: 'Loading indicator',
        options: ['Radix spinner', 'Three dots', 'Pulsing bars', 'Dark capsule'],
      },
      {
        id: 'skeleton',
        label: 'Loading skeleton',
        options: ['Roster rows', 'Text lines', 'Avatar tiles', 'Ruled list'],
      },
      {
        id: 'progress',
        label: 'Progress indicator',
        options: ['Continuous track', 'Thin line', 'Segmented track', 'Inset meter'],
      },
    ],
  },
  {
    id: 'warnings',
    title: 'Labels and warnings',
    items: [
      {
        id: 'status',
        label: 'Status label',
        options: ['Soft badge', 'Outline pill', 'Filled label', 'Side rule'],
      },
      {
        id: 'notice',
        label: 'Inline warning',
        options: ['Icon and copy', 'Margin rule', 'Framed icon', 'Title band'],
      },
      {
        id: 'toast',
        label: 'Saved message',
        options: ['Soft toast', 'Outline toast', 'Soft pill', 'Accent edge'],
      },
    ],
  },
  {
    id: 'surfaces',
    title: 'Cards, rows and icons',
    items: [
      {
        id: 'card',
        label: 'Content card',
        options: ['Raised card', 'Ruled panel', 'Tinted header', 'Dark header'],
      },
      {
        id: 'row',
        label: 'Action row',
        options: ['List row', 'Ruled row', 'Inset tile', 'Leading rail'],
      },
      {
        id: 'avatar',
        label: 'Avatar',
        options: ['Initials disc', 'Double ring', 'Rounded tile', 'Stamped initials'],
      },
      {
        id: 'disc',
        label: 'Icon container',
        options: ['Mint disc', 'Fine ring', 'Rounded tile', 'Solid disc'],
      },
      {
        id: 'mark',
        label: 'Icon artwork',
        options: ['Filled', 'Bold outline', 'Duotone', 'Regular outline'],
      },
    ],
  },
  {
    id: 'glass',
    title: 'Glass and summaries',
    items: [
      {
        id: 'glass',
        label: 'Glass summary',
        options: ['Teal glass', 'Frosted light', 'Inset tiles', 'Midnight glass'],
      },
      {
        id: 'week',
        label: 'Week picker',
        options: ['Soft stepper', 'Framed stepper', 'Split controls', 'Dark capsule'],
      },
    ],
  },
  {
    id: 'forms',
    title: 'Form fields',
    items: [
      {
        id: 'field',
        label: 'Text input',
        options: ['Outlined field', 'Underline', 'Inset fill', 'Accent edge'],
      },
      {
        id: 'select-input',
        label: 'Dropdown',
        options: ['Outlined field', 'Underline', 'Inset fill', 'Accent edge'],
      },
      {
        id: 'search',
        label: 'Search field',
        options: ['Outlined field', 'Underline', 'Search capsule', 'Accent edge'],
      },
      {
        id: 'datetime',
        label: 'Date and time',
        options: ['Outlined field', 'Underline', 'Inset fill', 'Accent edge'],
      },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation and filters',
    items: [
      {
        id: 'navigation',
        label: 'Navigation',
        options: ['Selected tile', 'Underline', 'Pill navigation', 'Dark dock'],
      },
      {
        id: 'filters',
        label: 'Filter chips',
        options: ['Filter chips', 'Outline group', 'Soft pills', 'Dark bar'],
      },
      {
        id: 'overflow',
        label: 'Overflow menu',
        options: ['Surface menu', 'Fine outline', 'Rounded panel', 'Dark menu'],
      },
    ],
  },
  {
    id: 'dialogs',
    title: 'Dialogs and sheets',
    items: [
      {
        id: 'dialog',
        label: 'Confirmation dialog',
        options: ['Floating card', 'Ruled header', 'Tinted panel', 'Dark header'],
      },
      {
        id: 'sheet',
        label: 'Action sheet',
        options: ['Rounded sheet', 'Ruled list', 'Inset panel', 'Dark header'],
      },
    ],
  },
  {
    id: 'results',
    title: 'Results and recovery',
    items: [
      {
        id: 'result',
        label: 'Result and recovery message',
        options: ['Action card', 'Margin rule', 'Inset panel', 'Dark heading'],
      },
    ],
  },
  {
    id: 'workforce',
    title: 'People and records',
    items: [
      {
        id: 'shift',
        label: 'Shift row',
        options: ['Roster card', 'Ledger line', 'Staff card', 'Time first'],
      },
      {
        id: 'timecard',
        label: 'Timecard',
        options: ['Statement', 'Ruled ledger', 'Inset total', 'Dark total'],
      },
      {
        id: 'pay',
        label: 'Pay summary',
        options: ['Statement', 'Ruled ledger', 'Inset total', 'Dark total'],
      },
      {
        id: 'approval',
        label: 'Approval request',
        options: ['Request row', 'Margin rule', 'Inset card', 'Decision bar'],
      },
    ],
  },
  {
    id: 'clocker',
    title: 'Clocker tablet',
    items: [
      {
        id: 'tablet',
        label: 'Tablet frame',
        options: ['Location card', 'Outline frame', 'Inset header', 'Dark frame'],
      },
      {
        id: 'setup',
        label: 'Tablet setup',
        options: ['Outlined field', 'Underline', 'Inset fill', 'Accent edge'],
      },
      {
        id: 'employee-id',
        label: 'Employee ID',
        options: ['Outlined field', 'Underline', 'Inset fill', 'Accent edge'],
      },
      {
        id: 'pin',
        label: 'PIN pad',
        options: ['Key tiles', 'Open keypad', 'Round keys', 'Dark keypad'],
      },
      {
        id: 'punch',
        label: 'Clock in and out',
        options: ['Action bar', 'Outline action', 'Inset action', 'Stacked action'],
      },
      {
        id: 'break',
        label: 'Rest and meal breaks',
        options: ['Action bar', 'Outline action', 'Inset action', 'Stacked action'],
      },
      {
        id: 'photo',
        label: 'Punch photo',
        options: ['Rounded frame', 'Guide corners', 'Portrait frame', 'Dark viewfinder'],
      },
      {
        id: 'receipt',
        label: 'Recorded receipt',
        options: ['Receipt card', 'Receipt slip', 'Inset ticket', 'Dark heading'],
      },
      {
        id: 'unconfirmed',
        label: 'Unconfirmed punch',
        options: ['Status card', 'Margin rule', 'Inset ticket', 'Dark heading'],
      },
    ],
  },
] as const;
export type ComponentPart = (typeof componentFamilies)[number]['items'][number]['id'];
export type ReviewItem = (typeof componentFamilies)[number]['items'][number];
export const reviewItems: readonly ReviewItem[] = componentFamilies.flatMap<ReviewItem>(
  group => group.items,
);
export function ComponentStyle({
  part,
  treatment,
  children,
}: {
  part: ComponentPart;
  treatment: Treatment;
  children: ReactNode;
}) {
  return (
    <div className="nv-look" data-part={part} data-look={treatment}>
      {children}
    </div>
  );
}
