import { Controller, Get, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { Dashboard, PassengerLine, ReportService } from './report.service.js';

@Controller()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('dashboard')
  dashboard(): Promise<Dashboard> {
    return this.reportService.dashboard();
  }

  /** JSON by default; `?format=csv` downloads a spreadsheet (insurance export). */
  @Get('excursions/:excursionId/reports/passengers')
  async passengers(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PassengerLine[] | string> {
    if (format === 'csv') {
      const { filename, content } = await this.reportService.passengersCsv(excursionId);
      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
      response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return content;
    }
    return this.reportService.passengers(excursionId);
  }
}
