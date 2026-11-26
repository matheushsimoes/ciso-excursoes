import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExcursionModule } from '../excursion/excursion.module.js';
import { PersonModule } from '../person/person.module.js';
import { ParticipationEntity } from './entities/participation.entity.js';
import { ParticipationController } from './participation.controller.js';
import { ParticipationRepository } from './participation.repository.js';
import { ParticipationService } from './participation.service.js';
import { TypeOrmParticipationRepository } from './typeorm-participation.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([ParticipationEntity]), ExcursionModule, PersonModule],
  controllers: [ParticipationController],
  providers: [
    ParticipationService,
    { provide: ParticipationRepository, useClass: TypeOrmParticipationRepository },
  ],
  exports: [ParticipationService],
})
export class ParticipationModule {}
