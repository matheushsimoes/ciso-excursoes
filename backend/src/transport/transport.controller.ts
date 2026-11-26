import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import type { ParticipationView } from '../participation/domain/participation.js';
import type { BusType, SeatMap, TransportOverview } from './domain/transport.js';
import { AssignTransportDto } from './dto/assign-transport.dto.js';
import { CreateBusTypeDto, UpdateBusTypeDto } from './dto/bus-type.dto.js';
import { AddExcursionBusDto, UpdateExcursionBusDto } from './dto/excursion-bus.dto.js';
import { TransportService } from './transport.service.js';

@Controller()
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  @Post('bus-types')
  createBusType(@Body() dto: CreateBusTypeDto): Promise<BusType> {
    return this.transportService.createBusType(dto);
  }

  @Get('bus-types')
  listBusTypes(): Promise<BusType[]> {
    return this.transportService.listBusTypes();
  }

  @Get('bus-types/:id')
  findBusType(@Param('id', ParseUUIDPipe) id: string): Promise<BusType> {
    return this.transportService.findBusType(id);
  }

  @Patch('bus-types/:id')
  updateBusType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBusTypeDto,
  ): Promise<BusType> {
    return this.transportService.updateBusType(id, dto);
  }

  @Get('excursions/:excursionId/transport')
  overview(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
  ): Promise<TransportOverview> {
    return this.transportService.overview(excursionId);
  }

  @Post('excursions/:excursionId/buses')
  addExcursionBus(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
    @Body() dto: AddExcursionBusDto,
  ): Promise<TransportOverview> {
    return this.transportService.addExcursionBus(excursionId, dto);
  }

  @Patch('excursion-buses/:id')
  resizeExcursionBus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExcursionBusDto,
  ): Promise<TransportOverview> {
    return this.transportService.resizeExcursionBus(id, dto);
  }

  @Delete('excursion-buses/:id')
  removeExcursionBus(@Param('id', ParseUUIDPipe) id: string): Promise<TransportOverview> {
    return this.transportService.removeExcursionBus(id);
  }

  @Get('excursion-vehicles/:id/seats')
  seatMap(@Param('id', ParseUUIDPipe) id: string): Promise<SeatMap> {
    return this.transportService.seatMap(id);
  }

  @Patch('participations/:id/transport')
  assignTransport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTransportDto,
  ): Promise<ParticipationView> {
    return this.transportService.assignTransport(id, dto);
  }
}
