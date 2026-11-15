import 'server-only';

/** Read data properties only: thrown objects may have getters or hostile proxies. */
function field(value: unknown, name: string): unknown {
  if (!value || typeof value !== 'object') return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    return descriptor && 'value' in descriptor ? descriptor.value : undefined;
  } catch {return undefined;}
}

function errorClass(error: unknown): string {
  try {
    for (const kind of [TypeError, RangeError, SyntaxError, ReferenceError, URIError, EvalError, AggregateError]) {
      if (error instanceof kind) return kind.name;
    }
    return error instanceof Error ? 'Error' : 'UnknownError';
  } catch {return 'UnknownError';}
}

function sqlState(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  for (let depth = 0; error && depth < 5 && !seen.has(error); depth++) {
    seen.add(error);
    const code = field(error, 'code');
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
    error = field(error, 'cause');
  }
}

/** Route MUST be a source-code route template, never a concrete request URL.
 * The hosting stderr stream is the destination. Never serialize errors, messages,
 * stacks, headers, identities, SQL, bodies or provider response details. */
export function reportServerError(error: unknown, context: {route: string; requestId?: string}): void {
  try {
    const digest = field(error, 'digest');
    const code = sqlState(error);
    console.error(JSON.stringify({
      event: 'server_request_error',
      route: /^\/[A-Za-z0-9_./()[\]@-]{0,255}$/.test(context.route) ? context.route : '/unknown',
      requestId: typeof context.requestId === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(context.requestId)
        ? context.requestId : crypto.randomUUID(),
      errorClass: errorClass(error),
      ...(typeof digest === 'string' && /^\d{1,20}$/.test(digest) ? {digest} : {}),
      ...(code ? {sqlState: code} : {}),
    }));
  } catch { /* Diagnostics cannot turn the original failure into another one. */ }
}
