import { requireRoles } from "@/lib/auth/permissions";
import { listPositions } from "@/lib/data/positions";
import { listEmployees } from "@/lib/data/employees";
import type { Position } from "@/lib/domain";
import { createPositionAction, updatePositionAction } from "../actions";
import { SettingsPageB } from "../settings-b";
import { PositionCatalog } from "./position-catalog";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../settings-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].positions }; }

export default async function PositionsPage() {
  await requireRoles(["OWNER"]);
  const lang = await readPageLang(), t = SETTINGS_COPY[lang];
  let positions: Position[] = [];
  let available = true;
  try {
    positions = await listPositions({ includeInactive: true });
  } catch {
    available = false;
  }
  // Quiet (v4): each row says how many active people hold the position; a failed read leaves the line out.
  const employees = available ? await listEmployees().catch(() => null) : null;
  const people = employees ? Object.fromEntries(positions.map(position => [position.id, employees.filter(employee => employee.active && employee.positionIds.includes(position.id)).length])) : undefined;
  return (
    <SettingsPageB title={t.positions} titleId="positions-title" lang={lang === "es" ? "es" : undefined}>
      <PositionCatalog positions={positions} available={available} people={people}
        createAction={createPositionAction} updateAction={updatePositionAction} />
    </SettingsPageB>
  );
}
