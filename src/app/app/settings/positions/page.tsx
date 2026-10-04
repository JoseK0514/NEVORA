import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ConfigurationForm } from "@/components/configuration-form";
import { requireRoles } from "@/lib/auth/permissions";
import { listPositions } from "@/lib/data/positions";
import { createPositionAction, updatePositionAction } from "../actions";
export default async function PositionsPage() {
  await requireRoles(["OWNER"]);
  const positions = await listPositions({ includeInactive: true });
  return (
    <div className="configuration-page">
      <PageHeader
        eyebrow="Owner controls"
        title="Positions"
        description="Positions describe job qualifications. They do not grant Owner, Manager, Lead or Employee access."
        actions={
          <Link href="/app/settings" className="button secondary">
            Back to Settings
          </Link>
        }
      />
      <section className="panel form-panel">
        <h2>Add Position</h2>
        <ConfigurationForm action={createPositionAction}>
          <label>
            Position name
            <input name="name" required maxLength={80} />
          </label>
          <button className="button primary" type="submit">
            Add Position
          </button>
        </ConfigurationForm>
      </section>
      <section className="panel configuration-list">
        <h2>Position catalog</h2>
        {positions.length ? (
          positions.map((position) => (
            <div key={position.id}>
              <ConfigurationForm action={updatePositionAction}>
                <input type="hidden" name="id" value={position.id} />
                <label>
                  Position name
                  <input
                    name="name"
                    defaultValue={position.name}
                    required
                    maxLength={80}
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={position.active}
                  />
                  Active position
                </label>
                <p>
                  {position.active ? "Active" : "Inactive"} · Existing
                  memberships and history are retained.
                </p>
                <button className="button secondary" type="submit">
                  Save Position
                </button>
              </ConfigurationForm>
            </div>
          ))
        ) : (
          <p>No positions configured. Positionless shifts remain available.</p>
        )}
        <p className="form-help">
          Inactive positions cannot be newly assigned. Existing coverage
          requirements remain visible in Scheduling Rules and need attention.
        </p>
      </section>
    </div>
  );
}
