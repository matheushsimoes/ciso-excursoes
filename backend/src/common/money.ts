/**
 * Money helpers (ADR 0003).
 *
 * Monetary values travel as decimal strings ("1500.00"). Arithmetic is done in
 * integer cents so that sums and balances never suffer from floating-point
 * rounding errors.
 */

/**
 * Normalizes an already validated money string (@IsMoney) to two decimal places.
 * Ex.: '1500' → '1500.00', '1500.5' → '1500.50', '0015.00' → '15.00'.
 */
export function normalizeMoney(value: string): string {
  const [integerPart, decimalPart = ''] = value.split('.');
  const integer = integerPart.replace(/^0+(?=\d)/, '');
  return `${integer}.${decimalPart.padEnd(2, '0')}`;
}

/** Converts a money string ("1500.50", "-12.3") to integer cents (150050, -1230). */
export function toCents(value: string): number {
  const trimmed = value.trim();
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [integerPart, decimalPart = ''] = unsigned.split('.');
  const cents =
    Number(integerPart || '0') * 100 +
    Number(decimalPart.padEnd(2, '0').slice(0, 2));
  return negative ? -cents : cents;
}

/** Converts integer cents back to a money string with two decimal places. */
export function fromCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`Cents must be an integer, received ${cents}`);
  }
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const integer = Math.trunc(absolute / 100);
  const decimal = String(absolute % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${integer}.${decimal}`;
}

/** Sums money strings exactly. */
export function sumMoney(values: string[]): string {
  return fromCents(values.reduce((total, value) => total + toCents(value), 0));
}

/** Multiplies a money string by an integer quantity exactly. */
export function multiplyMoney(value: string, quantity: number): string {
  return fromCents(toCents(value) * quantity);
}
