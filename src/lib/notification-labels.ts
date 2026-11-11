/** Own notification kinds and their row labels. Shared by the server list and the phone rows, so a row's action and
 * icon follow its kind rather than words in its label. */
export const NOTIFICATION_KINDS=['SCHEDULE','TIME_OFF','EXCHANGE','CALLOUT','AVAILABILITY','SELF_TEST','COMMUNICATION','PAYROLL_STATEMENT'] as const;
export type NotificationKind=typeof NOTIFICATION_KINDS[number];
export const NOTIFICATION_LABELS:Record<NotificationKind,string>={SCHEDULE:'Schedule update',TIME_OFF:'Time-off update',EXCHANGE:'Shift request update',CALLOUT:'Can’t-work update',AVAILABILITY:'Availability update',SELF_TEST:'Device notification test',COMMUNICATION:'Team update',PAYROLL_STATEMENT:'Pay statement update'};
/** Exact legacy labels keep existing stored rows compatible; near-misses are never inferred. */
const LEGACY_NOTIFICATION_LABELS:Readonly<Record<string,NotificationKind>>={'Unable to work update':'CALLOUT','Callout update':'CALLOUT','Time off update':'TIME_OFF'};
/** The kind of a listed row, from its exact current or legacy label. */
export function notificationKind(label:string):NotificationKind|null{return NOTIFICATION_KINDS.find(kind=>NOTIFICATION_LABELS[kind]===label)??(Object.hasOwn(LEGACY_NOTIFICATION_LABELS,label)?LEGACY_NOTIFICATION_LABELS[label]:null);}
