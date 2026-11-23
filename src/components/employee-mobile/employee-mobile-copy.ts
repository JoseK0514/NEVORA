/* Signed-in Spanish (Jose's gap closure, Nov 23, 2026): every word on the Employee phone screens, one {en, es} table
 * per component file under ./copy (the pattern of src/components/copy-receipt-copy.ts). Each table types its Spanish as
 * `typeof en`, and employee-mobile-copy.test.ts checks at run time that both languages have the same keys and that a
 * function takes the same arguments in both. Components read their own table with useMobileCopy (mobile-lang.tsx). */
import {availabilitySummaryCopy} from './copy/availability-summary';
import {availabilityCopy} from './copy/availability';
import {calendarCopy} from './copy/calendar';
import {creationViewCopy} from './copy/creation-view';
import {creationCopy} from './copy/creation';
import {deletionCopy} from './copy/deletion';
import {deviceAlertsCopy} from './copy/device-alerts';
import {exchangeViewCopy} from './copy/exchange-view';
import {exchangeCopy} from './copy/exchange';
import {hoursCardsCopy} from './copy/hours-cards';
import {hoursCorpCopy} from './copy/hours-corp';
import {hoursCorrectionsCopy} from './copy/hours-corrections';
import {hoursFrameCopy} from './copy/hours-frame';
import {hoursModelCopy} from './copy/hours-model';
import {hoursRecordsCopy} from './copy/hours-records';
import {hoursCopy} from './copy/hours';
import {messageSessionCopy} from './copy/message-session';
import {messagesComposeCopy} from './copy/messages-compose';
import {messagesViewCopy} from './copy/messages-view';
import {messagesCopy} from './copy/messages';
import {notificationsListCopy} from './copy/notifications-list';
import {passkeysCopy} from './copy/passkeys';
import {payCorpCopy} from './copy/pay-corp';
import {payCopy} from './copy/pay';
import {planningFeedbackCopy} from './copy/planning-feedback';
import {planningFrameCopy} from './copy/planning-frame';
import {planningCopy} from './copy/planning';
import {profileViewCopy} from './copy/profile-view';
import {profileCopy} from './copy/profile';
import {requestStatusCopy} from './copy/request-status';
import {requestsCopy} from './copy/requests';
import {timeoffPartsCopy} from './copy/timeoff-parts';
import {timeoffCopy} from './copy/timeoff';
import {weekPickerCopy} from './copy/week-picker';

export const employeeMobileCopy={
 'availability-summary':availabilitySummaryCopy,
 'availability':availabilityCopy,
 'calendar':calendarCopy,
 'creation-view':creationViewCopy,
 'creation':creationCopy,
 'deletion':deletionCopy,
 'device-alerts':deviceAlertsCopy,
 'exchange-view':exchangeViewCopy,
 'exchange':exchangeCopy,
 'hours-cards':hoursCardsCopy,
 'hours-corp':hoursCorpCopy,
 'hours-corrections':hoursCorrectionsCopy,
 'hours-frame':hoursFrameCopy,
 'hours-model':hoursModelCopy,
 'hours-records':hoursRecordsCopy,
 'hours':hoursCopy,
 'message-session':messageSessionCopy,
 'messages-compose':messagesComposeCopy,
 'messages-view':messagesViewCopy,
 'messages':messagesCopy,
 'notifications-list':notificationsListCopy,
 'passkeys':passkeysCopy,
 'pay-corp':payCorpCopy,
 'pay':payCopy,
 'planning-feedback':planningFeedbackCopy,
 'planning-frame':planningFrameCopy,
 'planning':planningCopy,
 'profile-view':profileViewCopy,
 'profile':profileCopy,
 'request-status':requestStatusCopy,
 'requests':requestsCopy,
 'timeoff-parts':timeoffPartsCopy,
 'timeoff':timeoffCopy,
 'week-picker':weekPickerCopy,
} as const;
