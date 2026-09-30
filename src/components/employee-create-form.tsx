"use client";

import { useState } from "react";
import Link from "next/link";
import { NavIcon } from "@/components/nav-icon";
import { PhoneInput } from "@/components/phone-input";
import { createEmployeeAction } from "@/app/app/employees/actions";

type LocationOption = {
  id: string;
  name: string;
  shortName: string;
};

function generateEmployeeId() {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `FC-${suffix}`;
}

export function EmployeeCreateForm({
  locations,
  canCreateOwner,
}: {
  locations: LocationOption[];
  canCreateOwner: boolean;
}) {
  const [employeeId, setEmployeeId] = useState("FC-0021");
  const [primaryLocationId, setPrimaryLocationId] = useState(
    locations[0]?.id ?? "",
  );
  const [eligibleLocationIds, setEligibleLocationIds] = useState<string[]>([]);

  function toggleEligible(locationId: string) {
    if (locationId === primaryLocationId) return;

    setEligibleLocationIds((current) =>
      current.includes(locationId)
        ? current.filter((id) => id !== locationId)
        : [...current, locationId],
    );
  }

  return (
    <form action={createEmployeeAction} className="employee-create-form">
      <section className="employee-create-section">
        <div className="employee-create-section-heading">
          <span className="employee-create-heading-icon" aria-hidden="true">
            <NavIcon name="employees" size={21} />
          </span>
          <div>
            <h2>Employee information</h2>
            <p>Basic details for the employee profile.</p>
          </div>
        </div>

        <div className="employee-create-section-body employee-info-grid">
          <label className="employee-id-field">
            <span className="employee-field-label">
              Employee ID <b>*</b>
            </span>
            <span className="employee-id-input-row">
              <input
                name="id"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.currentTarget.value.toUpperCase())}
                placeholder="FC-0021"
                required
              />
              <button
                className="button secondary employee-generate-id"
                type="button"
                onClick={() => setEmployeeId(generateEmployeeId())}
              >
                <span aria-hidden="true">↻</span>
                Generate ID
              </button>
            </span>
            <small>Used to sign in and activate the account.</small>
          </label>

          <label>
            <span className="employee-field-label">
              Phone number <b>*</b>
            </span>
            <PhoneInput name="phone" required />
            <small>Format: 787-555-1234</small>
          </label>

          <label>
            <span className="employee-field-label">
              First name <b>*</b>
            </span>
            <input name="firstName" required />
          </label>

          <label>
            <span className="employee-field-label">
              Last name <b>*</b>
            </span>
            <input name="lastName" required />
          </label>

          <label className="employee-email-field">
            <span className="employee-field-label employee-field-label-split">
              <span>Email</span>
              <small>Optional</small>
            </span>
            <input name="email" type="email" placeholder="name@company.com" />
            <small>Used for notifications (optional).</small>
          </label>
        </div>
      </section>

      <section className="employee-create-section">
        <div className="employee-create-section-heading">
          <span className="employee-create-heading-icon" aria-hidden="true">
            <NavIcon name="location" size={21} />
          </span>
          <div>
            <h2>Role &amp; assignment</h2>
            <p>Set the employee’s role and location access.</p>
          </div>
        </div>

        <div className="employee-create-section-body">
          <div className="employee-role-location-grid">
            <label>
              <span className="employee-field-label">
                Role <b>*</b>
              </span>
              <select name="role" defaultValue="EMPLOYEE">
                {canCreateOwner ? <option value="OWNER">Owner</option> : null}
                <option value="MANAGER">Manager</option>
                <option value="LEAD">Lead</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </label>

            <label>
              <span className="employee-field-label">
                Primary location <b>*</b>
              </span>
              <select
                name="primaryLocationId"
                required
                value={primaryLocationId}
                onChange={(event) => {
                  const nextPrimary = event.currentTarget.value;
                  setPrimaryLocationId(nextPrimary);
                  setEligibleLocationIds((current) =>
                    current.filter((id) => id !== nextPrimary),
                  );
                }}
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.shortName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="employee-location-access">
            <div>
              <strong>Eligible locations</strong>
              <small>Select the locations this employee can be scheduled at.</small>
            </div>

            <div className="employee-location-options">
              {locations.map((location) => {
                const primary = location.id === primaryLocationId;
                const checked = primary || eligibleLocationIds.includes(location.id);

                return (
                  <label
                    className={
                      primary
                        ? "employee-location-option is-primary"
                        : checked
                          ? "employee-location-option is-selected"
                          : "employee-location-option"
                    }
                    key={location.id}
                  >
                    <input
                      type="checkbox"
                      name="eligibleLocationIds"
                      value={location.id}
                      checked={checked}
                      disabled={primary}
                      onChange={() => toggleEligible(location.id)}
                    />
                    <span className="employee-location-check" aria-hidden="true">
                      {checked ? "✓" : ""}
                    </span>
                    <strong>{location.shortName}</strong>
                    {primary ? <small>Primary</small> : null}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="employee-create-section employee-activation-section">
        <div className="employee-create-section-heading">
          <span className="employee-create-heading-icon" aria-hidden="true">
            <NavIcon name="settings" size={21} />
          </span>
          <div>
            <h2>Account activation</h2>
            <p>No password is needed now.</p>
          </div>
        </div>

        <div className="employee-activation-message">
          <span className="employee-activation-icon" aria-hidden="true">
            <NavIcon name="settings" size={18} />
          </span>
          <span>
            <strong>The employee will create their own password.</strong>
            <small>
              They will use their Employee ID and phone number from the Activate Account screen to set up their account.
            </small>
          </span>
        </div>
      </section>

      <div className="employee-create-savebar">
        <div className="employee-create-save-status">
          <span className="employee-create-save-icon" aria-hidden="true">
            <NavIcon name="coverage" size={20} />
          </span>
          <span>
            <strong>Employee profile ready to create</strong>
            <small>Review the information and click Create Employee.</small>
          </span>
        </div>
        <div className="employee-create-save-actions">
          <Link className="button secondary" href="/app/employees">
            Cancel
          </Link>
          <button className="button primary" type="submit">
            Create Employee
          </button>
        </div>
      </div>
    </form>
  );
}
