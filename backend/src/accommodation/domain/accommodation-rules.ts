import { BadRequestException, ConflictException } from '@nestjs/common';
import type { RoomInfo } from './accommodation.js';

/**
 * Rules for putting a participant in a room. Runs inside the transaction,
 * after the room row is locked (RN23, RN25).
 */
export function assertCanAssignRoom(
  participation: { excursionId: string; roomId: string | null },
  room: RoomInfo,
): void {
  if (room.excursionId !== participation.excursionId) {
    throw new BadRequestException('The room does not belong to this excursion');
  }
  if (participation.roomId !== room.id && room.occupied >= room.capacity) {
    throw new ConflictException(`Room ${room.identifier} is full (RN25)`);
  }
}
