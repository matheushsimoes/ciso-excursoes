import { canTransition, isFinalStatus } from './excursion-status.js';
import type { ExcursionStatus } from './excursion.js';

type Transition = [ExcursionStatus, ExcursionStatus];

describe('Excursion status', () => {
  describe('canTransition', () => {
    it.each<Transition>([
      ['DRAFT', 'OPEN'],
      ['DRAFT', 'CANCELLED'],
      ['OPEN', 'CONFIRMED'],
      ['OPEN', 'CANCELLED'],
      ['CONFIRMED', 'IN_PROGRESS'],
      ['CONFIRMED', 'CANCELLED'],
      ['IN_PROGRESS', 'FINISHED'],
    ])('should allow %s -> %s', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    });

    it.each<Transition>([
      ['DRAFT', 'CONFIRMED'],
      ['DRAFT', 'FINISHED'],
      ['OPEN', 'DRAFT'],
      ['OPEN', 'IN_PROGRESS'],
      ['CONFIRMED', 'FINISHED'],
      ['IN_PROGRESS', 'CANCELLED'],
      ['FINISHED', 'DRAFT'],
      ['FINISHED', 'OPEN'],
      ['CANCELLED', 'DRAFT'],
      ['CANCELLED', 'OPEN'],
    ])('should not allow %s -> %s', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
    });
  });

  describe('isFinalStatus', () => {
    it.each<ExcursionStatus>(['FINISHED', 'CANCELLED'])(
      'should consider %s a final status',
      (status) => {
        expect(isFinalStatus(status)).toBe(true);
      },
    );

    it.each<ExcursionStatus>(['DRAFT', 'OPEN', 'CONFIRMED', 'IN_PROGRESS'])(
      'should not consider %s a final status',
      (status) => {
        expect(isFinalStatus(status)).toBe(false);
      },
    );
  });
});
