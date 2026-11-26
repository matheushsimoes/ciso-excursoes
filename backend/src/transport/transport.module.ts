import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExcursionModule } from '../excursion/excursion.module.js';
import { ParticipationModule } from '../participation/participation.module.js';
import { BusTypeEntity } from './entities/bus-type.entity.js';
import { ExcursionBusEntity } from './entities/excursion-bus.entity.js';
import { ExcursionVehicleEntity } from './entities/excursion-vehicle.entity.js';
import { TransportController } from './transport.controller.js';
import { TransportRepository } from './transport.repository.js';
import { TransportService } from './transport.service.js';
import { TypeOrmTransportRepository } from './typeorm-transport.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusTypeEntity, ExcursionBusEntity, ExcursionVehicleEntity]),
    ExcursionModule,
    ParticipationModule,
  ],
  controllers: [TransportController],
  providers: [
    TransportService,
    { provide: TransportRepository, useClass: TypeOrmTransportRepository },
  ],
})
export class TransportModule {}
