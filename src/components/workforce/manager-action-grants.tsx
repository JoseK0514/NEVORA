"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CorpCard } from "@/components/corp/corp";
import { BChip, BSpin, BState } from "@/components/owner-b/b-kit";
import type { WorkforcePermission } from "@/lib/workforce/permissions";
import { PERMISSION_ORDER, permissionCopy, type PermissionLang } from "./permission-copy";

/* SCRUM-215 (Nov 19, 2026): the Owner's per-location action grants for one Manager, on that Manager's Access page under
 * Management access. Read: GET /api/workforce/settings (Owner). Write: one PERMISSION command per switch, POST
 * /api/workforce/settings with x-nevora-workforce: 1, a client UUID and the grant's expected revision. A switch shows the
 * server's state only: it moves when the save is confirmed. A lost answer or a 503 keeps the exact command and offers
 * "Check again", which sends it unchanged (a saved one replays its receipt); a 409 asks for a reload. Only the locations
 * the Manager's current management scope covers are shown, as the contract says. */

type Grant = { granted: boolean; revision: number };
type Key = `${string}|${WorkforcePermission}`;
type Command = { kind: "PERMISSION"; operationId: string; employeeId: string; locationId: string; permission: WorkforcePermission; granted: boolean; expectedRevision: number };
type Status = { state: "saving"; command: Command } | { state: "saved" } | { state: "unknown" | "checking"; command: Command } | { state: "conflict" | "failed" | "denied" };
type Load = { state: "loading" } | { state: "ready" } | { state: "failed" };

const keyOf = (locationId: string, permission: WorkforcePermission): Key => `${locationId}|${permission}`;
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

async function readGrants(employeeId: string, signal?: AbortSignal): Promise<Map<Key, Grant> | null> {
  try {
    const response = await fetch("/api/workforce/settings", { headers: { "x-nevora-workforce": "1" }, cache: "no-store", credentials: "same-origin", redirect: "error", signal });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!record(body) || body.state !== "ready" || !record(body.data) || !Array.isArray(body.data.grants)) return null;
    const grants = new Map<Key, Grant>();
    for (const row of body.data.grants) {
      if (!record(row) || row.employeeId !== employeeId || typeof row.locationId !== "string" || !PERMISSION_ORDER.includes(row.permission as WorkforcePermission)
        || typeof row.revision !== "number") continue;
      // A grant from before a role change (currentGeneration false) no longer applies: shown off, its revision kept.
      grants.set(keyOf(row.locationId, row.permission as WorkforcePermission), { granted: row.granted === true && row.currentGeneration === true, revision: row.revision });
    }
    return grants;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

async function sendGrant(command: Command): Promise<{ kind: "saved"; revision: number } | { kind: "conflict" | "invalid" | "denied" | "unknown" }> {
  try {
    const response = await fetch("/api/workforce/settings", { method: "POST", headers: { "Content-Type": "application/json", "x-nevora-workforce": "1" },
      body: JSON.stringify(command), cache: "no-store", credentials: "same-origin", redirect: "error" });
    let body: unknown = null;
    try { body = await response.json(); } catch { /* judged by status */ }
    if (response.status === 200 && record(body) && body.state === "saved" && record(body.receipt) && body.receipt.operationId === command.operationId && typeof body.receipt.revision === "number")
      return { kind: "saved", revision: body.receipt.revision };
    if (response.status === 409) return { kind: "conflict" };
    if (response.status === 400) return { kind: "invalid" };
    if (response.status === 401 || response.status === 403) return { kind: "denied" };
    return { kind: "unknown" };
  } catch { return { kind: "unknown" }; }
}

export function ManagerActionGrants({ employeeId, firstName, locations, scopeLocationIds, manager, lang = "en" }: {
  employeeId: string; firstName: string; locations: { id: string; name: string; active: boolean }[];
  /** The Manager's current management scope: null for none, "all" for company-wide. */
  scopeLocationIds: string[] | "all" | null; manager: boolean; lang?: PermissionLang;
}) {
  const t = permissionCopy(lang);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [grants, setGrants] = useState<Map<Key, Grant>>(new Map());
  const [status, setStatus] = useState<Partial<Record<Key, Status>>>({});
  const [said, setSaid] = useState("");
  const busy = useRef(new Set<Key>());

  const apply = useCallback((read: Map<Key, Grant> | null) => {
    if (!read) { setLoad(old => old.state === "ready" ? old : { state: "failed" }); return; }
    setGrants(read); setLoad({ state: "ready" }); setStatus({});
  }, []);
  const reload = useCallback(() => readGrants(employeeId).then(apply, () => undefined), [employeeId, apply]);
  const scopeKey = scopeLocationIds === null ? "" : scopeLocationIds === "all" ? "all" : scopeLocationIds.join(",");
  useEffect(() => {
    if (!manager || !scopeKey) return;
    const controller = new AbortController();
    readGrants(employeeId, controller.signal).then(read => { if (!controller.signal.aborted) apply(read); }, () => undefined);
    return () => controller.abort();
  }, [employeeId, apply, manager, scopeKey]);

  const shown = scopeLocationIds === "all" ? locations.filter(l => l.active) : locations.filter(l => scopeLocationIds?.includes(l.id));

  async function run(key: Key, command: Command, again: boolean) {
    if (busy.current.has(key)) return;
    busy.current.add(key);
    setStatus(old => ({ ...old, [key]: { state: again ? "checking" : "saving", command } }));
    const result = await sendGrant(command);
    busy.current.delete(key);
    if (result.kind === "saved") {
      setGrants(old => new Map(old).set(key, { granted: command.granted, revision: result.revision }));
      setStatus(old => ({ ...old, [key]: { state: "saved" } }));
      window.setTimeout(() => setStatus(old => old[key]?.state === "saved" ? { ...old, [key]: undefined } : old), 4000);
      setSaid(`${t.switchLabel(t.actions[command.permission].name, locations.find(l => l.id === command.locationId)?.name ?? "")}: ${t.saved}`);
      return;
    }
    if (result.kind === "unknown") { setStatus(old => ({ ...old, [key]: { state: "unknown", command } })); setSaid(t.unknown); return; }
    setStatus(old => ({ ...old, [key]: { state: result.kind === "invalid" ? "failed" : result.kind } }));
    setSaid(result.kind === "conflict" ? t.conflict : result.kind === "denied" ? t.denied : t.failed);
  }
  function toggle(locationId: string, permission: WorkforcePermission, granted: boolean) {
    const key = keyOf(locationId, permission), current = grants.get(key);
    const pending = status[key];
    if (pending && "command" in pending) return;
    void run(key, { kind: "PERMISSION", operationId: crypto.randomUUID(), employeeId, locationId, permission, granted, expectedRevision: current?.revision ?? 0 }, false);
  }

  let body;
  if (!manager) body = <p className="mg-note">{t.notManager}</p>;
  else if (!scopeLocationIds || !shown.length) body = <p className="mg-note">{t.noScope(firstName)}</p>;
  else if (load.state === "loading") body = <div className="mg-skel" role="status" aria-busy="true"><span className="mg-sr">{t.loading}</span>
    {shown.slice(0, 2).map(location => <span key={location.id} className="mg-skel__group" aria-hidden="true"><span className="mg-skel__bar mg-skel__bar--h" />{PERMISSION_ORDER.map(p => <span key={p} className="mg-skel__row"><span className="mg-skel__bar" /><span className="mg-skel__bar mg-skel__bar--sw" /></span>)}</span>)}
  </div>;
  else if (load.state === "failed") body = <BState alert kind="failed" title={t.loadFailedTitle} line={t.loadFailedBody} action={{ retry: true, label: t.tryAgain, onClick: () => { setLoad({ state: "loading" }); void reload(); } }} />;
  else body = <>
    <p className="mg-note">{t.panelIntro(firstName)}</p>
    {shown.map(location => <fieldset key={location.id} className="mg-loc">
      <legend className="mg-loc__h">{location.name}{location.active ? null : <BChip tone="grey">{t.inactiveLocation}</BChip>}</legend>
      <ul className="mg-rows">{PERMISSION_ORDER.map(permission => {
        const key = keyOf(location.id, permission), on = grants.get(key)?.granted ?? false, s = status[key], action = t.actions[permission];
        const working = s?.state === "saving" || s?.state === "checking";
        const id = `mg-${location.id}-${permission}`;
        return <li key={permission} className="mg-row">
          <label className="mg-row__tx" htmlFor={id}><b>{action.name}</b><span>{action.line}</span></label>
          <span className="mg-row__end">
            {working ? <span className="mg-st" role="status"><BSpin small />{t.saving}</span>
              : s?.state === "saved" ? <span className="mg-st mg-st--ok">{t.saved}</span>
              : s?.state === "unknown" ? <span className="mg-st mg-st--warn"><button type="button" className="mg-link" onClick={() => void run(key, s.command, true)}>{t.checkAgain}</button></span>
              : s?.state === "conflict" ? <span className="mg-st mg-st--warn"><button type="button" className="mg-link" onClick={() => { setLoad({ state: "loading" }); void reload(); }}>{t.reload}</button></span>
              : s?.state === "failed" || s?.state === "denied" ? <span className="mg-st mg-st--err">{s.state === "denied" ? t.denied : t.failed}</span> : null}
            <input id={id} type="checkbox" role="switch" className="c-switch" checked={on} disabled={working || s?.state === "unknown" || s?.state === "conflict" || !location.active && !on}
              aria-label={t.switchLabel(action.name, location.name)} aria-describedby={s?.state === "unknown" || s?.state === "conflict" ? `${id}-why` : undefined}
              onChange={event => toggle(location.id, permission, event.target.checked)} />
          </span>
          {s?.state === "unknown" ? <p className="mg-why" id={`${id}-why`}>{t.unknown}</p> : s?.state === "conflict" ? <p className="mg-why" id={`${id}-why`}>{t.conflict}</p> : null}
        </li>;
      })}</ul>
    </fieldset>)}
  </>;

  return <CorpCard id="manager-action-grants" label={t.panelTitle} lang={lang}>
    <div className="mg">
      <p className="mg-sr" role="status" aria-live="polite">{said}</p>
      {body}
    </div>
  </CorpCard>;
}
