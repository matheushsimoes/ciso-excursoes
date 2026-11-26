import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExcursionModule } from '../excursion/excursion.module.js';
import { ExpenseEntity, PaymentEntity, RefundEntity } from './entities/finance.entities.js';
import { FinanceController } from './finance.controller.js';
import { FinanceRepository } from './finance.repository.js';
import { FinanceService } from './finance.service.js';
import { TypeOrmFinanceRepository } from './typeorm-finance.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity, RefundEntity, ExpenseEntity]),
    ExcursionModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService, { provide: FinanceRepository, useClass: TypeOrmFinanceRepository }],
})
export class FinanceModule {}
