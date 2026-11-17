import { readFile, writeFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { persistComparisonSnapshot } from './rondo-comparison-ledger.mjs';

const approvalReference = 'Jose-2026-11-15-USD5-credit-only-fictional-comparison';
const model = 'claude-sonnet-5-5', grantEnd = '2026-11-18T00:00:00Z', cap = 2500000n;
export const MANAGEMENT_LEDGER_PATH = '/Users/josek0514/.codex/worktrees/nevora-rondo-anthropic-20261115/NEVORA-UI-READINESS/.omo/evidence/rondo-anthropic-owner-20261115.json';
const originalDigest = '23a028e53faaac1763d41fb3fe5b551faacf3985710151b5ef74050d2b847043';
const selectedCases = new Set(['rondo-evidence-reversal-and-restoration', 'rondo-one-worker-two-sites', 'rondo-missing-policy-is-not-policy', 'rondo-identical-facts-new-preference']);
const repairDigest = '55172e2031d3752f9484a2283fed48c12b076a64c01b29a09a4ef378acced5b6';
const repairCases = new Set(['rondo-diagnostic-scope-en', 'rondo-diagnostic-scope-es']);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const amount = value => typeof value === 'string' && /^\d{1,16}$/.test(value);

/** One permanent continuation claim on the original Owner comparison. Never
 * creates/refills an allowance, retries an old case or refunds unknown attempts. */
export function openManagementContinuation(path, options = {}) { return openLedger(path, options, false); }
/** One explicitly enrolled regression pass after a reproduced source defect.
 * Bound to the completed first pass; shares every reservation and the same cap. */
export function openManagementRepair(path, options = {}) { return openLedger(path, options, true); }
async function openLedger(path, options, repair) {
  const namespace = repair ? 'managementRepair' : 'management';
  const fixture = options.fixtureOnly === true;
  if (fixture && (process.env.RONDO_MANAGEMENT_EVALUATION !== 'fictional-offline' || process.env.ANTHROPIC_API_KEY)) throw Error('Fixture injection is offline only');
  if (!fixture) {
    const canonical = await realpath(MANAGEMENT_LEDGER_PATH);
    if (await realpath(path) !== canonical) throw Error('Canonical ledger custody required');
    path = canonical;
  }
  const now = fixture ? options.now ?? Date.now : Date.now;
  const active = () => { if (now() >= Date.parse(grantEnd)) throw Error('Verified grant expired'); };
  active();
  const bytes = await readFile(path);
  if (digest(bytes) !== (fixture ? options.expectedOriginalDigest : repair ? repairDigest : originalDigest)) throw Error('Original ledger snapshot digest binding mismatch');
  let report;
  try { report = JSON.parse(bytes); } catch { throw Error('Invalid original ledger'); }
  if (report?.[namespace]) throw Error('Management continuation already claimed');
  if (repair && (report.management?.sourceHead !== 'b0a70cf364fd912a5c1d693a8ca93cb84adb245c' || report.management?.results?.length !== 4 ||
    report.management.results.some(row => !selectedCases.has(row.id) || row.state !== 'technical-path-completed') || new Set(report.management.results.map(row => row.id)).size !== 4)) throw Error('Original completed management pass required for repair');
  if (options.approval !== approvalReference || report.approval !== approvalReference ||
    report.mode !== 'live-fictional-data' || report.model !== model || report.budgetUsd !== 2.5 || report.cutoff !== grantEnd ||
    !amount(report.reservedMicrousd) || !Array.isArray(report.attempts) || !Array.isArray(report.results) ||
    report.attempts.length > 128 || report.attempts.some(row => !amount(row.reservationMicrousd)) ||
    report.attempts.reduce((sum, row) => sum + BigInt(row.reservationMicrousd), 0n) !== BigInt(report.reservedMicrousd) ||
    BigInt(report.reservedMicrousd) > cap) throw Error('Original ledger approval/model/budget/grant binding mismatch');
  await writeFile(path + (repair ? '.management-repair-claim' : '.management-claim'), JSON.stringify({ sourceHead: options.sourceHead ?? null, startedAt: new Date(now()).toISOString(), originalDigest: digest(bytes), purpose: 'Fictional management qualification under the original remaining Owner allowance' }) + '\n', { flag: 'wx', mode: 0o600 });
  let expectedDigest = digest(bytes);
  const firstNewAttempt = report.attempts.length;
  const terminalCases = new Set();
  report[namespace] = { startedAt: new Date(now()).toISOString(), sourceHead: options.sourceHead ?? null, results: [] };
  let tail = Promise.resolve();
  const serial = fn => {
    const pending = tail.then(fn);
    tail = pending.catch(() => {});
    return pending;
  };
  const persist = async () => {
    if (digest(await readFile(path)) !== expectedDigest) throw Error('Original ledger changed outside this continuation');
    await persistComparisonSnapshot(path, report);
    expectedDigest = digest(await readFile(path));
  };
  await persist();
  return {
    reserve: (caseId, body) => serial(async () => {
      active();
      let request;
      try { request = JSON.parse(body); } catch { throw Error('Invalid native request'); }
      if (!(repair ? repairCases : selectedCases).has(caseId)) throw Error('Case is outside the new management enrollment');
      if (terminalCases.has(caseId)) throw Error('Case already has a terminal result');
      if (typeof body !== 'string' ||
        Buffer.byteLength(body, 'utf8') > 262144 || !request || typeof request !== 'object' || request.model !== model || request.max_tokens !== 4096 || !Array.isArray(request.messages)) throw Error('Unreviewed native request');
      const reservation = BigInt(Buffer.byteLength(body, 'utf8') + 16384) * 2n + 4096n * 10n;
      const next = BigInt(report.reservedMicrousd) + reservation;
      if (next > cap) throw Error('Original Owner comparison allowance exhausted');
      const id = report.attempts.length;
      report.attempts.push({ caseId, phase: repair ? 'management-diagnostic-regression' : 'management-qualification', reservationMicrousd: reservation.toString(), outcome: 'reserved', providerUsage: null });
      report.reservedMicrousd = next.toString();
      await persist();
      return id;
    }),
    settle: (id, metadata) => serial(async () => {
      if (!Number.isInteger(id) || id < firstNewAttempt || report.attempts[id]?.outcome !== 'reserved' ||
        !['http_success', 'http_failure', 'uncertain_failure', 'dispatch_withheld'].includes(metadata?.outcome)) throw Error('Invalid new attempt settlement');
      const safe = Object.fromEntries(['outcome', 'httpStatus', 'stopReason', 'blockTypes', 'providerUsage', 'nativeTools', 'text', 'requestDigest', 'requestEvidence', 'requestToolNames'].filter(key => Object.hasOwn(metadata, key)).map(key => [key, metadata[key]]));
      if (JSON.stringify(safe).length > 131072) throw Error('Oversized fictional attempt evidence');
      Object.assign(report.attempts[id], structuredClone(safe));
      await persist();
    }),
    result: value => serial(async () => {
      if (!value || !(repair ? repairCases : selectedCases).has(value.id) || terminalCases.has(value.id) || JSON.stringify(value).length > 524288) throw Error('Invalid or duplicate terminal case evidence');
      report[namespace].results.push(structuredClone(value));
      terminalCases.add(value.id);
      await persist();
    }),
    assertDispatch(id) {
      active();
      if (!Number.isInteger(id) || id < firstNewAttempt || report.attempts[id]?.outcome !== 'reserved') throw Error('Dispatch requires a fresh reserved attempt');
    },
  };
}
