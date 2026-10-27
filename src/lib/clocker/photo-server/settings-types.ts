import type { PhotoCompanyNoticeSettings, PhotoPolicy, PhotoRemovalResult, PhotoReviewPage, PhotoReviewRecord } from './contracts';
export type PhotoActionError = { state: 'unavailable' | 'rejected'; message: string; code?: string };
export type PhotoSettingsActionResult = { state: 'available'; policy: PhotoPolicy }
  | PhotoActionError;
export type PhotoNoticeActionResult = { state: 'available'; settings: PhotoCompanyNoticeSettings } | PhotoActionError;
export type PhotoReviewListActionResult = { state: 'available'; page: PhotoReviewPage } | PhotoActionError;
export type PhotoReviewDetailActionResult = { state: 'available'; record: PhotoReviewRecord | null } | PhotoActionError;
export type PhotoReviewRemoveActionResult = { state: 'available'; result: PhotoRemovalResult } | PhotoActionError;
