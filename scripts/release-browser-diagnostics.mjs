const names = new Set(['Error', 'AssertionError', 'TimeoutError', 'AbortError', 'TypeError', 'RangeError']);
const suites = new Set(['home', 'communications', 'calendar', 'navigation', 'attention']);
const widths = new Set([320, 375, 390, 430, 768, 1024, 1440]);
const operators = new Set(['strictEqual', 'deepStrictEqual', 'equal', 'deepEqual', 'notEqual', 'notStrictEqual', '==', '===', '!=', '!==']);
const sourceLocation = /phase-e-(?:home|communications|calendar|navigation|attention)-browser-scenarios\.mjs:\d+:\d+/;

function property(value, key) {
  try { return value?.[key]; } catch { return undefined; }
}

export function safeEvaluationFailure(error){
 const name=property(error,'name'),value=property(error,'message'),message=typeof value==='string'?value.slice(0,8000):'';
 const kind=/execution context.*destroyed|cannot find context/i.test(message)?'context-destroyed':/target.*closed|page.*closed|browser.*closed/i.test(message)?'target-closed':/protocol error/i.test(message)?'protocol':/timeout|timed out|recovery deadline/i.test(message)?'timeout':'other';
 return {name:names.has(name)?name:'Error',kind};
}

/** Extract only request metadata; never retain query strings or raw server text. */
export function safeLoginServerRequests(text) {
  const plain = text.replace(/\[[0-9;]*m/g, '').replaceAll(String.fromCharCode(27), '');
  return plain.split('\n').flatMap(line => {
    const match = line.match(/\b(GET|POST) (\/login|\/app)(?:\?[^ ]*)? (\d{3}) in (\d+(?:\.\d+)?)(ms|s)(?:\s|$)/);
    if (!match) return [];
    const status = Number(match[3]), elapsedMs = Number(match[4]) * (match[5] === 's' ? 1000 : 1);
    return status >= 100 && status <= 599 && Number.isFinite(elapsedMs)
      ? [{ method: match[1], route: match[2], status, elapsedMs }] : [];
  }).slice(-16);
}

/** Failure-only schedule metadata: never copy a query, capability or server text. */
export function safeScheduleServerRequests(text){
 const plain=text.slice(-65536).replace(/\[[0-9;]*m/g,'').replaceAll(String.fromCharCode(27),'');
 return plain.split('\n').flatMap(line=>{
  const match=line.match(/\b(GET|POST) \/app\/schedule(?:\?[^ ]*)? (\d{3}) in (\d+(?:\.\d+)?)(ms|s)(?:\s|$)/);
  if(!match)return [];const status=Number(match[2]),elapsedMs=Number(match[3])*(match[4]==='s'?1000:1);
  return status>=100&&status<=599&&Number.isFinite(elapsedMs)?[{method:match[1],route:'/app/schedule',status,elapsedMs}]:[];
 }).slice(-16);
}

export function safeDatabaseWaits(rows){
 const states=new Set([null,'active','idle','idle in transaction','idle in transaction (aborted)','fastpath function call','disabled']);
 const types=new Set([null,'Lock','Client','Activity','IO','LWLock','IPC','Timeout','BufferPin','Extension','InjectionPoint']);
 const events=new Set([null,'relation','transactionid','tuple','virtualxid','advisory','ClientRead','ClientWrite','DataFileRead','DataFileWrite','WALWrite','WALSync','WALInsert','BufferIO','BufferContent','ProcArray']);
 const count=value=>Number.isSafeInteger(value)&&value>=0&&value<=100000?value:null;
 return Array.isArray(rows)?rows.slice(0,16).map(row=>{const state=property(row,'state'),type=property(row,'wait_event_type'),event=property(row,'wait_event');return {state:states.has(state)?state:'other',waitType:types.has(type)?type:'other',waitEvent:events.has(event)?event:'other',connections:count(property(row,'connections')),blockers:count(property(row,'blockers'))};}):[];
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
