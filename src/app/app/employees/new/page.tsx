import {ConfigurationForm} from "@/components/configuration-form";
import { SelectField } from "@/components/select-field";
import { listPositions } from "@/lib/data/positions";
import { EmployeeSchedulingFields } from "@/components/employee-scheduling-fields";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PhoneInput } from "@/components/phone-input";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";
import { createEmployeeFormAction } from "@/app/app/employees/actions";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireRoles(MANAGER_ROLES);
  const [locations, positions] = await Promise.all([listLocations(), listPositions()]);
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

        <ConfigurationForm action={createEmployeeFormAction} className="employee-form">
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
            <SelectField
              name="role"
              label="Access role"
              defaultValue="EMPLOYEE"
              options={[
                ...(session.role === "OWNER"
                  ? [{ value: "OWNER", label: "Owner" }]
                  : []),
                { value: "MANAGER", label: "Manager" },
                { value: "LEAD", label: "Lead" },
                { value: "EMPLOYEE", label: "Employee" },
              ]}
            />
            <SelectField
              name="primaryLocationId"
              label="Primary location"
              required
              defaultValue=""
              options={[
                {
                  value: "",
                  label: "Choose a primary location",
                  disabled: true,
                },
                ...locations.map((location) => ({
                  value: location.id,
                  label: location.shortName,
                })),
              ]}
            />
          </div>

          <EmployeeSchedulingFields locations={locations} positions={positions}/>

          <p className="form-help">
            The employee creates their own password from the Activate Account screen
            using the Employee ID and phone number entered here.
          </p>

          <div className="form-footer">
            <Link className="button secondary" href="/app/employees">Cancel</Link>
            <button className="button primary" type="submit">Create Employee</button>
          </div>
        </ConfigurationForm>
      </section>
    </>
  );
}
