import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { IsMoney } from '../../common/validation/is-money.js';
import { IsQuantity } from '../../common/validation/is-quantity.js';

export class LinkHotelDto {
  @IsUUID()
  hotelId: string;
}

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  identifier: string;

  @IsQuantity(20)
  capacity: number;

  @IsMoney()
  cost: string;
}

export class UpdateRoomDto extends PartialType(CreateRoomDto) {}

/** `roomId: null` removes the participant from their room. */
export class AssignRoomDto {
  @ValidateIf((dto: AssignRoomDto) => dto.roomId !== null)
  @IsUUID()
  roomId: string | null;
}
