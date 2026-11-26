import { nextVehicleNumbers, vehicleNumber } from './vehicle-numbering.js';

describe('vehicle numbering', () => {
  it('should start at 1 when the excursion has no vehicles', () => {
    expect(nextVehicleNumbers([], 2)).toEqual(['Ônibus 1', 'Ônibus 2']);
  });

  it('should continue after the existing vehicles', () => {
    expect(nextVehicleNumbers(['Ônibus 1', 'Ônibus 2'], 1)).toEqual(['Ônibus 3']);
  });

  it('should reuse gaps left by removed vehicles', () => {
    expect(nextVehicleNumbers(['Ônibus 1', 'Ônibus 3'], 2)).toEqual([
      'Ônibus 2',
      'Ônibus 4',
    ]);
  });

  it('should read the vehicle number', () => {
    expect(vehicleNumber('Ônibus 12')).toBe(12);
  });
});
