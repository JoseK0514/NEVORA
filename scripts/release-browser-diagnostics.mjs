const names = new Set(['Error', 'AssertionError', 'TimeoutError', 'AbortError', 'TypeError', 'RangeError']);
const suites = new Set(['home', 'communications', 'calendar', 'navigation', 'attention']);
const widths = new Set([320, 375, 390, 430, 768, 1024, 1440]);
const operators = new Set(['strictEqual', 'deepStrictEqual', 'equal', 'deepEqual', 'notEqual', 'notStrictEqual', '==', '===', '!=', '!==']);
const sourceLocation = /phase-e-(?:home|communications|calendar|navigation|attention)-browser-scenarios\.mjs:\d+:\d+/;

function property(value, key) {
  try { return value?.[key]; } catch { return undefined; }
}

/** Keep bounded failure detail without copying URLs, capabilities or credentials. */
export function safeBrowserFailure(error, execution, scenario) {
  const name = property(error, 'name');
  const assertion = name === 'AssertionError' || property(error, 'code') === 'ERR_ASSERTION';
  const message = assertion ? undefined : property(error, 'message');
  const summary = assertion ? 'Browser assertion failed' : typeof message === 'string'
    ? message.slice(0, 8000).split(/\r?\n/).slice(0, 8).map(line => {
      if (/authorization|cookie|password|secret|session|token|digest|database_url/i.test(line)) return '[sensitive diagnostic omitted]';
      return line.replace(/https?:[^\s"'<>]+/gi, '[URL]')
        .replace(/\/api\/calendar\/[^\s"'<>]+/gi, '[CAPABILITY PATH]')
        .replace(/\\u[0-9a-f]{4}/gi, '[ENCODED]')
        .replace(/[A-Za-z0-9_-]{32,}/g, '[OPAQUE]');
    }).join('\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, 1000)
    : 'Browser execution failed without a readable error message';
  const stack = property(error, 'stack'), location = property(scenario, 'location');
  const match = (typeof location === 'string' ? location : typeof stack === 'string' ? stack : '').slice(0, 8000).match(sourceLocation);
  const stage = property(scenario, 'stage');
  const suite = property(execution, 'suite'), engine = property(execution, 'engine'), width = property(execution, 'width');
  const result = {
    name: names.has(name) ? name : 'Error',
    summary,
    sourceLocation: match?.[0] ?? null,
    stage: typeof stage === 'string' && /^[a-z][a-z0-9-]{0,30}$/.test(stage) ? stage : null,
    cell: suites.has(suite) && ['chromium', 'webkit'].includes(engine) && widths.has(width)
      ? { suite, engine, width, status: property(execution, 'status') === 'passed' ? 'passed' : 'failed' }
      : null,
  };
  const operator = property(error, 'operator');
  if (operators.has(operator)) result.operator = operator;
  for (const key of ['actual', 'expected']) {
    const value = property(error, key);
    if (typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) || value === null) result[key] = value;
  }
  return result;
}
