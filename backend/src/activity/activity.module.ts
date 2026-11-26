import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExcursionModule } from '../excursion/excursion.module.js';
import { ParticipationModule } from '../participation/participation.module.js';
import { ActivityController } from './activity.controller.js';
import { ActivityRepository } from './activity.repository.js';
import { ActivityService } from './activity.service.js';
import {
  ActivityEntity,
  SupplierEntity,
  TicketPurchaseEntity,
  TicketSupplierPurchaseEntity,
  TicketTypeEntity,
} from './entities/activity.entities.js';
import { TypeOrmActivityRepository } from './typeorm-activity.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityEntity,
      TicketTypeEntity,
      TicketPurchaseEntity,
      SupplierEntity,
      TicketSupplierPurchaseEntity,
    ]),
    ExcursionModule,
    ParticipationModule,
  ],
  controllers: [ActivityController],
  providers: [ActivityService, { provide: ActivityRepository, useClass: TypeOrmActivityRepository }],
})
export class ActivityModule {}
