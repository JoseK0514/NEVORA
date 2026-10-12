export type Rational = {
    numerator: bigint;
    denominator: bigint;
};
function gcd(a: bigint, b: bigint): bigint { while (b !== BigInt(0))
    [a, b] = [b, a % b]; return a < BigInt(0) ? -a : a; }
export function ratio(numerator: bigint, denominator = BigInt(1)): Rational {
    if (denominator <= BigInt(0))
        throw Error("INVALID_NATIVE_MONEY");
    const factor = gcd(numerator, denominator) || BigInt(1);
    return { numerator: numerator / factor, denominator: denominator / factor };
}
export const add = (a: Rational, b: Rational) => ratio(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
export const multiply = (a: Rational, b: Rational) => ratio(a.numerator * b.numerator, a.denominator * b.denominator);
export const subtract = (a: Rational, b: Rational) => add(a, ratio(-b.numerator, b.denominator));
export function halfUp(a: Rational): bigint {
    if (a.numerator < BigInt(0))
        throw Error("INVALID_NATIVE_MONEY");
    return (a.numerator * BigInt(2) + a.denominator) / (a.denominator * BigInt(2));
}
export function minor(v: unknown): bigint {
    if (typeof v !== "string" || !/^(0|[1-9][0-9]{0,14})$/.test(v))
        throw Error("INVALID_NATIVE_MONEY");
    return BigInt(v);
}
export function hourlyRate(v: unknown): Rational {
    if (typeof v !== "string" || !/^(0|[1-9][0-9]{0,8})(\.[0-9]{1,4})?$/.test(v))
        throw Error("INVALID_WAGE_RATE");
    const [whole, decimal = ""] = v.split("."), divisor = BigInt(10) ** BigInt(decimal.length);
    const r = ratio(BigInt(whole) * divisor + BigInt(decimal || "0"), divisor);
    if (r.numerator <= BigInt(0))
        throw Error("INVALID_WAGE_RATE");
    return r;
}
export const serialized = (r: Rational) => ({ numerator: r.numerator.toString(), denominator: r.denominator.toString() });
