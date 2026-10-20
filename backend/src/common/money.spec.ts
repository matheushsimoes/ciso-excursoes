import { normalizeMoney } from './money.js';;

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