export function normalizeMoney(value: string): string {
  const [integerPart, decimalPart = ''] = value.split('.');
  const integer = integerPart.replace(/^0+(?=\d)/, '');
  return `${integer}.${decimalPart.padEnd(2, '0')}`;
}
