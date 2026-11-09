import type { Location } from "@/lib/domain";
export function LocationConfigurationFields({
  location,
}: {
  location?: Location;
}) {
  return (
    <>
      <label>
        Location name
        <input
          name="name"
          defaultValue={location?.name}
          required
          maxLength={160}
        />
      </label>
      <label>
        Short name
        <input
          name="shortName"
          defaultValue={location?.shortName}
          required
          maxLength={48}
        />
      </label>
      {location ? (
        <>
          <input type="hidden" name="id" value={location.id} />
          <label className="checkbox-row">
            <input
              name="active"
              type="checkbox"
              defaultChecked={location.active}
            />
            Active location
          </label>
          <p className="form-help">
            Deactivation preserves history and eligibility. Future assignments
            require an active location.
          </p>
        </>
      ) : (
        <label>
          Clocker key <span>Optional</span>
          <input
            name="clockerKey"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={64}
          />
          <span>A stable URL-safe key is generated when left blank.</span>
        </label>
      )}
    </>
  );
}
