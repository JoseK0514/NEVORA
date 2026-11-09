import { requireRoles } from "@/lib/auth/permissions";
import { listPositions } from "@/lib/data/positions";
import { listEmployees } from "@/lib/data/employees";
import type { Position } from "@/lib/domain";
import { createPositionAction, updatePositionAction } from "../actions";
import { PositionCatalog } from "./position-catalog";

export default async function PositionsPage() {
  await requireRoles(["OWNER"]);
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
    <PositionCatalog positions={positions} available={available} people={people}
      createAction={createPositionAction} updateAction={updatePositionAction} />
  );
}
