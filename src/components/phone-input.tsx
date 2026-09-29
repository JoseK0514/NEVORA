"use client";

import { useState } from "react";
import { formatPhoneInput } from "@/lib/phone";

type PhoneInputProps = {
  name: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
};

export function PhoneInput({
  name,
  required = false,
  autoComplete,
  defaultValue = "",
}: PhoneInputProps) {
  const [value, setValue] = useState(() => formatPhoneInput(defaultValue));

  return (
    <input
      name={name}
      inputMode="tel"
      autoComplete={autoComplete}
      value={value}
      onChange={(event) => setValue(formatPhoneInput(event.target.value))}
      placeholder="787-555-1234"
      maxLength={12}
      pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
      required={required}
    />
  );
}
