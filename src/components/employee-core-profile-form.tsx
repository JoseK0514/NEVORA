import { ConfigurationForm, type ConfigurationResult } from "@/components/configuration-form";
import { PhoneInput } from "@/components/phone-input";
import { SelectField } from "@/components/select-field";
import type { EmployeeManagementProfile } from "@/lib/data/employees";
import type { Location, UserRole } from "@/lib/domain";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";

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
    <ConfigurationForm action={action} reviewedUpdatedAt={employee.updatedAt} className="employee-form employee-core-profile-form">
      <input type="hidden" name="employeeId" value={employee.id} />

      <div className="employee-core-id">
        <span>Employee ID</span>
        <strong>{employee.id}</strong>
        <small>Employee IDs remain stable after creation.</small>
      </div>

      <div className="form-columns">
        <label>
          First name
          <input name="firstName" defaultValue={employee.firstName} required maxLength={160} />
        </label>
        <label>
          Last name
          <input name="lastName" defaultValue={employee.lastName} required maxLength={160} />
        </label>
      </div>

      <div className="form-columns">
        <label>
          Phone number
          <PhoneInput
            name="phone"
            defaultValue={employee.phone}
            autoComplete="tel"
            required
          />
        </label>
        <label>
          <span className="employee-email-label">Email <small>Optional</small></span>
          <input
            name="email"
            type="email"
            defaultValue={employee.email ?? ""}
            autoComplete="email"
            maxLength={254}
          />
        </label>
      </div>

      <div className="form-columns">
        <SelectField
          name="role"
          label="Access role"
          defaultValue={employee.role}
          options={roleOptions}
          required
        />
        <SelectField
          name="primaryLocationId"
          label="Primary location"
          defaultValue={employee.primaryLocationId}
          options={locationOptions}
          hint={
            locations.find((location) => location.id === employee.primaryLocationId)
              ?.active
              ? undefined
              : "Choose an active primary location before reactivating this employee."
          }
          required
        />
      </div>

      <SelectField
        name="active"
        label="Employee status"
        defaultValue={String(employee.active)}
        options={[
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive" },
        ]}
        hint="Deactivation signs this employee out immediately. Reactivation requires a fresh sign-in. History is preserved."
        required
      />

      <div className="form-footer">
        <button className="button primary" type="submit">
          <CheckIcon size={18} aria-hidden="true" focusable="false" /> Save employee details
        </button>
      </div>
    </ConfigurationForm>
  );
}
