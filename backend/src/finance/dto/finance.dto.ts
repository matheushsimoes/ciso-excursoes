import { PartialType } from '@nestjs/mapped-types';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsBusinessDate } from '../../common/validation/is-business-date.js';
import { IsMoney } from '../../common/validation/is-money.js';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type ExpenseCategory,
  type PaymentMethod,
} from '../domain/finance.js';

/** Exactly one of participationId / ticketPurchaseId must be sent (RN39). */
export class CreatePaymentDto {
  @ValidateIf((dto: CreatePaymentDto) => dto.ticketPurchaseId === undefined)
  @IsUUID()
  participationId?: string;

  @ValidateIf((dto: CreatePaymentDto) => dto.participationId === undefined)
  @IsUUID()
  ticketPurchaseId?: string;

  @IsMoney()
  amount: string;

  @IsBusinessDate()
  paymentDate: string;

  @IsIn(PAYMENT_METHODS)
  method: PaymentMethod;
}

export class CreateRefundDto {
  @IsMoney()
  amount: string;

  @IsBusinessDate()
  refundDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @IsIn(EXPENSE_CATEGORIES)
  category: ExpenseCategory;

  @IsMoney()
  amount: string;

  @IsBusinessDate()
  expenseDate: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
