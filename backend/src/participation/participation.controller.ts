import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import type { ParticipationView } from './domain/participation.js';
import { CancelParticipationDto } from './dto/cancel-participation.dto.js';
import { CreateParticipationDto } from './dto/create-participation.dto.js';
import { ReplaceParticipationDto } from './dto/replace-participation.dto.js';
import { UpdateContractedAmountDto } from './dto/update-contracted-amount.dto.js';
import { ParticipationService } from './participation.service.js';

@Controller()
export class ParticipationController {
  constructor(private readonly participationService: ParticipationService) {}

  @Post('excursions/:excursionId/participations')
  create(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
    @Body() dto: CreateParticipationDto,
  ): Promise<ParticipationView> {
    return this.participationService.create(excursionId, dto);
  }

  @Get('excursions/:excursionId/participations')
  listByExcursion(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
  ): Promise<ParticipationView[]> {
    return this.participationService.listByExcursion(excursionId);
  }

  @Get('persons/:personId/participations')
  listByPerson(
    @Param('personId', ParseUUIDPipe) personId: string,
  ): Promise<ParticipationView[]> {
    return this.participationService.listByPerson(personId);
  }

  @Get('participations/:id')
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<ParticipationView> {
    return this.participationService.findView(id);
  }

  @Patch('participations/:id/contracted-amount')
  updateContractedAmount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractedAmountDto,
  ): Promise<ParticipationView> {
    return this.participationService.updateContractedAmount(id, dto);
  }

  @Post('participations/:id/cancel')
  @HttpCode(200)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelParticipationDto,
  ): Promise<ParticipationView> {
    return this.participationService.cancel(id, dto);
  }

  @Post('participations/:id/replace')
  replace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceParticipationDto,
  ): Promise<ParticipationView> {
    return this.participationService.replace(id, dto);
  }
}
