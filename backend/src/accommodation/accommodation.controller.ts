import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import type { ParticipationView } from '../participation/domain/participation.js';
import { AccommodationService } from './accommodation.service.js';
import type { AccommodationOverview, Hotel, Room } from './domain/accommodation.js';
import { CreateHotelDto, UpdateHotelDto } from './dto/hotel.dto.js';
import { AssignRoomDto, CreateRoomDto, LinkHotelDto, UpdateRoomDto } from './dto/room.dto.js';

@Controller()
export class AccommodationController {
  constructor(private readonly accommodationService: AccommodationService) {}

  @Post('hotels')
  createHotel(@Body() dto: CreateHotelDto): Promise<Hotel> {
    return this.accommodationService.createHotel(dto);
  }

  @Get('hotels')
  listHotels(): Promise<Hotel[]> {
    return this.accommodationService.listHotels();
  }

  @Get('hotels/:id')
  findHotel(@Param('id', ParseUUIDPipe) id: string): Promise<Hotel> {
    return this.accommodationService.findHotel(id);
  }

  @Patch('hotels/:id')
  updateHotel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHotelDto,
  ): Promise<Hotel> {
    return this.accommodationService.updateHotel(id, dto);
  }

  @Get('excursions/:excursionId/accommodation')
  overview(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
  ): Promise<AccommodationOverview> {
    return this.accommodationService.overview(excursionId);
  }

  @Post('excursions/:excursionId/hotels')
  linkHotel(
    @Param('excursionId', ParseUUIDPipe) excursionId: string,
    @Body() dto: LinkHotelDto,
  ): Promise<AccommodationOverview> {
    return this.accommodationService.linkHotel(excursionId, dto);
  }

  @Delete('excursion-hotels/:id')
  unlinkHotel(@Param('id', ParseUUIDPipe) id: string): Promise<AccommodationOverview> {
    return this.accommodationService.unlinkHotel(id);
  }

  @Post('excursion-hotels/:id/rooms')
  createRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRoomDto,
  ): Promise<Room> {
    return this.accommodationService.createRoom(id, dto);
  }

  @Patch('rooms/:id')
  updateRoom(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoomDto): Promise<Room> {
    return this.accommodationService.updateRoom(id, dto);
  }

  @Delete('rooms/:id')
  @HttpCode(204)
  deleteRoom(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.accommodationService.deleteRoom(id);
  }

  @Patch('participations/:id/room')
  assignRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoomDto,
  ): Promise<ParticipationView> {
    return this.accommodationService.assignRoom(id, dto);
  }
}
