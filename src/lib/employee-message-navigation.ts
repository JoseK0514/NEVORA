import {safeReturnTo,withRequestFragment} from './notifications/destinations';
/** Canonical local navigation only. The destination still enforces its own access. */
export function safeMessageDestination(value:unknown):value is string{
 if(typeof value!=='string'||value.length>2048)return false;const path=value.split('#')[0];
 if(path.startsWith('/app/notifications/open'))return false;
 const allowed=safeReturnTo(path);return !!allowed&&(value===allowed||withRequestFragment(allowed)===value);
}
