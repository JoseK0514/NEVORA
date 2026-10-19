import { requireRoles } from "@/lib/auth/permissions";
import { listPositions } from "@/lib/data/positions";
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
  return (
    <PositionCatalog positions={positions} available={available}
      createAction={createPositionAction} updateAction={updatePositionAction} />
  );
}
