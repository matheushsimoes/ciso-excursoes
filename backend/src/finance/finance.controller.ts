import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import type {
  Expense,
  FinancialSummary,
  ParticipationStatement,
  PaymentView,
} from './domain/finance.js';
import {
  CreateExpenseDto,
  CreatePaymentDto,
  CreateRefundDto,
  UpdateExpenseDto,
} from './dto/finance.dto.js';
import { FinanceService } from './finance.service.js';

@Controller()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  /** 201 for a new payment; 200 + Idempotent-Replayed when a retry is detected. */
  @Post('payments')
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PaymentView> {
    const { payment, replayed } = await this.financeService.createPayment(dto, idempotencyKey);
    if (replayed) {
      response.status(HttpStatus.OK).setHeader('Idempotent-Replayed', 'true');
    }
    return payment;
  }

  @Get('payments/:id')
  findPayment(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentView> {
    return this.financeService.findPayment(id);
  }

  @Post('payments/:id/refunds')
  createRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRefundDto,
  ): Promise<PaymentView> {
    return this.financeService.createRefund(id, dto);
  }

  @Get('participations/:id/statement')
  statement(@Param('id', ParseUUIDPipe) id: string): Promise<ParticipationStatement> {
    return this.financeService.statement(id);
  }

  @Post('excursions/:excursionId/expenses')
  createExpense(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
    @Body() dto: CreateExpenseDto,
  ): Promise<Expense> {
    return this.financeService.createExpense(excursionId, dto);
  }

  @Get('excursions/:excursionId/expenses')
  listExpenses(@Param('excursionId', ParseUUIDPipe) excursionId: string): Promise<Expense[]> {
    return this.financeService.listExpenses(excursionId);
  }

  @Patch('expenses/:id')
  updateExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<Expense> {
    return this.financeService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  @HttpCode(204)
  deleteExpense(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.financeService.deleteExpense(id);
  }

  @Get('excursions/:excursionId/financial-summary')
  summary(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
  ): Promise<FinancialSummary> {
    return this.financeService.summary(excursionId);
  }
}
