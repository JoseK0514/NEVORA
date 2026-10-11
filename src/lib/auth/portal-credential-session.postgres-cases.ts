// SOURCE-ONLY native CASE BLOCK. Every callback is UNEXECUTED.
// Root supplies its existing exact leased PG18.4 controller. No env/URL discovery,
// connection, setup, role, SQL or cleanup runs on import. No new controller.
// Fresh sparse A/B scenario DB: MECHANICAL_LOCAL_AUTH_NOT_ORIGINAL_SINGLETON_CUTOVER.
// Real Node scrypt and genuine admitted original verifier are mandatory. Fixture
// transport barriers may pause/drop ACKs AFTER real native execution; they may
// never substitute SQL rows, password outcomes, an authority flag or a witness.
import { describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { createHash } from 'node:crypto';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { normalizeEmployeeNumber } from '@/lib/tenancy/identity';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from '@/lib/tenancy/runtime/catalog-fence.server';
import { verifyAndCreatePortalSessionOnOwnedVerifier } from '@/lib/auth/portal-credential-session.server';

type Outcome = Awaited<ReturnType<typeof verifyAndCreatePortalSessionOnOwnedVerifier>>;
type Witness = Parameters<typeof verifyAndCreatePortalSessionOnOwnedVerifier>[0];
type Input = Readonly<{ workspaceLocator: string; employeeNumber: string; password: string }>;
export type PortalCredentialScenario =
  | 'PC01' | 'PC02' | 'PC03'
  | 'PC04_DISABLED' | 'PC04_PROOF_PENDING' | 'PC04_SUSPENDED'
  | 'PC04_INACTIVE_EMPLOYEE' | 'PC04_INACTIVE_WORKSPACE'
  | 'PC05' | 'PC06' | 'PC07' | 'PC08' | 'PC09' | 'PC10' | 'PC11'
  | 'PC12' | 'PC13' | 'PC14_RESET' | 'PC14_DEACTIVATE';
export type PortalCredentialNativeSubject = Readonly<{
  workspaceId: string; employeeId: string; workspaceLocator: string;
  employeeNumber: string; normalizedNumber: string; password: string;
}>;
export type PortalCredentialNativeCommand = Readonly<{
  text: string; backendPid: number; sqlstate: string | null;
  statusBefore: string | null; statusAfter: string | null;
}>;
export type PortalCredentialNativeFault =
  | 'AFTER_REAL_INSERT_NATIVE_ERROR'
  | 'AFTER_REAL_COMMIT_ACK_LOST'
  | 'AFTER_REAL_INSERT_ERROR_AND_REAL_ROLLBACK_ACK_LOST'
  | 'AFTER_REAL_BEGIN_ACK_LOST';
type NativeRun<T> = Readonly<{ result: T; commands: readonly PortalCredentialNativeCommand[] }>;
type NativePause = Readonly<{
  pending: Promise<Outcome>;
  // Resolves only after real acquire_portal_login_source returned while its
  // native source locks remain held; returned rows remain unchanged.
  acquired: Promise<void>; release: () => void;
  commands: readonly PortalCredentialNativeCommand[];
}>;
export type PortalCredentialSessionNativeFixture = Readonly<{
  // All three are real independently authenticated original LOGIN connections;
  // admin/writer are the exact fixture installer lane, verifier is its distinct
  // admitted no-membership/nonowner/nonbypass service. No SET ROLE substitute.
  admin: Client; writer: Client; verifier: Client; witness: Witness;
  verifierIdentity: Readonly<{ name: string; oid: string; backendPid: number }>;
  subjects: Readonly<{ A: PortalCredentialNativeSubject; B: PortalCredentialNativeSubject }>;
  // Complete native canonical UTF8 text: all original source rows/history and
  // private control/catalog/ACL rows, excluding only original session+LIVE
  // targets, which captureTargets covers in full. Native int8 stays text.
  // May run on writer inside its own test mutation TX to seal expected source
  // before releasing a blocked verifier. No broad ignored-field allowlist.
  captureSources: (client?: Client) => Promise<string>;
  captureTargets: () => Promise<string>;
  // Observes actual same Client queries. Action invokes the imported real
  // kernel. Faults execute the original native command before dropping ACK;
  // AFTER_REAL_INSERT_NATIVE_ERROR sends real SELECT 1/0 before COMMIT.
  // Trace must not retain password/bearer/query values or raw exception text.
  observe: <T>(action: () => Promise<T>, fault?: PortalCredentialNativeFault) => Promise<NativeRun<T>>;
  pauseAfterAcquire: (action: () => Promise<Outcome>) => Promise<NativePause>;
  // Independent admin pg_locks + pg_stat_activity + pg_blocking_pids; no timer
  // alone. Returns exact native evidence, including original backend identities.
  waitForBlocked: (waiting: Client, holder: Client) => Promise<unknown>;
  // Used only after a real native error: require same-PID aborted state and
  // synchronized Client E (ErrorResponse can precede ReadyForQuery).
  waitForAborted: (client: Client) => Promise<unknown>;
  record: (value: unknown) => void;
  // Existing root controller owns all exact source/object/role/client cleanup,
  // including failed assertions/pending queries; never rewind guarded versions.
  finishScenario: () => Promise<void>;
}>;
export type GetPortalCredentialSessionNativeFixture =
  (scenario: PortalCredentialScenario) => Promise<PortalCredentialSessionNativeFixture>;

type Identity = Readonly<{ name: string; current: string; oid: string; pid: number; role: string }>;
type Baseline = Readonly<{
  source: string; targets: string;
  identities: Readonly<{ admin: Identity; writer: Identity; verifier: Identity }>;
}>;
type Committed = Extract<Outcome, { status: 'COMMITTED_LOCAL_SESSION_NOT_PORTAL_PROOF' }>;
type Source = Readonly<{
  workspaceId: string; employeeId: string; normalizedNumber: string;
  workspaceActive: boolean; employeeActive: boolean;
  passwordHash: string | null; mustChangePassword: boolean | null;
  workspaceIncarnation: string; portalAccessVersion: string;
  authorizationVersion: string; capabilityPolicyRevision: string;
  portalState: string; proofProvenance: string;
}>;
const digest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const input = (subject: PortalCredentialNativeSubject): Input => ({
  workspaceLocator: subject.workspaceLocator,
  employeeNumber: subject.employeeNumber,
  password: subject.password,
});
const sqlstate = (error: unknown) => typeof error === 'object' && error !== null &&
  'code' in error && typeof error.code === 'string' ? error.code : null;

async function identity(client: Client): Promise<Identity> {
  const result = await client.query<Identity>(`SELECT session_user::text AS name,
    current_user::text AS current, r.oid::text AS oid, pg_catalog.pg_backend_pid() AS pid,
    pg_catalog.current_setting('role') AS role
    FROM pg_catalog.pg_roles r WHERE r.rolname=session_user`);
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].current).toBe(result.rows[0].name);
  expect(result.rows[0].role).toBe('none');
  return result.rows[0];
}

async function source(f: PortalCredentialSessionNativeFixture, subject: PortalCredentialNativeSubject): Promise<Source> {
  const result = await f.admin.query<Source>(`SELECT w.id AS "workspaceId", e.id AS "employeeId",
    m.normalized_number AS "normalizedNumber", w.active AS "workspaceActive", e.active AS "employeeActive",
    c.password_hash AS "passwordHash", c.must_change_password AS "mustChangePassword",
    counter.incarnation::text AS "workspaceIncarnation", a.portal_access_version::text AS "portalAccessVersion",
    a.authorization_version::text AS "authorizationVersion", a.capability_policy_revision::text AS "capabilityPolicyRevision",
    a.portal_state AS "portalState", a.proof_provenance AS "proofProvenance"
    FROM public.workspaces w JOIN public.employees e ON e.workspace_id=w.id
    JOIN nevora_tenancy.employee_login_identity m ON m.workspace_id=w.id AND m.employee_id=e.id
    LEFT JOIN public.employee_credentials c ON c.employee_id=e.id
    JOIN nevora_tenancy.workspace_incarnation_counter counter ON counter.workspace_id=w.id
    JOIN nevora_tenancy.portal_authority a ON a.workspace_id=w.id AND a.employee_id=e.id
    WHERE w.id=$1 AND e.id=$2 AND pg_catalog.convert_to(w.id,'UTF8')=pg_catalog.convert_to($1::text,'UTF8')
      AND pg_catalog.convert_to(e.id,'UTF8')=pg_catalog.convert_to($2::text,'UTF8')`, [subject.workspaceId, subject.employeeId]);
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].normalizedNumber).toBe(subject.normalizedNumber);
  expect(subject.normalizedNumber).toBe(normalizeEmployeeNumber(subject.employeeNumber));
  return result.rows[0];
}

async function counts(f: PortalCredentialSessionNativeFixture) {
  const result = await f.admin.query<{ sessions: string; live: string; orphan: string }>(`SELECT
    (SELECT count(*)::text FROM public.employee_sessions) AS sessions,
    (SELECT count(*)::text FROM nevora_tenancy.portal_session_issuance) AS live,
    (SELECT count(*)::text FROM nevora_tenancy.portal_session_issuance i LEFT JOIN public.employee_sessions s
      ON s.token_hash=i.token_hash WHERE s.token_hash IS NULL) AS orphan`);
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].orphan).toBe('0');
  return result.rows[0];
}

function noBearer(result: Outcome, status: 'DENY' | 'UNAVAILABLE' | 'OUTCOME_UNKNOWN') {
  expect(result.status).toBe(status);
  expect(Object.prototype.hasOwnProperty.call(result, 'bearer')).toBe(false);
}

function committed(result: Outcome): Committed {
  expect(result.status).toBe('COMMITTED_LOCAL_SESSION_NOT_PORTAL_PROOF');
  if (result.status !== 'COMMITTED_LOCAL_SESSION_NOT_PORTAL_PROOF') throw new Error('native_session_not_committed');
  expect(typeof result.bearer).toBe('string');
  expect(result.bearer.length).toBeGreaterThan(0);
  expect(Object.prototype.hasOwnProperty.call(result, 'proof')).toBe(false);
  return result;
}

function dispatch(commands: readonly PortalCredentialNativeCommand[], baseline: Baseline, insertCount: number,
  ending: 'COMMIT' | 'ROLLBACK') {
  expect(commands.length).toBeGreaterThan(0);
  expect(commands.every(command => command.backendPid === baseline.identities.verifier.pid)).toBe(true);
  const begin = commands.findIndex(command => /^BEGIN\b/i.test(command.text));
  expect(begin).toBeGreaterThanOrEqual(0);
  expect(commands[begin].text.trim().replace(/;$/, '')).toBe('BEGIN ISOLATION LEVEL READ COMMITTED');
  expect(commands[begin + 1].text).toBe(RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
  expect(commands.filter(command => /\bnevora_tenancy\.insert_portal_reviewed_session\s*\(/i.test(command.text))).toHaveLength(insertCount);
  const end = commands.findIndex(command => new RegExp(`^${ending}\\b`, 'i').test(command.text));
  expect(end).toBe(commands.length - 1);
  expect(commands.filter(command => /^(?:COMMIT|ROLLBACK)\b/i.test(command.text))).toHaveLength(1);
}

async function target(f: PortalCredentialSessionNativeFixture, subject: PortalCredentialNativeSubject, outcome: Committed) {
  const tokenHash = createHash('sha256').update(outcome.bearer, 'utf8').digest('hex');
  const result = await f.admin.query<{
    workspaceId: string; employeeId: string; incarnation: string; access: string;
    sourceCreatedAt: string; liveCreatedAt: string; receiptCreatedEqual: boolean; receiptExpiryEqual: boolean;
  }>(`SELECT i.workspace_id AS "workspaceId", s.employee_id AS "employeeId",
    i.workspace_incarnation::text AS incarnation, i.portal_access_version::text AS access,
    s.created_at::text AS "sourceCreatedAt", i.session_created_at::text AS "liveCreatedAt",
    s.created_at=$2::timestamptz AS "receiptCreatedEqual", s.expires_at=$3::timestamptz AS "receiptExpiryEqual"
    FROM public.employee_sessions s JOIN nevora_tenancy.portal_session_issuance i ON i.token_hash=s.token_hash
    WHERE s.token_hash=$1::bpchar(64)`, [tokenHash, outcome.receipt.createdAt, outcome.receipt.expiresAt]);
  expect(result.rows).toHaveLength(1);
  const row = result.rows[0];
  const current = await source(f, subject);
  expect(row.workspaceId).toBe(subject.workspaceId);
  expect(row.employeeId).toBe(subject.employeeId);
  expect(row.incarnation).toBe(current.workspaceIncarnation);
  expect(row.access).toBe(current.portalAccessVersion);
  expect(row.liveCreatedAt).toBe(row.sourceCreatedAt);
  expect(row.receiptCreatedEqual).toBe(true);
  expect(row.receiptExpiryEqual).toBe(true);
  expect(outcome.receipt).toEqual({ workspaceId: subject.workspaceId, employeeId: subject.employeeId,
    createdAt: outcome.receipt.createdAt, expiresAt: outcome.receipt.expiresAt,
    workspaceIncarnation: current.workspaceIncarnation, portalAccessVersion: current.portalAccessVersion,
    mustChangePassword: current.mustChangePassword });
  expect(typeof outcome.receipt.createdAt).toBe('string');
  expect(typeof outcome.receipt.expiresAt).toBe('string');
  // Record only native dates/versions/scoped identities, never bearer, digest,
  // hash, password, packet/query values or raw acquired credential rows.
  f.record({ operation: 'EXACT_NATIVE_SESSION_LIVE_RECEIPT', subject: subject.employeeId, row, receipt: outcome.receipt });
  return tokenHash;
}

async function blocked(f: PortalCredentialSessionNativeFixture, baseline: Baseline, waiting: 'verifier' | 'writer', holder: 'verifier' | 'writer') {
  const raw = await f.waitForBlocked(f[waiting], f[holder]);
  const observed = await f.admin.query<{ pid: number; loginOid: string; state: string; waitEventType: string;
    blockingPids: number[]; locks: { granted: boolean; mode: string; locktype: string }[] }>(`SELECT a.pid,
    a.usesysid::text AS "loginOid", a.state, a.wait_event_type AS "waitEventType",
    pg_catalog.pg_blocking_pids(a.pid) AS "blockingPids",
    (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('granted',l.granted,'mode',l.mode,'locktype',l.locktype)
      ORDER BY l.locktype,l.mode,l.granted),'[]'::jsonb) FROM pg_catalog.pg_locks l WHERE l.pid=a.pid) AS locks
    FROM pg_catalog.pg_stat_activity a WHERE a.pid=$1`, [baseline.identities[waiting].pid]);
  expect(observed.rows).toHaveLength(1);
  expect(observed.rows[0].loginOid).toBe(baseline.identities[waiting].oid);
  expect(observed.rows[0].waitEventType).toBe('Lock');
  expect(observed.rows[0].blockingPids).toContain(baseline.identities[holder].pid);
  expect(observed.rows[0].locks.some(lock => !lock.granted)).toBe(true);
  f.record({ operation: 'NATIVE_SOURCE_WAIT', waiting, holder, raw, observed: observed.rows[0] });
}

async function aborted(f: PortalCredentialSessionNativeFixture, client: Client, pid: number) {
  const raw = await f.waitForAborted(client);
  const observed = await f.admin.query<{ state: string }>('SELECT state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [pid]);
  expect(observed.rows[0]?.state).toBe('idle in transaction (aborted)');
  expect(client.getTransactionStatus()).toBe('E');
  let next: string | null = null;
  try { await client.query('SELECT 1'); } catch (error) { next = sqlstate(error); }
  expect(next).toBe('25P02');
  expect(client.getTransactionStatus()).toBe('E');
  f.record({ operation: 'NATIVE_ABORTED_AND_25P02', pid, raw, state: observed.rows[0].state, status: 'E', next });
}

async function unchanged(f: PortalCredentialSessionNativeFixture, baseline: Baseline) {
  expect(await f.captureSources()).toBe(baseline.source);
  expect(await f.captureTargets()).toBe(baseline.targets);
  expect(await counts(f)).toEqual({ sessions: '0', live: '0', orphan: '0' });
}

// No fixture connects during definition. Root's existing native controller calls
// this once from its opt-in suite. Each getFixture creates a new own scenario;
// finishScenario is mandatory even when an assertion/fault/pending call fails.
export function definePortalCredentialSessionNativeCases(getFixture: GetPortalCredentialSessionNativeFixture) {
  async function scenario(id: PortalCredentialScenario,
    action: (f: PortalCredentialSessionNativeFixture, baseline: Baseline) => Promise<void>) {
    const f = await getFixture(id);
    try {
      const identities = { admin: await identity(f.admin), writer: await identity(f.writer), verifier: await identity(f.verifier) };
      expect(new Set(Object.values(identities).map(value => value.pid)).size).toBe(3);
      expect(identities.verifier).toMatchObject({ name: f.verifierIdentity.name, oid: f.verifierIdentity.oid, pid: f.verifierIdentity.backendPid });
      expect(identities.verifier.name).not.toBe(identities.admin.name);
      expect(identities.verifier.name).not.toBe(identities.writer.name);
      expect(f.verifier.getTransactionStatus()).toBe('I');
      expect(f.admin.getTransactionStatus()).toBe('I');
      expect(f.writer.getTransactionStatus()).toBe('I');
      expect(f.subjects.A.workspaceId).not.toBe(f.subjects.B.workspaceId);
      expect(f.subjects.A.employeeId).not.toBe(f.subjects.B.employeeId);
      expect(f.subjects.A.normalizedNumber).toBe(f.subjects.B.normalizedNumber);
      expect(await counts(f)).toEqual({ sessions: '0', live: '0', orphan: '0' });
      const baseline: Baseline = { source: await f.captureSources(), targets: await f.captureTargets(), identities };
      f.record({ caseId: id, phase: 'BEFORE', sourceSHA256: digest(baseline.source), targetsSHA256: digest(baseline.targets), identities,
        claim: 'MECHANICAL_LOCAL_AUTH_NOT_ORIGINAL_SINGLETON_CUTOVER' });
      await action(f, baseline);
      expect(await identity(f.verifier)).toEqual(identities.verifier);
      expect(await identity(f.admin)).toEqual(identities.admin);
      expect(await identity(f.writer)).toEqual(identities.writer);
      expect(f.verifier.getTransactionStatus()).toBe('I');
      expect(f.writer.getTransactionStatus()).toBe('I');
      f.record({ caseId: id, phase: 'AFTER', sourceSHA256: digest(await f.captureSources()), targetsSHA256: digest(await f.captureTargets()),
        claim: 'LOCAL_SESSION_NOT_PORTAL_PROOF_OR_HOSTED_AUTH' });
    } finally { await f.finishScenario(); }
  }

  describe('original owned verifier credential/session native mechanics', () => {
    it('PC01 selected A/B same number uses real distinct passwords, IDs and explicit LEGACY_UNVERIFIED; must-change is retained', async () => {
      await scenario('PC01', async (f, baseline) => {
        const a = await source(f, f.subjects.A), b = await source(f, f.subjects.B);
        expect(a.proofProvenance).toBe('LEGACY_UNVERIFIED'); expect(b.proofProvenance).toBe('LEGACY_UNVERIFIED');
        expect(a.portalState).toBe('ENABLED'); expect(b.portalState).toBe('ENABLED');
        expect(a.mustChangePassword).toBe(true); expect(b.mustChangePassword).toBe(false);
        expect(await verifyPassword(f.subjects.A.password, a.passwordHash!)).toBe(true);
        expect(await verifyPassword(f.subjects.B.password, b.passwordHash!)).toBe(true);
        expect(await verifyPassword(f.subjects.B.password, a.passwordHash!)).toBe(false);
        const wrong = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness,
          { ...input(f.subjects.A), password: f.subjects.B.password }));
        noBearer(wrong.result, 'DENY'); await unchanged(f, baseline);
        for (const subject of [f.subjects.A, f.subjects.B]) {
          const selected = subject === f.subjects.A ? { ...input(subject),
            workspaceLocator: ` ${subject.workspaceLocator.toUpperCase()} `,
            employeeNumber: ` ${subject.employeeNumber} ` } : input(subject);
          const run = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, selected));
          await target(f, subject, committed(run.result)); dispatch(run.commands, baseline, 1, 'COMMIT');
        }
        expect(await counts(f)).toEqual({ sessions: '2', live: '2', orphan: '0' });
        expect(await f.captureSources()).toBe(baseline.source);
      });
    }, 45_000);

    it('PC02 explicit VERIFIED also preserves both must-change values and never rewrites provenance', async () => {
      await scenario('PC02', async (f, baseline) => {
        for (const [subject, mustChange] of [[f.subjects.A, true], [f.subjects.B, false]] as const) {
          const row = await source(f, subject);
          expect(row.proofProvenance).toBe('VERIFIED'); expect(row.portalState).toBe('ENABLED');
          expect(row.mustChangePassword).toBe(mustChange);
          expect(await verifyPassword(subject.password, row.passwordHash!)).toBe(true);
          const run = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, input(subject)));
          await target(f, subject, committed(run.result)); dispatch(run.commands, baseline, 1, 'COMMIT');
        }
        expect(await f.captureSources()).toBe(baseline.source);
        expect(await counts(f)).toEqual({ sessions: '2', live: '2', orphan: '0' });
      });
    }, 45_000);

    it('PC03 malformed scrypt, absent credentials and closed malformed/unknown input issue no session or bearer', async () => {
      await scenario('PC03', async (f, baseline) => {
        const a = await source(f, f.subjects.A), b = await source(f, f.subjects.B);
        expect(a.passwordHash).not.toBeNull(); expect(b.passwordHash).toBeNull();
        expect(await verifyPassword(f.subjects.A.password, a.passwordHash!)).toBe(false);
        const forms: unknown[] = [input(f.subjects.A), input(f.subjects.B),
          { ...input(f.subjects.A), password: '' }, { ...input(f.subjects.A), password: 7 },
          { ...input(f.subjects.A), employeeNumber: '' }, { ...input(f.subjects.A), employeeNumber: 'unknown-employee' },
          { ...input(f.subjects.A), workspaceLocator: 'unknown-tenant' }, { ...input(f.subjects.A), workspaceLocator: 'x' },
          { ...input(f.subjects.A), workspaceId: f.subjects.B.workspaceId }, null, undefined];
        for (const form of forms) {
          const run = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, form as Input));
          noBearer(run.result, 'DENY');
          expect(run.commands.some(command => /\bnevora_tenancy\.insert_portal_reviewed_session\s*\(/i.test(command.text))).toBe(false);
          await unchanged(f, baseline);
        }
      });
    }, 45_000);

    const deniedProfiles = [
      ['PC04_DISABLED', 'DISABLED', 'portal'], ['PC04_PROOF_PENDING', 'PROOF_PENDING', 'portal'],
      ['PC04_SUSPENDED', 'SUSPENDED', 'portal'], ['PC04_INACTIVE_EMPLOYEE', 'ENABLED', 'employee'],
      ['PC04_INACTIVE_WORKSPACE', 'ENABLED', 'workspace'],
    ] as const;
    for (const [id, portalState, inactive] of deniedProfiles) {
      it(`${id} correct real scrypt cannot substitute for active employment/workspace and ENABLED Portal`, async () => {
        await scenario(id, async (f, baseline) => {
          const row = await source(f, f.subjects.A);
          expect(row.portalState).toBe(portalState);
          expect(row.employeeActive).toBe(inactive !== 'employee');
          expect(row.workspaceActive).toBe(inactive !== 'workspace');
          expect(await verifyPassword(f.subjects.A.password, row.passwordHash!)).toBe(true);
          const run = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, input(f.subjects.A)));
          noBearer(run.result, 'DENY');
          expect(run.commands.some(command => /\bnevora_tenancy\.insert_portal_reviewed_session\s*\(/i.test(command.text))).toBe(false);
          await unchanged(f, baseline);
        });
      }, 45_000);
    }

    it('PC05 native high/max int8 and timestamps survive; elapsed336h has an independent DST arithmetic control', async () => {
      await scenario('PC05', async (f, baseline) => {
        const zone = await f.verifier.query<{ zone: string }>(`SELECT current_setting('TimeZone') AS zone`);
        expect(zone.rows[0].zone).toBe('America/New_York');
        // The real clock need not fall near DST on the test day. This actual
        // native control demonstrates the difference without replacing the
        // production clock. The installed body pin and real expiry bounds below
        // bind the reviewed elapsed duration to the actual session writer.
        const dst = await f.verifier.query<{ hours: string; calendar: string }>(`SELECT
          EXTRACT(EPOCH FROM ((TIMESTAMPTZ '2026-10-25 12:00:00 America/New_York'+INTERVAL '336 hours')
            -TIMESTAMPTZ '2026-10-25 12:00:00 America/New_York'))::text AS hours,
          EXTRACT(EPOCH FROM ((TIMESTAMPTZ '2026-10-25 12:00:00 America/New_York'+INTERVAL '14 days')
            -TIMESTAMPTZ '2026-10-25 12:00:00 America/New_York'))::text AS calendar`);
        expect(dst.rows).toEqual([{ hours: '1209600.000000', calendar: '1213200.000000' }]);
        const body = await f.admin.query<{ body: string }>(`SELECT prosrc AS body FROM pg_catalog.pg_proc
          WHERE oid='nevora_tenancy.insert_portal_reviewed_session(text,text,text,jsonb)'::regprocedure`);
        expect(body.rows).toHaveLength(1); expect(body.rows[0].body).toContain("INTERVAL '336 hours'");
        expect(body.rows[0].body).not.toContain("INTERVAL '14 days'");
        f.record({ operation: 'NATIVE_DST_DURATION_CONTROL', zone: zone.rows[0].zone, actual: dst.rows,
          installedBodySHA256: digest(body.rows[0].body), claim: 'FIXED_NATIVE_ARITHMETIC_NOT_REPLACED_PRODUCTION_CLOCK' });
        for (const [subject, expected] of [[f.subjects.A, '9223372036854775807'], [f.subjects.B, '9007199254740993']] as const) {
          const row = await source(f, subject);
          expect(row.workspaceIncarnation).toBe(expected); expect(row.portalAccessVersion).toBe(expected);
          const before = (await f.admin.query<{ clock: string }>('SELECT clock_timestamp()::text AS clock')).rows[0].clock;
          const run = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, input(subject)));
          const after = (await f.admin.query<{ clock: string }>('SELECT clock_timestamp()::text AS clock')).rows[0].clock;
          const result = committed(run.result); await target(f, subject, result);
          const bound = await f.admin.query<{ lower: boolean; upper: boolean }>(`SELECT
            ($1::timestamptz-INTERVAL '336 hours') >= $2::timestamptz AS lower,
            ($1::timestamptz-INTERVAL '336 hours') <= $3::timestamptz AS upper`, [result.receipt.expiresAt, before, after]);
          expect(bound.rows).toEqual([{ lower: true, upper: true }]);
          dispatch(run.commands, baseline, 1, 'COMMIT');
          f.record({ operation: 'NATIVE_ELAPSED_336H', before, after, expiresAt: result.receipt.expiresAt, bound: bound.rows[0], timezone: zone.rows[0].zone });
        }
        expect(await f.captureSources()).toBe(baseline.source);
      });
    }, 45_000);

    it('PC06 real post-insert native error rolls back original session and LIVE together', async () => {
      await scenario('PC06', async (f, baseline) => {
        const run = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, input(f.subjects.A)), 'AFTER_REAL_INSERT_NATIVE_ERROR');
        noBearer(run.result, 'UNAVAILABLE'); dispatch(run.commands, baseline, 1, 'ROLLBACK');
        expect(run.commands.some(command => command.sqlstate === '22012')).toBe(true);
        await unchanged(f, baseline);
        f.record({ operation: 'REAL_INSERT_NATIVE_ERROR_ROLLBACK', commands: run.commands, sourceAndTargetsUntouched: true });
      });
    }, 45_000);

    it('PC07 FENCED retains original55000 and no actor override; failed own source INSERT remains E until rollback', async () => {
      await scenario('PC07', async (f, baseline) => {
        const protocol = await f.admin.query(`SELECT phase,backfill_actor,capture_manifest_sha256 FROM nevora_tenancy.expansion_protocol`);
        expect(protocol.rows).toHaveLength(1); expect(protocol.rows[0].phase).toBe('FENCED'); expect(protocol.rows[0].backfill_actor).toBeNull();
        const run = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, input(f.subjects.A)));
        noBearer(run.result, 'UNAVAILABLE'); dispatch(run.commands, baseline, 1, 'ROLLBACK');
        expect(run.commands.some(command => command.sqlstate === '55000')).toBe(true);
        let own = false;
        try {
          await f.writer.query('BEGIN ISOLATION LEVEL READ COMMITTED'); own = true;
          let code: string | null = null;
          try { await f.writer.query(`INSERT INTO public.employee_sessions(token_hash,employee_id,expires_at)
            VALUES($1::bpchar(64),$2,clock_timestamp()+INTERVAL '336 hours')`, ['f'.repeat(64), f.subjects.A.employeeId]); }
          catch (error) { code = sqlstate(error); }
          expect(code).toBe('55000'); await aborted(f, f.writer, baseline.identities.writer.pid);
          await f.writer.query('ROLLBACK'); own = false;
        } finally { if (own) await f.writer.query('ROLLBACK'); }
        expect((await f.admin.query('SELECT phase,backfill_actor,capture_manifest_sha256 FROM nevora_tenancy.expansion_protocol')).rows).toEqual(protocol.rows);
        await unchanged(f, baseline);
      });
    }, 45_000);

    it('PC08 original token and employee-wide hard DELETE cascade LIVE without tombstones or foreign effects', async () => {
      await scenario('PC08', async (f, baseline) => {
        const hashes: string[] = [];
        for (const subject of [f.subjects.A, f.subjects.B]) {
          const run = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, input(subject)));
          hashes.push(await target(f, subject, committed(run.result))); dispatch(run.commands, baseline, 1, 'COMMIT');
        }
        expect(await counts(f)).toEqual({ sessions: '2', live: '2', orphan: '0' });
        expect((await f.writer.query('DELETE FROM public.employee_sessions WHERE token_hash=$1::bpchar(64)', [hashes[0]])).rowCount).toBe(1);
        expect(await counts(f)).toEqual({ sessions: '1', live: '1', orphan: '0' });
        expect((await f.admin.query('SELECT employee_id FROM public.employee_sessions')).rows).toEqual([{ employee_id: f.subjects.B.employeeId }]);
        expect((await f.writer.query('DELETE FROM public.employee_sessions WHERE employee_id=$1', [f.subjects.B.employeeId])).rowCount).toBe(1);
        await unchanged(f, baseline);
      });
    }, 45_000);

    it('PC09 real COMMIT ACK loss releases no bearer, performs no rollback/replay and fresh native rows show applied tuple', async () => {
      await scenario('PC09', async (f, baseline) => {
        const run = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, input(f.subjects.A)), 'AFTER_REAL_COMMIT_ACK_LOST');
        noBearer(run.result, 'OUTCOME_UNKNOWN'); dispatch(run.commands, baseline, 1, 'COMMIT');
        expect(run.commands.some(command => /^ROLLBACK\b/i.test(command.text))).toBe(false);
        expect(await counts(f)).toEqual({ sessions: '1', live: '1', orphan: '0' });
        const actual = await f.admin.query(`SELECT s.employee_id, i.workspace_id, i.employee_id AS live_employee,
          s.created_at=i.session_created_at AS same_created, i.workspace_incarnation::text AS incarnation,
          i.portal_access_version::text AS access FROM public.employee_sessions s
          JOIN nevora_tenancy.portal_session_issuance i ON i.token_hash=s.token_hash`);
        const current = await source(f, f.subjects.A);
        expect(actual.rows).toEqual([{ employee_id: f.subjects.A.employeeId, workspace_id: f.subjects.A.workspaceId,
          live_employee: f.subjects.A.employeeId, same_created: true, incarnation: current.workspaceIncarnation, access: current.portalAccessVersion }]);
        expect(await f.captureSources()).toBe(baseline.source);
        f.record({ operation: 'FRESH_NATIVE_TUPLE_AFTER_COMMIT_ACK_LOSS', commands: run.commands, actual: actual.rows,
          claim: 'OBSERVATION_NOT_BEARER_RECOVERY_OR_CAUSAL_COMMIT_PROOF' });
      });
    }, 45_000);

    it('PC10 real rollback ACK loss remains unknown and native source/session/LIVE are wholly absent without replay', async () => {
      await scenario('PC10', async (f, baseline) => {
        const run = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, input(f.subjects.A)), 'AFTER_REAL_INSERT_ERROR_AND_REAL_ROLLBACK_ACK_LOST');
        noBearer(run.result, 'OUTCOME_UNKNOWN'); dispatch(run.commands, baseline, 1, 'ROLLBACK');
        expect(run.commands.some(command => command.sqlstate === '22012')).toBe(true);
        await unchanged(f, baseline);
        f.record({ operation: 'REAL_ROLLBACK_ACK_LOSS', commands: run.commands, actualAbsent: true,
          claim: 'ABSENCE_OBSERVATION_NOT_ACKNOWLEDGED_ROLLBACK_OR_REPLAY_PERMISSION' });
      });
    }, 45_000);

    it('PC11 real BEGIN ACK loss is owned and rolled back before any acquire/write or bearer', async () => {
      await scenario('PC11', async (f, baseline) => {
        const run = await f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, input(f.subjects.A)), 'AFTER_REAL_BEGIN_ACK_LOST');
        noBearer(run.result, 'UNAVAILABLE');
        expect(run.commands.filter(command => /^BEGIN\b/i.test(command.text))).toHaveLength(1);
        expect(run.commands.filter(command => /^ROLLBACK\b/i.test(command.text))).toHaveLength(1);
        expect(run.commands.some(command => /^SELECT\s+nevora_tenancy\.(?:acquire_portal_login_source|insert_portal_reviewed_session)\s*\(|^COMMIT\b/i.test(command.text))).toBe(false);
        expect(run.commands.at(-1)?.text.trim().replace(/;$/, '')).toBe('ROLLBACK');
        await unchanged(f, baseline);
      });
    }, 45_000);

    for (const [id, mutation] of [['PC12', 'RESET'], ['PC13', 'DEACTIVATE']] as const) {
      it(`${id} writer-first ${mutation} causes native acquire wait and fresh denial after monotonic writer COMMIT`, async () => {
        await scenario(id, async (f, baseline) => {
          let own = false; let pending: Promise<NativeRun<Outcome>> | undefined;
          try {
            await f.writer.query('BEGIN ISOLATION LEVEL READ COMMITTED'); own = true;
            if (mutation === 'RESET') {
              await f.writer.query('SELECT employee_id FROM public.employee_credentials WHERE employee_id=$1 FOR UPDATE', [f.subjects.A.employeeId]);
            } else {
              await f.writer.query('SELECT id FROM public.employees WHERE id=$1 AND workspace_id=$2 FOR UPDATE', [f.subjects.A.employeeId, f.subjects.A.workspaceId]);
            }
            pending = f.observe(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, input(f.subjects.A)));
            await blocked(f, baseline, 'verifier', 'writer');
            if (mutation === 'RESET') {
              const encoded = await hashPassword('fictional-reset-password-PC12');
              expect(await verifyPassword(f.subjects.A.password, encoded)).toBe(false);
              expect((await f.writer.query(`UPDATE public.employee_credentials SET password_hash=$1,
                password_updated_at=GREATEST(clock_timestamp(),password_updated_at+INTERVAL '1 microsecond')
                WHERE employee_id=$2`, [encoded, f.subjects.A.employeeId])).rowCount).toBe(1);
            } else {
              expect((await f.writer.query(`UPDATE public.employees SET active=false,
                updated_at=GREATEST(clock_timestamp(),updated_at+INTERVAL '1 microsecond') WHERE id=$1 AND workspace_id=$2`,
                [f.subjects.A.employeeId, f.subjects.A.workspaceId])).rowCount).toBe(1);
            }
            const expected = await f.captureSources(f.writer);
            await f.writer.query('COMMIT'); own = false;
            const run = await pending; pending = undefined; noBearer(run.result, 'DENY');
            expect(run.commands.some(command => /\bnevora_tenancy\.insert_portal_reviewed_session\s*\(/i.test(command.text))).toBe(false);
            expect(await f.captureSources()).toBe(expected);
            expect(await f.captureTargets()).toBe(baseline.targets);
            expect(await counts(f)).toEqual({ sessions: '0', live: '0', orphan: '0' });
            f.record({ operation: 'WRITER_FIRST_FRESH_DENIAL', mutation, commands: run.commands,
              originalSourceSHA256: digest(baseline.source), committedSourceSHA256: digest(expected) });
          } finally {
            if (own) await f.writer.query('ROLLBACK');
            if (pending) await pending;
          }
        });
      }, 45_000);
    }

    for (const [id, mutation] of [['PC14_RESET', 'RESET'], ['PC14_DEACTIVATE', 'DEACTIVATE']] as const) {
      it(`${id} verifier-first holds real acquired source locks; later writer waits then hard-revokes the committed local tuple`, async () => {
        await scenario(id, async (f, baseline) => {
          let own = false; let writerPending: Promise<unknown> | undefined;
          const pause = await f.pauseAfterAcquire(() => verifyAndCreatePortalSessionOnOwnedVerifier(f.witness, input(f.subjects.A)));
          let released = false; let observed = false;
          try {
            await pause.acquired;
            expect(f.verifier.getTransactionStatus()).toBe('T');
            await f.writer.query('BEGIN ISOLATION LEVEL READ COMMITTED'); own = true;
            if (mutation === 'RESET') {
              const encoded = await hashPassword('fictional-reset-password-PC14');
              expect(await verifyPassword(f.subjects.A.password, encoded)).toBe(false);
              writerPending = f.writer.query(`UPDATE public.employee_credentials SET password_hash=$1,
                password_updated_at=GREATEST(clock_timestamp(),password_updated_at+INTERVAL '1 microsecond')
                WHERE employee_id=$2`, [encoded, f.subjects.A.employeeId]);
            } else {
              writerPending = f.writer.query(`UPDATE public.employees SET active=false,
                updated_at=GREATEST(clock_timestamp(),updated_at+INTERVAL '1 microsecond') WHERE id=$1 AND workspace_id=$2`,
                [f.subjects.A.employeeId, f.subjects.A.workspaceId]);
            }
            await blocked(f, baseline, 'writer', 'verifier');
            pause.release(); released = true;
            const outcome = committed(await pause.pending); observed = true;
            dispatch(pause.commands, baseline, 1, 'COMMIT');
            const changed = await writerPending as { rowCount: number | null }; writerPending = undefined;
            expect(changed.rowCount).toBe(1);
            // The writer now owns its source row; admin cannot read the stale
            // source snapshot to certify the receipt. Inspect only source/LIVE
            // equality here, then delete exactly this employment's sessions.
            const tuple = await f.writer.query(`SELECT s.employee_id, i.workspace_id, s.created_at=i.session_created_at AS same_created
              FROM public.employee_sessions s JOIN nevora_tenancy.portal_session_issuance i ON i.token_hash=s.token_hash
              WHERE s.token_hash=$1::bpchar(64)`, [createHash('sha256').update(outcome.bearer, 'utf8').digest('hex')]);
            expect(tuple.rows).toEqual([{ employee_id: f.subjects.A.employeeId, workspace_id: f.subjects.A.workspaceId, same_created: true }]);
            expect((await f.writer.query('DELETE FROM public.employee_sessions WHERE employee_id=$1', [f.subjects.A.employeeId])).rowCount).toBe(1);
            const expected = await f.captureSources(f.writer);
            await f.writer.query('COMMIT'); own = false;
            expect(await f.captureSources()).toBe(expected);
            expect(await f.captureTargets()).toBe(baseline.targets);
            expect(await counts(f)).toEqual({ sessions: '0', live: '0', orphan: '0' });
            f.record({ operation: 'VERIFIER_FIRST_THEN_FIXTURE_WRITER_REVOCATION', mutation, commands: pause.commands,
              committedSourceSHA256: digest(expected), claim: 'LOCAL_TUPLE_THEN_NATIVE_DELETE_NOT_CURRENT_PORTAL_PROOF' });
          } finally {
            if (!released) pause.release();
            try { if (!observed) await pause.pending; }
            finally {
              try { if (writerPending) await writerPending; }
              finally { if (own) await f.writer.query('ROLLBACK'); }
            }
          }
        });
      }, 45_000);
    }
  });
}
