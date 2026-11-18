import { CorpField } from "@/components/corp/corp";
import { EARLIEST_EMPLOYMENT_DATE, type EmploymentDates } from "@/lib/employment-dates";

/** Optional hire, termination and birth dates inside Add employee and Edit employee (management only). Uncontrolled
 * inputs: the form's command builder reads them (employmentDatesFromForm) and the server applies the date rules.
 * The termination date is a record only; the Access and sign-in page keeps Deactivate. */
export function EmploymentDateFields({ idPrefix, value }: { idPrefix: string; value?: EmploymentDates }) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return <>
    <div className="c-field__row">
      <CorpField label="Hire date (optional)" htmlFor={id("hire")} help={<span id={id("hire-help")}>Christmas bonus hours use this date.</span>}>
        <input id={id("hire")} className="c-in" type="date" name="hireDate" defaultValue={value?.hireDate ?? ""} min={EARLIEST_EMPLOYMENT_DATE} aria-describedby={id("hire-help")} />
      </CorpField>
      <CorpField label="Termination date (optional)" htmlFor={id("termination")} help={<span id={id("termination-help")}>For your records only. It doesn’t deactivate anyone.</span>}>
        <input id={id("termination")} className="c-in" type="date" name="terminationDate" defaultValue={value?.terminationDate ?? ""} min={EARLIEST_EMPLOYMENT_DATE} aria-describedby={id("termination-help")} />
      </CorpField>
    </div>
    <CorpField label="Date of birth (optional)" htmlFor={id("birth")} help={<span id={id("birth-help")}>Private. Only Owners and Managers who can edit this profile see it.</span>}>
      <input id={id("birth")} className="c-in" type="date" name="birthDate" defaultValue={value?.birthDate ?? ""} min={EARLIEST_EMPLOYMENT_DATE} autoComplete="off" aria-describedby={id("birth-help")} />
    </CorpField>
  </>;
}
