import Link from "next/link";
import { ConfigurationForm } from "@/components/configuration-form";
import { SelectField } from "@/components/select-field";
import { EmployeeSchedulingFields } from "@/components/employee-scheduling-fields";
import { PhoneInput } from "@/components/phone-input";
import { Card, KitLink, PageBand } from "@/components/kit/kit";
import { Field, FieldPair, FormActions, Notice } from "@/components/wave-a/parts";
import { PendingButton } from "@/components/wave-a/pending-button";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";
import { listPositions } from "@/lib/data/positions";
import { createEmployeeFormAction } from "@/app/app/employees/actions";

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

  // Phase 3.5 Wave A: New employee on the kit. Three cards (person, access, scheduling), then what happens next.
  return (
    <div className="nv-page wa-page wa-newmember" data-nv-page="">
      <PageBand back={{ href: "/app/employees", label: "Team" }} title="Add employee" summary="Their contact, access and scheduling details. Email is optional." />
      <div className="nv-content wa-narrow">
        {params.error ? <Notice tone="urgent" title="The employee wasn’t added">{errors[params.error] ?? "Complete all required employee fields."}</Notice> : null}
        {!activeLocations.length ? <Notice tone="review" title="Add a location first">
          {session.role === "OWNER" ? "An employee needs an active primary location." : "An employee needs an active primary location. Ask an Owner to add one."}
        </Notice> : null}
        {!activeLocations.length && session.role === "OWNER" ? <KitLink href="/app/settings/locations">Manage locations</KitLink> : null}

        <ConfigurationForm action={createEmployeeFormAction} className="wa-form">
          <Card title="Person" id="new-person">
            <div className="wa-fields">
              <FieldPair>
                <Field label="First name"><input name="firstName" autoComplete="off" required maxLength={160} /></Field>
                <Field label="Last name"><input name="lastName" autoComplete="off" required maxLength={160} /></Field>
              </FieldPair>
              <Field label="Employee ID" help="Unique. They use it to sign in." helpId="employee-id-help">
                <input name="id" autoCapitalize="characters" autoComplete="off" spellCheck={false} required maxLength={128} aria-describedby="employee-id-help" />
              </Field>
              <FieldPair>
                <Field label="Phone" help="They confirm it when they activate their account." helpId="employee-phone-help"><PhoneInput name="phone" autoComplete="off" required aria-describedby="employee-phone-help" /></Field>
                <Field label="Email" optional><input name="email" type="email" autoComplete="off" maxLength={254} /></Field>
              </FieldPair>
            </div>
          </Card>

          <Card title="Access" id="new-access">
            <div className="wa-fields">
              <FieldPair>
                <SelectField className="wa-select" name="role" label="Access role" defaultValue="EMPLOYEE"
                  hint="What they can do in the app. Separate from job qualifications."
                  options={[
                    ...(session.role === "OWNER" ? [{ value: "OWNER", label: "Owner" }] : []),
                    { value: "MANAGER", label: "Manager" },
                    { value: "LEAD", label: "Lead" },
                    { value: "EMPLOYEE", label: "Employee" },
                  ]}
                />
                <SelectField className="wa-select" name="primaryLocationId" label="Primary location" required defaultValue=""
                  hint="They can always be scheduled here."
                  options={[
                    { value: "", label: "Choose a location", disabled: true },
                    ...activeLocations.map((location) => ({ value: location.id, label: location.shortName })),
                  ]}
                />
              </FieldPair>
            </div>
          </Card>

          <Card title="Scheduling" id="new-scheduling">
            <div className="wa-fields"><EmployeeSchedulingFields locations={activeLocations} positions={positions} /></div>
          </Card>

          <FormActions>
            <PendingButton pending="Adding…" disabled={!activeLocations.length} block>Add employee</PendingButton>
            <Link className="nv-btn" data-kind="secondary" data-block="true" href="/app/employees">Cancel</Link>
          </FormActions>
        </ConfigurationForm>

        <Card title="What happens next" id="new-next">
          <ol className="wa-steps">
            <li>Give them their Employee ID.</li>
            <li>They open Activate account and enter their ID and phone number.</li>
            <li>They create a password and sign in.</li>
          </ol>
          <p className="wa-card-note">The phone number must match when they activate, so check it carefully.</p>
        </Card>
      </div>
    </div>
  );
}
