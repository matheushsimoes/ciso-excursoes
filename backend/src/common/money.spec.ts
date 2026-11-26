import {
  fromCents,
  multiplyMoney,
  normalizeMoney,
  sumMoney,
  toCents,
} from './money.js';

describe('money', () => {
  describe('normalizeMoney', () => {
    it.each([
      ['1500', '1500.00'],
      ['1500.5', '1500.50'],
      ['1500.55', '1500.55'],
      ['0015.00', '15.00'],
      ['0.5', '0.50'],
    ])('should normalize %s to %s', (input, expected) => {
      expect(normalizeMoney(input)).toBe(expected);
    });
  });

  describe('toCents / fromCents', () => {
    it.each([
      ['0.00', 0, '0.00'],
      ['0.1', 10, '0.10'],
      ['1500.50', 150050, '1500.50'],
      ['-12.30', -1230, '-12.30'],
      ['9999999999.99', 999999999999, '9999999999.99'],
    ])('should convert %s to %i cents and back to %s', (value, cents, back) => {
      expect(toCents(value)).toBe(cents);
      expect(fromCents(cents)).toBe(back);
    });

    it('should reject non-integer cents', () => {
      expect(() => fromCents(1.5)).toThrow();
    });
  });

  describe('sumMoney', () => {
    it('should sum without floating-point errors', () => {
      // 0.1 + 0.2 === 0.30000000000000004 with number
      expect(sumMoney(['0.10', '0.20'])).toBe('0.30');
    });

    it('should return 0.00 for an empty list', () => {
      expect(sumMoney([])).toBe('0.00');
    });
  });

  describe('multiplyMoney', () => {
    it('should multiply by an integer quantity', () => {
      expect(multiplyMoney('33.33', 3)).toBe('99.99');
    });
  });
});
