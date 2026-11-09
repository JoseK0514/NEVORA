import type { SessionMutationProof } from "../shift-changes/types";
import type { SqlExecutor } from "../notifications/types";
import { assertManagementProof, managementSessionStatements } from "../data/management-session";
import { getWorkspace, workspaceReadGuard } from "../data/workspaces";
import { neonNotificationExecutor } from "../data/notification-transactions";
import { brandStyle, type BrandTokens } from "./derive";
import { inspectLogo, type LogoProblem } from "./logo";
import {
  mergeSettings, parseLogoCommand, parsePresentationCommand, presentationCommandHash, readSettings,
  type PresentationSettings,
} from "./model";
import { ALL_MODULES_ON, enabledModules, type EnabledModules, type ModuleBlockers, type ModuleId } from "./modules";
import type { WordPresetId } from "./words";
import { communicationDevelopmentAllowedSql } from "../communications/sql";

export type PresentationRevision = { operationId: string; revision: number; changedAt: string; changedKeys: string[]; settings: PresentationSettings };
export type ActiveBrand = { style: Record<string, string> | undefined; tokens: BrandTokens | null; logoAssetId: string | null; revision: number };
export type ActivePresentation = ActiveBrand & { modules: EnabledModules; words: WordPresetId };
const NO_PRESENTATION: ActivePresentation = { style: undefined, tokens: null, logoAssetId: null, revision: 0, modules: ALL_MODULES_ON, words: "standard" };

/**
 * Reads the latest stored presentation. The default mode falls back on any read
 * failure. Module gates must use strict mode: only missing table/column errors
 * mean not installed and allow defaults; other failures throw so a database
 * outage cannot reopen a module the company disabled.
 */
export async function readActivePresentation(workspaceId: string, executor: SqlExecutor = neonNotificationExecutor(), { strict = false }: { strict?: boolean } = {}): Promise<ActivePresentation> {
  try {
    const rows = await executor.query<{ revision: number | null; settings: unknown; updatesLive?: boolean }>({
      // Release 1: the same database check that holds Updates' live activation (D04) is read with the settings, so
      // Updates counts as off wherever its reads and posts are held. The Owner's own switch still applies once it opens.
      text: activePresentationSql("$1"),
      values: [workspaceId],
    });
    const held = rows[0]?.updatesLive === false;
    if (!rows[0] || rows[0].revision === null || rows[0].revision === undefined) return held ? { ...NO_PRESENTATION, modules: { ...ALL_MODULES_ON, updates: false } } : NO_PRESENTATION;
    const settings = readSettings(rows[0].settings);
    const style = brandStyle(settings.brand.tokens);
    const modules = enabledModules(settings.modules?.disabled);
    return { style, tokens: style ? settings.brand.tokens : null, logoAssetId: settings.brand.logoAssetId, revision: rows[0].revision,
      modules: held ? { ...modules, updates: false } : modules, words: settings.words?.preset ?? "standard" };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
    if (strict && !["42P01", "42703"].includes(code)) throw error;
    return NO_PRESENTATION;
  }
}
export const readActiveBrand = readActivePresentation;

/** True while Updates' live activation is held on this database (anything but an owned local test database). */
const UPDATES_LIVE_SQL = `COALESCE((${communicationDevelopmentAllowedSql()}),false)`;
/** The one active-presentation read. Readers with a statement allowlist (the notification list) build theirs from this. */
export function activePresentationSql(workspaceParam: string) {
  return `SELECT p.revision,p.settings,${UPDATES_LIVE_SQL} AS "updatesLive" FROM (SELECT 1) one
        LEFT JOIN LATERAL (SELECT revision,settings FROM nevora_workspace_presentation_revisions WHERE workspace_id=${workspaceParam} ORDER BY revision DESC LIMIT 1) p ON true`;
}
export async function updatesActivationHeld(executor: SqlExecutor = neonNotificationExecutor()): Promise<boolean> {
  try { return (await executor.query<{ live: boolean }>({ text: `SELECT ${UPDATES_LIVE_SQL} AS live`, values: [] }))[0]?.live !== true; }
  catch { return true; }
}

/** Reads the latest 20 revisions with Owner/session guards before and after the query. */
export async function readPresentationHistory(proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()): Promise<PresentationRevision[]> {
  assertManagementProof(proof, proof.employee.id);
  const workspace = await getWorkspace(executor);
  const guards = [
    ...workspaceReadGuard(workspace),
    { text: "SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE", values: [proof.employee.id] },
    ...managementSessionStatements(proof, proof.employee.id, ["OWNER"]),
  ];
  const result = await executor.transaction([
    ...guards,
    {
      text: 'SELECT operation_id::text AS "operationId",revision,changed_at::text AS "changedAt",changed_keys AS "changedKeys",settings FROM nevora_workspace_presentation_revisions WHERE workspace_id=$1 ORDER BY revision DESC LIMIT 20',
      values: [workspace.id],
    },
    ...managementSessionStatements(proof, proof.employee.id, ["OWNER"]),
  ]);
  return result[guards.length] as PresentationRevision[];
}

/** Serializes writes on the singleton workspace and binds the actual workspace into the statement. */
async function ownerTransaction(proof: SessionMutationProof, statement: { text: string; values: unknown[] }, executor: SqlExecutor) {
  assertManagementProof(proof, proof.employee.id);
  const workspace = await getWorkspace(executor);
  const guards = [
    { text: "SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR NO KEY UPDATE", values: [] },
    ...workspaceReadGuard(workspace),
    { text: "SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE", values: [proof.employee.id] },
    ...managementSessionStatements(proof, proof.employee.id, ["OWNER"]),
  ];
  const result = await executor.transaction([
    ...guards,
    { text: statement.text, values: statement.values.map(v => (v === WORKSPACE ? workspace.id : v)) },
    ...managementSessionStatements(proof, proof.employee.id, ["OWNER"]),
  ]);
  return (result[guards.length]?.[0] as { result?: unknown } | undefined)?.result;
}
const WORKSPACE = Symbol("workspace");

export class ModuleBusy extends Error { constructor(readonly module: ModuleId, readonly count: number) { super(`module_busy:${module}`); } }

/**
 * Saves one section with an expected revision and operation hash. Existing
 * operations replay their settings; new stale commands conflict. PostgreSQL
 * owns final serialization and module-busy checks. Missing results are uncertain
 * outcomes: retry the same command rather than generate a new operation ID.
 */
export async function saveWorkspacePresentation(proof: SessionMutationProof, input: unknown, executor: SqlExecutor = neonNotificationExecutor()) {
  const command = parsePresentationCommand(input);
  const workspace = await getWorkspace(executor);
  // Sections merge onto the latest saved settings. A retry replays the stored
  // result; anything saved since the editor loaded is a conflict.
  const [mine, latest] = await Promise.all([
    executor.query<{ settings: unknown }>({ text: "SELECT settings FROM nevora_workspace_presentation_revisions WHERE operation_id=$1::uuid AND workspace_id=$2", values: [command.operationId, workspace.id] }),
    executor.query<{ revision: number; settings: unknown }>({ text: "SELECT revision,settings FROM nevora_workspace_presentation_revisions WHERE workspace_id=$1 ORDER BY revision DESC LIMIT 1", values: [workspace.id] }),
  ]);
  if (!mine[0] && (latest[0]?.revision ?? 0) !== command.expectedRevision) throw Error("workspace_presentation_conflict");
  const settings = mine[0] ? readSettings(mine[0].settings) : mergeSettings(latest[0]?.settings, command);
  const saved = await ownerTransaction(proof, {
    text: "SELECT nevora_set_workspace_presentation($1::uuid,$2,$3,$4::integer,$5::jsonb,$6) AS result",
    values: [command.operationId, WORKSPACE, proof.employee.id, command.expectedRevision, JSON.stringify(settings), presentationCommandHash(command)],
  }, executor).catch((error: unknown) => {
    const busy = /module_busy:(timeOff|marketplace):(\d+)/.exec(String(error));
    if (busy) throw new ModuleBusy(busy[1] as ModuleId, Number(busy[2]));
    throw error;
  }) as Omit<PresentationRevision, "settings"> | undefined;
  if (!saved) throw Error("Presentation outcome unknown; retry original command.");
  return { ...saved, settings };
}

/** Requests still waiting in modules an Owner might turn off (B2). */
export async function readModuleBlockers(proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()): Promise<ModuleBlockers> {
  assertManagementProof(proof, proof.employee.id);
  const workspace = await getWorkspace(executor);
  const guards = [...workspaceReadGuard(workspace), ...managementSessionStatements(proof, proof.employee.id, ["OWNER"])];
  const result = await executor.transaction([
    ...guards,
    // One workspace per database (workspaces.singleton): request tables are unscoped.
    { text: `SELECT (SELECT count(*) FROM time_off_requests WHERE status='PENDING')::integer AS "timeOff",
      ((SELECT count(*) FROM shift_exchanges WHERE status IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING'))
       +(SELECT count(*) FROM shift_callouts WHERE status='PENDING'))::integer AS marketplace`, values: [] },
    ...managementSessionStatements(proof, proof.employee.id, ["OWNER"]),
  ]);
  const row = result[guards.length]?.[0] as { timeOff: number; marketplace: number } | undefined;
  return row ? { timeOff: row.timeOff, marketplace: row.marketplace } : {};
}

export class LogoRejected extends Error { constructor(readonly problem: LogoProblem) { super(problem); } }

/**
 * Inspects decoded image bytes before an Owner-guarded asset write. Uploading
 * stores an asset; selecting it for the brand is a separate presentation command.
 * Preserve operationId when retrying an unconfirmed upload result.
 */
export async function uploadWorkspaceLogo(proof: SessionMutationProof, input: unknown, executor: SqlExecutor = neonNotificationExecutor()) {
  const command = parseLogoCommand(input);
  const bytes = Buffer.from(command.dataBase64, "base64");
  const inspected = inspectLogo(bytes);
  if (!inspected.ok) throw new LogoRejected(inspected.problem);
  const { image } = inspected;
  const saved = await ownerTransaction(proof, {
    text: "SELECT nevora_add_workspace_presentation_asset($1::uuid,$2,$3,$4,$5::integer,$6::integer,decode($7,'base64'),$8) AS result",
    values: [command.operationId, WORKSPACE, proof.employee.id, image.mediaType, image.width, image.height, bytes.toString("base64"), image.sha256],
  }, executor) as { assetId: string; mediaType: string; width: number; height: number } | undefined;
  if (!saved) throw Error("Logo outcome unknown; retry original upload.");
  return saved;
}

/** Logo bytes for an asset id. Ids are random UUIDs, and a logo is public
 * company branding, so the image route serves it to any page that shows it. */
export async function readLogoAsset(assetId: string, executor: SqlExecutor = neonNotificationExecutor()) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)) return null;
  const rows = await executor.query<{ mediaType: string; sha256: string; data: string }>({
    text: 'SELECT media_type AS "mediaType",sha256,encode(bytes,\'base64\') AS data FROM nevora_workspace_presentation_assets WHERE id=$1::uuid',
    values: [assetId.toLowerCase()],
  });
  if (!rows[0] || !["image/png", "image/webp"].includes(rows[0].mediaType)) return null;
  return { mediaType: rows[0].mediaType, sha256: rows[0].sha256, bytes: Buffer.from(rows[0].data, "base64") };
}
