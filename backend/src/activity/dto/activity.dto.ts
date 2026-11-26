import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsBusinessDate } from '../../common/validation/is-business-date.js';
import { IsMoney } from '../../common/validation/is-money.js';
import { IsQuantity } from '../../common/validation/is-quantity.js';
import { TICKET_PURCHASE_STATUSES, type TicketPurchaseStatus } from '../domain/activity.js';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {}

export class CreateTicketTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsMoney()
  currentPrice: string;
}

export class UpdateTicketTypeDto extends PartialType(CreateTicketTypeDto) {}

export class CreateTicketPurchaseDto {
  @IsUUID()
  ticketTypeId: string;

  @IsQuantity(50)
  quantity: number;
}

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

export class CreateSupplierPurchaseDto {
  @IsUUID()
  supplierId: string;

  @IsQuantity(10000)
  quantity: number;

  @IsMoney()
  unitCost: string;

  @IsBusinessDate()
  purchaseDate: string;

  @IsOptional()
  @IsIn(TICKET_PURCHASE_STATUSES)
  status?: TicketPurchaseStatus;
}
