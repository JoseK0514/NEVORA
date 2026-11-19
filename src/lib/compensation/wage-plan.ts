/* SCRUM-214 (Nov 19, 2026): the Owner's wage editor, browser side. Pure helpers only: money in exact decimal cents, the
 * rate in effect at a location, and the interval list a change produces. The server (POST /api/compensation/wages) owns
 * validation, revisions and history; nothing here rounds a rate or invents one. A location with no interval covering an
 * instant has no rate, which is never the same as an explicit "0". */

export type WageInterval = { id: string; effectiveFrom: string; effectiveTo: string | null; locationIds: string[]; hourlyRateMinor: string };
export type WageRevision = { revision: number; actorId: string; createdAt: string; reason: string; wages: WageInterval[] };

const MINOR = /^(0|[1-9][0-9]{0,8})(\.[0-9]{1,4})?$/;
const SCALE = BigInt(10_000);

/** Cents (decimal string, up to four fractional digits) as ten-thousandths of a cent. */
function units(minor: string): bigint {
  if (!MINOR.test(minor)) throw new RangeError("rate");
  const [whole, fraction = ""] = minor.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(4, "0"));
}

/** "18.25" or "$18.25" (dollars, up to six decimal places) as the contract's cents string ("1825"); null when it isn't
 * a non-negative amount. "0" stays "0": an explicit zero is a recorded rate. */
export function centsFromDollars(input: string): string | null {
  const value = input.trim().replace(/^\$\s*/, "").replace(/,/g, "");
  if (!/^(0|[1-9][0-9]{0,6})(\.[0-9]{0,6})?$/.test(value)) return null;
  const [whole, decimal = ""] = value.split(".");
  const digits = decimal.padEnd(6, "0");
  const cents = BigInt(whole) * BigInt(100) + BigInt(digits.slice(0, 2));
  const rest = digits.slice(2).replace(/0+$/, "");
  const minor = cents.toString() + (rest ? `.${rest}` : "");
  return MINOR.test(minor) ? minor : null;
}

/** The rate as dollars for an input field ("18.25", "0", "18.255"). */
export function dollarsFromCents(minor: string): string {
  const value = units(minor), dollars = value / BigInt(1_000_000), rest = (value % BigInt(1_000_000)).toString().padStart(6, "0").replace(/0+$/, "");
  return rest ? `${dollars}.${rest.length < 2 ? rest.padEnd(2, "0") : rest}` : dollars.toString();
}

/** Exact money for display: "$18.25", "$0.00", "$18.255", "$1,240.00". Never rounded. */
export function moneyText(minor: string, locale: "en-US" | "es-PR" = "en-US"): string {
  const negative = minor.startsWith("-"), value = units(negative ? minor.slice(1) : minor);
  const dollars = value / BigInt(1_000_000), fraction = (value % BigInt(1_000_000)).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
  const whole = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(dollars);
  // Intl keeps the symbol and grouping; the fraction is appended exactly.
  const text = whole.replace(/(\d)(?!.*\d)/, `$1.${fraction}`);
  return negative ? `-${text}` : text;
}

const at = (instant: string) => Date.parse(instant);
const covers = (w: WageInterval, instant: number) => at(w.effectiveFrom) <= instant && (w.effectiveTo === null || instant < at(w.effectiveTo));

/** The interval in effect at a location now, and the next one that starts later (a scheduled raise or end). */
export function rateAt(wages: WageInterval[], locationId: string, now: Date) {
  const time = now.getTime();
  const here = wages.filter(w => w.locationIds.includes(locationId)).sort((a, b) => at(a.effectiveFrom) - at(b.effectiveFrom));
  const current = here.find(w => covers(w, time)) ?? null;
  const next = here.find(w => at(w.effectiveFrom) > time) ?? null;
  // A covered interval that ends later with nothing after it: the end itself is the next change.
  const endsAt = current?.effectiveTo && !(next && at(next.effectiveFrom) === at(current.effectiveTo)) ? current.effectiveTo : null;
  return { current, next, endsAt };
}

export type RateChange = { locationIds: string[]; from: string; hourlyRateMinor: string | null; id: string };

/** The whole interval list after one change: from `from` on, the chosen locations pay `hourlyRateMinor` (open-ended), or
 * have no rate when it is null. Earlier intervals stay as they were up to `from`; an interval shared with other locations
 * is split so those keep their rate. A rate that was set to start later at a chosen location is replaced. Ids are kept
 * where an interval survives, so unchanged terms stay unchanged on the server. */
export function planRate(wages: WageInterval[], change: RateChange, newId: () => string): WageInterval[] {
  const chosen = new Set(change.locationIds), from = at(change.from);
  const out: WageInterval[] = [];
  for (const w of wages) {
    const shared = w.locationIds.filter(id => chosen.has(id)), rest = w.locationIds.filter(id => !chosen.has(id));
    const start = at(w.effectiveFrom), end = w.effectiveTo === null ? Infinity : at(w.effectiveTo);
    if (!shared.length || end <= from) { out.push(w); continue; }
    if (start >= from) {
      // Wholly after the change: the chosen locations lose it, the others keep it.
      if (rest.length) out.push({ ...w, locationIds: rest });
      continue;
    }
    // Running at `from`: it ends there for the chosen locations; the others carry on with a continuation.
    out.push({ ...w, effectiveTo: change.from });
    if (rest.length) out.push({ ...w, id: newId(), effectiveFrom: change.from, locationIds: rest });
  }
  if (change.hourlyRateMinor !== null) out.push({ id: change.id, effectiveFrom: change.from, effectiveTo: null, locationIds: [...change.locationIds].sort(), hourlyRateMinor: change.hourlyRateMinor });
  return out.sort((a, b) => at(a.effectiveFrom) - at(b.effectiveFrom) || a.id.localeCompare(b.id));
}

/** For the review step: the rate a location had at `from` before the change ("missing" when none). */
export function rateBefore(wages: WageInterval[], locationId: string, from: string): string | null {
  const time = at(from);
  return wages.find(w => w.locationIds.includes(locationId) && covers(w, time))?.hourlyRateMinor ?? null;
}

/** Locations in the workspace with no rate now (the missing-wage coverage the cost preview reports). */
export function uncovered(wages: WageInterval[], locationIds: string[], now: Date) {
  return locationIds.filter(id => !rateAt(wages, id, now).current);
}
