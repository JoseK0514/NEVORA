export const CALENDAR_READ_PATH = '/api/employee/calendar-subscriptions';
export const CALENDAR_TRACE_PREFIX = '[Owned calendar read] ';
export type CalendarTrace = { id: string; request: number; process: number; event: 'start' | 'finish' | 'close'; complete: boolean }
  | { event: 'unavailable'; process?: number; reason: 'capacity' | 'invalid-trace' };
export type PendingRead = { path: string; method?: string; id?: string; response?: boolean };

const marker = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function pendingReads(reads: PendingRead[], aborted: string[], trace: CalendarTrace[], finished: Set<string>): PendingRead[] {
  if (trace.some(event => event.event === 'unavailable')) return reads;
  // Prove the server observer on this same route using a real browser-finished
  // request. No ready log, elapsed timeout or rendered page alone is evidence.
  const observed = trace.some(event => event.event === 'finish' && event.complete && finished.has(event.id) &&
    trace.some(start => start.event === 'start' && start.id === event.id && start.process === event.process && start.request === event.request));
  return reads.filter(read => !(
    observed && read.method === 'GET' && read.path === CALENDAR_READ_PATH && read.id && marker.test(read.id) && !read.response &&
    aborted.includes(read.id) && !trace.some(event => 'id' in event && event.id === read.id)
  ));
}

export function calendarTrace(text: string): CalendarTrace[] {
  return text.split('\n').flatMap((line): CalendarTrace[] => {
    const offset = line.indexOf(CALENDAR_TRACE_PREFIX);
    if (offset < 0) return [];
    try {
      const event = JSON.parse(line.slice(offset + CALENDAR_TRACE_PREFIX.length));
      if (event.event === 'unavailable' && event.reason === 'capacity' && Number.isSafeInteger(event.process)) return [event];
      if (marker.test(event.id) && ['start','finish','close'].includes(event.event) &&
        typeof event.complete === 'boolean' && Number.isSafeInteger(event.process) && Number.isSafeInteger(event.request)) return [event];
    } catch { /* A damaged observation cannot prove absence. */ }
    return [{event:'unavailable', reason:'invalid-trace'}];
  });
}

/** Diagnostic instrumentation in the owned browser only. The application fetch,
 * abort and authority behavior run unchanged; the opaque header is test evidence. */
export async function installCalendarFetchObservation(page: {addInitScript(script: () => void): Promise<void>}) {
  await page.addInitScript(() => {
    const browser = window as Window & {__nevoraAbortedCalendarReads?: string[]};
    browser.__nevoraAbortedCalendarReads = [];
    const fetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      if (method.toUpperCase() !== 'GET' || url.origin !== location.origin || url.pathname !== '/api/employee/calendar-subscriptions') return fetch(input, init);
      const id = crypto.randomUUID(), headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      headers.set('x-nevora-qa-calendar-read', id);
      const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
      return fetch(input, {...init, headers}).catch(error => {
        if (signal?.aborted && error?.name === 'AbortError') {
          const records = browser.__nevoraAbortedCalendarReads!;
          if (records.length < 1024) records.push(id);
        }
        throw error;
      });
    };
  });
}
