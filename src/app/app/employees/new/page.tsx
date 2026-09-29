import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PhoneInput } from "@/components/phone-input";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";
import { createEmployeeAction } from "@/app/app/employees/actions";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireRoles(MANAGER_ROLES);
  const locations = await listLocations();
  const params = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Add Employee"
        description="Only scheduling information is collected. Email remains optional."
        actions={<Link className="button secondary" href="/app/employees">Cancel</Link>}
      />

      <section className="panel form-panel">
        {params.error ? (
          <p className="form-error">
            {params.error === "permission"
              ? "Only an owner can create another owner."
              : params.error === "save"
                ? "Employee could not be saved. Check that the ID and email are not already in use."
                : "Complete all required employee fields."}
          </p>
        ) : null}

        <form action={createEmployeeAction} className="employee-form">
          <label>
            Employee ID
            <input name="id" placeholder="FC-0021" required />
          </label>

          <div className="form-columns">
            <label>
              First Name
              <input name="firstName" required />
            </label>
            <label>
              Last Name
              <input name="lastName" required />
            </label>
          </div>

          <div className="form-columns">
            <label>
              Phone Number
              <PhoneInput name="phone" required />
            </label>
            <label>
              Email <span>Optional</span>
              <input name="email" type="email" />
            </label>
          </div>

          <div className="form-columns">
            <label>
              Role
              <select name="role" defaultValue="EMPLOYEE">
                {session.role === "OWNER" ? <option value="OWNER">Owner</option> : null}
                <option value="MANAGER">Manager</option>
                <option value="LEAD">Lead</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </label>

            <label>
              Primary Location
              <select name="primaryLocationId" required defaultValue={locations[0]?.id}>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.shortName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend>Eligible Locations</legend>
            <p>Primary location is always included automatically.</p>
            <div className="checkbox-grid">
              {locations.map((location) => (
                <label className="checkbox-row" key={location.id}>
                  <input
                    type="checkbox"
                    name="eligibleLocationIds"
                    value={location.id}
                  />
                  <span>{location.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="form-help">
            The employee creates their own password from the Activate Account screen
            using the Employee ID and phone number entered here.
          </p>

          <div className="form-footer">
            <Link className="button secondary" href="/app/employees">Cancel</Link>
            <button className="button primary" type="submit">Create Employee</button>
          </div>
        </form>
      </section>
    </>
  );
}
