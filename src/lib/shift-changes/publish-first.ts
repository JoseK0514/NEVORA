import { isValidWeekStart } from '../date-utils';

/** Owner/Manager refusal while a reported shift still has held edits (Jose, 2026-10-31). */
export const PUBLISH_CHANGES_FIRST = 'Publish the schedule changes for this shift first, then approve.';

/** Where the Owner publishes that week's held changes (Build and publish, its changes card). */
export function publishFirstHref(notice: string | null | undefined, weekStart: string): string | null {
  return notice === PUBLISH_CHANGES_FIRST && isValidWeekStart(weekStart) ? `/app/schedule/publish?week=${encodeURIComponent(weekStart)}#publish-changes` : null;
}
