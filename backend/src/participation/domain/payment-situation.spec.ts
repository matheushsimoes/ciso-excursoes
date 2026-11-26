import { paymentSituation } from './payment-situation.js';

describe('paymentSituation', () => {
  it('should be COURTESY when the passenger travels for free', () => {
    expect(paymentSituation(0, 0, 0)).toBe('COURTESY');
  });

  it('should be PAID when nothing is owed', () => {
    expect(paymentSituation(150000, 0, 150000)).toBe('PAID');
  });

  it('should be PARTIAL when something was paid', () => {
    expect(paymentSituation(150000, 50000, 100000)).toBe('PARTIAL');
  });

  it('should be PENDING when nothing was paid', () => {
    expect(paymentSituation(150000, 150000, 0)).toBe('PENDING');
  });
});
