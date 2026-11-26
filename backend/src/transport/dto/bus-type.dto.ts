import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsQuantity } from '../../common/validation/is-quantity.js';

export class CreateBusTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsQuantity(200)
  capacity: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateBusTypeDto extends PartialType(CreateBusTypeDto) {}
