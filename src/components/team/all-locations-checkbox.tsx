"use client";

type Props = {
  lang: "en" | "es";
  ids: readonly string[];
  selected: readonly string[];
  disabled?: boolean;
  className: string;
  inputClassName?: string;
  onToggle: (checked: boolean, input: HTMLInputElement) => void;
};

/** An unnamed group control. Only the individual location IDs belong in a saved form. */
export function AllLocationsCheckbox({ lang, ids, selected, disabled, className, inputClassName, onToggle }: Props) {
  const picked = new Set(selected);
  const count = ids.filter(id => picked.has(id)).length;
  return <label className={className}>
    <input type="checkbox" className={inputClassName} checked={ids.length > 0 && count === ids.length}
      ref={input => { if (input) input.indeterminate = count > 0 && count < ids.length; }}
      disabled={disabled || !ids.length} onChange={event => onToggle(event.currentTarget.checked, event.currentTarget)} />
    <span>{lang === "es" ? "Todas" : "All"}</span>
  </label>;
}
