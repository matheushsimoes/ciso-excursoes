import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExcursionModule } from '../excursion/excursion.module.js';
import { ParticipationModule } from '../participation/participation.module.js';
import { AccommodationController } from './accommodation.controller.js';
import { AccommodationRepository } from './accommodation.repository.js';
import { AccommodationService } from './accommodation.service.js';
import { ExcursionHotelEntity } from './entities/excursion-hotel.entity.js';
import { HotelEntity } from './entities/hotel.entity.js';
import { RoomEntity } from './entities/room.entity.js';
import { TypeOrmAccommodationRepository } from './typeorm-accommodation.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([HotelEntity, ExcursionHotelEntity, RoomEntity]),
    ExcursionModule,
    ParticipationModule,
  ],
  controllers: [AccommodationController],
  providers: [
    AccommodationService,
    { provide: AccommodationRepository, useClass: TypeOrmAccommodationRepository },
  ],
})
export class AccommodationModule {}
