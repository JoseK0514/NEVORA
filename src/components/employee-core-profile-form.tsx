import { ConfigurationForm, type ConfigurationResult } from "@/components/configuration-form";
import { PhoneInput } from "@/components/phone-input";
import { SelectField } from "@/components/select-field";
import { Field, FieldPair, FormActions } from "@/components/wave-a/parts";
import { PendingButton } from "@/components/wave-a/pending-button";
import type { EmployeeManagementProfile } from "@/lib/data/employees";
import type { Location, UserRole } from "@/lib/domain";

/** Phase 3.5 Wave A: the person's contact and access details, in the shared form pattern. */
export function EmployeeCoreProfileForm({
  employee,
  locations,
  actorRole,
  action,
}: {
  employee: EmployeeManagementProfile;
  locations: Location[];
  actorRole: UserRole;
  action: (data: FormData) => Promise<ConfigurationResult>;
}) {
  const roleOptions = [
    ...(actorRole === "OWNER" ? [{ value: "OWNER", label: "Owner" }] : []),
    { value: "MANAGER", label: "Manager" },
    { value: "LEAD", label: "Lead" },
    { value: "EMPLOYEE", label: "Employee" },
  ];

  const locationOptions = locations
    .filter((location) => location.active || location.id === employee.primaryLocationId)
    .map((location) => ({
      value: location.id,
      label:
        location.id === employee.primaryLocationId && !location.active
          ? `${location.shortName} (Inactive — can only be retained while inactive)`
          : location.shortName,
    }));

  return (
    <ConfigurationForm action={action} reviewedUpdatedAt={employee.updatedAt} className="wa-form">
      <input type="hidden" name="employeeId" value={employee.id} />
      <div className="wa-fields">
        <div className="wa-readonly wa-readonly--first">
          <span className="wa-field__label">Employee ID</span>
          <span className="wa-readonly__value">{employee.id}</span>
          <span className="wa-field__help">Employee IDs stay the same after they’re created.</span>
        </div>
        <FieldPair>
          <Field label="First name"><input name="firstName" defaultValue={employee.firstName} autoComplete="off" required maxLength={160} /></Field>
          <Field label="Last name"><input name="lastName" defaultValue={employee.lastName} autoComplete="off" required maxLength={160} /></Field>
        </FieldPair>
        <FieldPair>
          <Field label="Phone"><PhoneInput name="phone" defaultValue={employee.phone} autoComplete="off" required /></Field>
          <Field label="Email" optional><input name="email" type="email" defaultValue={employee.email ?? ""} autoComplete="off" maxLength={254} /></Field>
        </FieldPair>
        <FieldPair>
          <SelectField className="wa-select" name="role" label="Access role" defaultValue={employee.role} options={roleOptions} required />
          <SelectField className="wa-select" name="primaryLocationId" label="Primary location" defaultValue={employee.primaryLocationId} options={locationOptions}
            hint={locations.find((location) => location.id === employee.primaryLocationId)?.active ? undefined : "Choose an active primary location before reactivating this employee."} required />
        </FieldPair>
        <SelectField className="wa-select" name="active" label="Status" defaultValue={String(employee.active)}
          options={[{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }]}
          hint="Deactivation signs this employee out immediately. Reactivation requires a fresh sign-in. History is preserved." required />
      </div>
      <div className="wa-card-body">
        <FormActions>
          <PendingButton pending="Saving…" block>Save details</PendingButton>
        </FormActions>
      </div>
    </ConfigurationForm>
  );
}
