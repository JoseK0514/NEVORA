export function formatPayrollMoney(minor: string, language: 'en' | 'es' = 'en') {
  if (!/^(0|[1-9]\d*)$/.test(minor)) throw new Error('Invalid payroll amount');
  const amount = BigInt(minor);
  const fraction = (amount % BigInt(100)).toString().padStart(2, '0');
  return new Intl.NumberFormat(language === 'es' ? 'es-PR' : 'en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).formatToParts(amount / BigInt(100)).map(part => part.type === 'fraction' ? fraction : part.value).join('');
}

export function dollarsToMinor(value: string) {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error('Enter a nonnegative USD amount with up to two decimal places.');
  return (BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? '').padEnd(2, '0'))).toString();
}

export function minorToDollars(value: string) {
  if (!/^(0|[1-9]\d*)$/.test(value)) throw new Error('Invalid payroll amount');
  const amount = BigInt(value);
  return `${amount / BigInt(100)}.${(amount % BigInt(100)).toString().padStart(2, '0')}`;
}
