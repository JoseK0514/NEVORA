export const workforcePermissionValues = ['PUBLISH_SCHEDULE', 'APPROVE_LEAVE', 'REVIEW_TIME_EXCEPTION'] as const;
export type WorkforcePermission = typeof workforcePermissionValues[number];
