import Link from "next/link";
import { ArrowLeft, ArrowRight, Briefcase, Key, ShieldCheck, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { ConfigurationForm } from "@/components/configuration-form";
import { SelectField } from "@/components/select-field";
import { EmployeeSchedulingFields } from "@/components/employee-scheduling-fields";
import { PhoneInput } from "@/components/phone-input";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";
import { listPositions } from "@/lib/data/positions";
import { createEmployeeFormAction } from "@/app/app/employees/actions";
import { NewEmployeeFrame } from "./new-employee-frame";
import "./new-employee.css";

const errors: Record<string, string> = {
  permission: "Only an owner can create another owner.",
  save: "Employee could not be saved. Check that the ID and email are unique and the selected locations and positions are active.",
  id: "Enter a unique employee ID with no more than 128 characters.",
  name: "Enter a first and last name with no more than 160 characters each.",
  email: "Enter a valid email address, or leave the optional email field empty.",
};

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireRoles(MANAGER_ROLES);
  const [locations, positions, params] = await Promise.all([
    listLocations(), listPositions(), searchParams,
  ]);
  const activeLocations = locations.filter((location) => location.active);

  return (
    <NewEmployeeFrame>
      <header className="new-employee-header" data-employee-reveal>
        <Link className="new-employee-back" href="/app/employees">
          <ArrowLeft size={16} aria-hidden="true" /> Employees
        </Link>
        <h1>Add Employee</h1>
        <p>Add contact, access and scheduling details. Email remains optional.</p>
      </header>

      <div className="new-employee-layout">
        <section className="new-employee-panel" aria-label="New employee details" data-employee-reveal>
          {params.error ? (
            <p className="form-error" role="alert">
              {errors[params.error] ?? "Complete all required employee fields."}
            </p>
          ) : null}
          {!activeLocations.length ? (
            <p className="new-employee-empty" role="status">
              Add an active location before creating an employee.
              {session.role === "OWNER" ? (
                <> <Link href="/app/settings/locations">Manage locations <ArrowRight size={14} aria-hidden="true" /></Link></>
              ) : " Ask an owner to set up a location."}
            </p>
          ) : null}

          <ConfigurationForm action={createEmployeeFormAction} className="employee-form new-employee-form">
            <section className="new-employee-section" aria-labelledby="employee-contact-heading">
              <div className="new-employee-section-heading">
                <UserCircle size={24} weight="duotone" aria-hidden="true" />
                <div><h2 id="employee-contact-heading">Personal details</h2><p>Use the details they will use to activate their account.</p></div>
              </div>
              <div className="form-columns">
                <label>First Name<input name="firstName" autoComplete="given-name" required maxLength={160} /></label>
                <label>Last Name<input name="lastName" autoComplete="family-name" required maxLength={160} /></label>
              </div>
              <div className="form-columns">
                <label>Employee ID<input name="id" placeholder="Enter an employee ID" autoCapitalize="characters" spellCheck={false} required maxLength={128} aria-describedby="employee-id-help" /><small id="employee-id-help">A unique ID for sign-in.</small></label>
                <label>Phone Number<PhoneInput name="phone" autoComplete="tel-national" required /><small>Used to verify account activation.</small></label>
              </div>
              <label className="new-employee-email"><span className="new-employee-label">Email <span>Optional</span></span><input name="email" type="email" autoComplete="email" maxLength={254} /></label>
            </section>

            <section className="new-employee-section" aria-labelledby="employee-access-heading">
              <div className="new-employee-section-heading">
                <ShieldCheck size={24} weight="duotone" aria-hidden="true" />
                <div><h2 id="employee-access-heading">Access &amp; home location</h2><p>Choose their app permissions and primary workplace.</p></div>
              </div>
              <div className="form-columns">
                <SelectField name="role" label="Access role" defaultValue="EMPLOYEE"
                  hint="App permissions are separate from job qualifications."
                  options={[
                    ...(session.role === "OWNER" ? [{ value: "OWNER", label: "Owner" }] : []),
                    { value: "MANAGER", label: "Manager" },
                    { value: "LEAD", label: "Lead" },
                    { value: "EMPLOYEE", label: "Employee" },
                  ]}
                />
                <SelectField name="primaryLocationId" label="Primary location" required defaultValue=""
                  hint="Their primary location is always eligible for scheduling."
                  options={[
                    { value: "", label: "Choose a primary location", disabled: true },
                    ...activeLocations.map((location) => ({ value: location.id, label: location.shortName })),
                  ]}
                />
              </div>
            </section>

            <section className="new-employee-section" aria-labelledby="employee-scheduling-heading">
              <div className="new-employee-section-heading">
                <Briefcase size={24} weight="duotone" aria-hidden="true" />
                <div><h2 id="employee-scheduling-heading">Scheduling eligibility</h2><p>Select qualified positions and any additional workplaces.</p></div>
              </div>
              <div className="new-employee-scheduling"><EmployeeSchedulingFields locations={activeLocations} positions={positions} /></div>
            </section>

            <div className="form-footer new-employee-footer">
              <Link className="button secondary" href="/app/employees">Cancel</Link>
              <button className="button primary" type="submit" disabled={!activeLocations.length}>Create Employee <ArrowRight size={16} aria-hidden="true" /></button>
            </div>
          </ConfigurationForm>
        </section>

        <aside className="new-employee-next" aria-labelledby="employee-next-heading" data-employee-reveal>
          <div className="new-employee-next-icon"><Key size={24} weight="duotone" aria-hidden="true" /></div>
          <h2 id="employee-next-heading">What happens next</h2>
          <p>Once saved, the employee can activate their account and create their own password.</p>
          <ol>
            <li>Share their Employee ID with them.</li>
            <li>They open Activate Account and enter their ID and phone number.</li>
            <li>They create a password and sign in.</li>
          </ol>
          <p className="new-employee-next-note">Check the phone number carefully. It must match during activation.</p>
          <Link className="new-employee-directory-link" href="/app/employees">View Employees <ArrowRight size={15} aria-hidden="true" /></Link>
        </aside>
      </div>
    </NewEmployeeFrame>
  );
}
