import { Module } from '@nestjs/common';

import { ExcursionModule } from '../excursion/excursion.module.js';
import { ReportController } from './report.controller.js';
import { ReportService } from './report.service.js';

@Module({
  imports: [ExcursionModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
