import { Module } from '@nestjs/common';

import { ExcursionController } from './excursion.controller.js';
import { ExcursionService } from './excursion.service.js';
import { ExcursionRepository } from './excursion.repository.js';
import { TypeOrmExcursionRepository } from './typeorm-excursion.repository.js';
import { ExcursionEntity } from './entities/excursion.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([ExcursionEntity])],
  controllers: [ExcursionController],
  providers: [
    ExcursionService,
    {
      provide: ExcursionRepository,
      useClass: TypeOrmExcursionRepository,
    },
  ],
})
export class ExcursionModule {}
