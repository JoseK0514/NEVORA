const PHONE_DIGITS = 10;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function toTenDigitPhone(value: string) {
  const digits = digitsOnly(value);

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits;
}

export function formatPhoneInput(value: string) {
  const rawDigits = digitsOnly(value);
  const digits =
    rawDigits.length === 11 && rawDigits.startsWith("1")
      ? rawDigits.slice(1)
      : rawDigits.slice(0, PHONE_DIGITS);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function normalizePhoneNumber(value: string) {
  const digits = toTenDigitPhone(value);

  if (digits.length !== PHONE_DIGITS) {
    return null;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatPhoneNumber(value: string) {
  return normalizePhoneNumber(value) ?? value;
}
