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

import { ActivityService } from './activity.service.js';
import type {
  Activity,
  ActivityWithTickets,
  Supplier,
  SupplierPurchaseView,
  TicketDemandLine,
  TicketPurchaseView,
  TicketType,
} from './domain/activity.js';
import {
  CreateActivityDto,
  CreateSupplierDto,
  CreateSupplierPurchaseDto,
  CreateTicketPurchaseDto,
  CreateTicketTypeDto,
  UpdateActivityDto,
  UpdateSupplierDto,
  UpdateTicketTypeDto,
} from './dto/activity.dto.js';

@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('excursions/:excursionId/activities')
  createActivity(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
    @Body() dto: CreateActivityDto,
  ): Promise<Activity> {
    return this.activityService.createActivity(excursionId, dto);
  }

  @Get('excursions/:excursionId/activities')
  listActivities(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
  ): Promise<ActivityWithTickets[]> {
    return this.activityService.listActivities(excursionId);
  }

  @Patch('activities/:id')
  updateActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<Activity> {
    return this.activityService.updateActivity(id, dto);
  }

  @Post('activities/:id/ticket-types')
  createTicketType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTicketTypeDto,
  ): Promise<TicketType> {
    return this.activityService.createTicketType(id, dto);
  }

  @Patch('ticket-types/:id')
  updateTicketType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketTypeDto,
  ): Promise<TicketType> {
    return this.activityService.updateTicketType(id, dto);
  }

  @Post('participations/:id/ticket-purchases')
  createTicketPurchase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTicketPurchaseDto,
  ): Promise<TicketPurchaseView> {
    return this.activityService.createTicketPurchase(id, dto);
  }

  @Get('participations/:id/ticket-purchases')
  listTicketPurchases(@Param('id', ParseUUIDPipe) id: string): Promise<TicketPurchaseView[]> {
    return this.activityService.listTicketPurchases(id);
  }

  @Post('ticket-purchases/:id/confirm')
  @HttpCode(200)
  confirmTicketPurchase(@Param('id', ParseUUIDPipe) id: string): Promise<TicketPurchaseView> {
    return this.activityService.confirmTicketPurchase(id);
  }

  @Get('excursions/:excursionId/ticket-demand')
  ticketDemand(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
  ): Promise<TicketDemandLine[]> {
    return this.activityService.ticketDemand(excursionId);
  }

  @Post('suppliers')
  createSupplier(@Body() dto: CreateSupplierDto): Promise<Supplier> {
    return this.activityService.createSupplier(dto);
  }

  @Get('suppliers')
  listSuppliers(): Promise<Supplier[]> {
    return this.activityService.listSuppliers();
  }

  @Patch('suppliers/:id')
  updateSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<Supplier> {
    return this.activityService.updateSupplier(id, dto);
  }

  @Post('ticket-types/:id/supplier-purchases')
  createSupplierPurchase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSupplierPurchaseDto,
  ): Promise<SupplierPurchaseView[]> {
    return this.activityService.createSupplierPurchase(id, dto);
  }

  @Get('excursions/:excursionId/supplier-purchases')
  listSupplierPurchases(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
  ): Promise<SupplierPurchaseView[]> {
    return this.activityService.listSupplierPurchases(excursionId);
  }
}
