import {subscribe, unsubscribe} from 'node:diagnostics_channel';

const prefix = '[Owned calendar read] ';
const marker = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
/** Owned loopback request accounting only: no cookies, query values, bodies,
 * credentials or application rows enter the observer. */
export function installOwnedCalendarDiagnostics({origin, publish}) {
  const url = new URL(origin);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.origin !== origin) throw Error('Calendar diagnostics require an owned loopback origin');
  let sequence = 0;
  const observe = ({request, response}) => {
    const id = request.headers['x-nevora-qa-calendar-read'];
    if (typeof id !== 'string' || !marker.test(id) || request.method !== 'GET' || request.headers.host !== url.host ||
      !['127.0.0.1','::ffff:127.0.0.1'].includes(request.socket.localAddress) || sequence >= 1024) return;
    const route = new URL(request.url, origin);
    if (route.origin !== origin || route.pathname !== '/api/employee/calendar-subscriptions') return;
    const serial = ++sequence;
    const emit = event => publish({id, process:process.pid, request:serial, event, complete:response.writableFinished === true});
    emit('start');
    response.once('finish', () => emit('finish'));
    response.once('close', () => emit('close'));
  };
  subscribe('http.server.request.start', observe);
  return () => unsubscribe('http.server.request.start', observe);
}

if (process.env.NEVORA_OWNED_CALENDAR_ORIGIN) {
  if (process.env.NODE_ENV !== 'development' || !/^[a-f0-9]{32}$/.test(process.env.NEVORA_OWNED_PROCESS_OWNER ?? '') || !process.env.NEVORA_OWNED_APP_DATABASE) throw Error('Calendar diagnostics require a marked owned application');
  installOwnedCalendarDiagnostics({origin:process.env.NEVORA_OWNED_CALENDAR_ORIGIN, publish:entry => console.log(prefix + JSON.stringify(entry))});
}
