/** Own notification kinds and their row labels. Shared by the server list and the phone rows, so a row's action and
 * icon follow its kind rather than words in its label. */
export const NOTIFICATION_KINDS=['SCHEDULE','TIME_OFF','EXCHANGE','CALLOUT','AVAILABILITY','SELF_TEST','COMMUNICATION','PAYROLL_STATEMENT'] as const;
export type NotificationKind=typeof NOTIFICATION_KINDS[number];
export const NOTIFICATION_LABELS:Record<NotificationKind,string>={SCHEDULE:'Schedule update',TIME_OFF:'Time off update',EXCHANGE:'Shift request update',CALLOUT:'Unable to work update',AVAILABILITY:'Availability update',SELF_TEST:'Device notification test',COMMUNICATION:'Team update',PAYROLL_STATEMENT:'Pay statement update'};
/** The kind of a listed row, from its exact label; null for anything not in the map. */
export function notificationKind(label:string):NotificationKind|null{return NOTIFICATION_KINDS.find(kind=>NOTIFICATION_LABELS[kind]===label)??null;}
