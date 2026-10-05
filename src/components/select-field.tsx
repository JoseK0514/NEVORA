"use client";

import {
  useId,
  type ChangeEventHandler,
  type ReactNode,
} from "react";

export type SelectFieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function SelectField({
  id,
  name,
  label,
  options,
  defaultValue,
  value,
  required,
  disabled,
  hint,
  onChange,
}: {
  id?: string;
  name: string;
  label: ReactNode;
  options: readonly SelectFieldOption[];
  defaultValue?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
}) {
  const generatedId = useId().replaceAll(":", "");
  const selectId = id ?? `nevora-select-${generatedId}`;
  const hintId = hint ? `${selectId}-hint` : undefined;

  return (
    <label className="nevora-field" htmlFor={selectId}>
      <span className="nevora-field-label">{label}</span>
      <span className="nevora-select-shell">
        <select
          id={selectId}
          className="nevora-select"
          name={name}
          {...(value === undefined ? { defaultValue } : { value })}
          required={required}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={onChange}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="nevora-select-chevron"
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="14"
          height="14"
        >
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      </span>
      {hint ? (
        <span id={hintId} className="nevora-field-hint">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
