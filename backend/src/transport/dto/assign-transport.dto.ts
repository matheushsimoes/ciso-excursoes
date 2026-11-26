import { IsInt, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';

/**
 * Assigns (or clears) the vehicle and seat of a participation.
 * `excursionVehicleId: null` removes the transport (RN13).
 */
export class AssignTransportDto {
  @ValidateIf((dto: AssignTransportDto) => dto.excursionVehicleId !== null)
  @IsUUID()
  excursionVehicleId: string | null;

  @IsOptional()
  @ValidateIf((dto: AssignTransportDto) => dto.seatNumber !== null)
  @IsInt()
  @Min(1)
  seatNumber?: number | null;
}
