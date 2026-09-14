/**
 * Exact rational arithmetic.
 *
 * Dimension inputs are decimals in tenths, so every quantity in the geometry
 * model that is not a radical or a multiple of π is exactly representable as a
 * ratio of integers. Keeping them exact means an "exact result" really is one:
 * no rounded float ever gets labelled as exact.
 */
export interface Rational {
  /** Numerator, carrying the sign. */
  readonly n: bigint;
  /** Denominator, always positive, always coprime with the numerator. */
  readonly d: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x;
}

export function rational(
  n: bigint | number,
  d: bigint | number = 1n,
): Rational {
  let num = BigInt(n);
  let den = BigInt(d);
  if (den === 0n) throw new Error("Rational denominator must not be zero");
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const divisor = gcd(num, den);
  if (divisor === 0n) return { n: 0n, d: 1n };
  return { n: num / divisor, d: den / divisor };
}

export const ZERO: Rational = { n: 0n, d: 1n };
export const ONE: Rational = { n: 1n, d: 1n };

/** Convert a tenths-precision decimal (the only input precision we accept). */
export function fromTenths(value: number): Rational {
  if (!Number.isFinite(value)) throw new Error("Dimension must be finite");
  return rational(BigInt(Math.round(value * 10)), 10n);
}

export function add(a: Rational, b: Rational): Rational {
  return rational(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function mul(a: Rational, b: Rational): Rational {
  return rational(a.n * b.n, a.d * b.d);
}

export function div(a: Rational, b: Rational): Rational {
  if (b.n === 0n) throw new Error("Rational division by zero");
  return rational(a.n * b.d, a.d * b.n);
}

export function pow(a: Rational, exponent: number): Rational {
  let result = ONE;
  for (let i = 0; i < exponent; i += 1) result = mul(result, a);
  return result;
}

export function equals(a: Rational, b: Rational): boolean {
  return a.n === b.n && a.d === b.d;
}

export function isZero(a: Rational): boolean {
  return a.n === 0n;
}

export function isOne(a: Rational): boolean {
  return a.n === 1n && a.d === 1n;
}

export function toNumber(a: Rational): number {
  return Number(a.n) / Number(a.d);
}

/**
 * Exact decimal text, or null when the denominator is not 10-smooth and the
 * value therefore has no terminating decimal form (for example 1/3).
 */
export function toDecimalString(a: Rational): string | null {
  let den = a.d;
  let twos = 0;
  let fives = 0;
  while (den % 2n === 0n) {
    den /= 2n;
    twos += 1;
  }
  while (den % 5n === 0n) {
    den /= 5n;
    fives += 1;
  }
  if (den !== 1n) return null;

  const places = Math.max(twos, fives);
  const scaled = (a.n * 10n ** BigInt(places)) / a.d;
  const negative = scaled < 0n;
  const digits = (negative ? -scaled : scaled)
    .toString()
    .padStart(places + 1, "0");
  const whole = digits.slice(0, digits.length - places);
  const fraction =
    places === 0 ? "" : digits.slice(digits.length - places).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

/** Human-readable exact text: a terminating decimal when possible, else a fraction. */
export function toExactString(a: Rational): string {
  return toDecimalString(a) ?? `${a.n}/${a.d}`;
}
