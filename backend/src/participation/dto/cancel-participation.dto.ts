import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelParticipationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
