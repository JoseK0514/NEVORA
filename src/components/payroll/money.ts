import { statusCopy } from './copy/status';
export function formatPayrollMoney(minor: string, language: 'en' | 'es' = 'en') {
  if (!/^(0|[1-9]\d*)$/.test(minor)) throw new Error('Invalid payroll amount');
  const amount = BigInt(minor);
  const fraction = (amount % BigInt(100)).toString().padStart(2, '0');
  return new Intl.NumberFormat(language === 'es' ? 'es-PR' : 'en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).formatToParts(amount / BigInt(100)).map(part => part.type === 'fraction' ? fraction : part.value).join('');
}

export function dollarsToMinor(value: string, lang: 'en' | 'es' = 'en') {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error(statusCopy[lang].ui.amountInvalid);
  return (BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? '').padEnd(2, '0'))).toString();
}

export function minorToDollars(value: string) {
  if (!/^(0|[1-9]\d*)$/.test(value)) throw new Error('Invalid payroll amount');
  const amount = BigInt(value);
  return `${amount / BigInt(100)}.${(amount % BigInt(100)).toString().padStart(2, '0')}`;
}

export function formatPayrollRate(value: string) {
  if (!/^(0|[1-9]\d{0,8})(\.[0-9]{1,4})?$/.test(value)) throw Error('Invalid hourly wage');
  const [whole, sub = ''] = value.split('.');
  return formatPayrollMoney(whole) + sub;
}

/** A signed USD minor-unit difference ("+$12.50", "−$3.00", "$0.00"), for statement comparisons only. */
export function formatSignedPayrollMoney(minor: string, language: 'en' | 'es' = 'en') {
  if (!/^-?(0|[1-9]\d*)$/.test(minor) || minor === '-0') throw new Error('Invalid payroll amount');
  const negative = minor.startsWith('-'), size = negative ? minor.slice(1) : minor;
  return `${size === '0' ? '' : negative ? '\u2212' : '+'}${formatPayrollMoney(size, language)}`;
}
