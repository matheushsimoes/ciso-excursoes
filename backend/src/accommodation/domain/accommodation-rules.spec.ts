import { BadRequestException, ConflictException } from '@nestjs/common';
import { assertCanAssignRoom } from './accommodation-rules.js';

describe('assertCanAssignRoom', () => {
  const room = { id: 'room-1', identifier: '101', capacity: 2, excursionId: 'e-1', occupied: 1 };

  it('should allow a room with free places', () => {
    expect(() => assertCanAssignRoom({ excursionId: 'e-1', roomId: null }, room)).not.toThrow();
  });

  it('should reject a room from another excursion', () => {
    expect(() => assertCanAssignRoom({ excursionId: 'e-2', roomId: null }, room)).toThrow(
      BadRequestException,
    );
  });

  it('should reject a full room (RN25)', () => {
    expect(() =>
      assertCanAssignRoom({ excursionId: 'e-1', roomId: null }, { ...room, occupied: 2 }),
    ).toThrow(ConflictException);
  });

  it('should accept re-assigning the room the participant already has', () => {
    expect(() =>
      assertCanAssignRoom({ excursionId: 'e-1', roomId: 'room-1' }, { ...room, occupied: 2 }),
    ).not.toThrow();
  });
});
