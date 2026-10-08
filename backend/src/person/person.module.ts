import { Module } from '@nestjs/common';

import { PersonController } from './person.controller.js';
import { PersonService } from './person.service.js';
import { PersonRepository } from './person.repository.js';
import { TypeOrmPersonRepository } from './typeorm-person.repository.js';
import { PersonEntity } from './entities/person.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([PersonEntity])],
  controllers: [PersonController],
  providers: [
    PersonService,
    {
      provide: PersonRepository,
      useClass: TypeOrmPersonRepository,
    },
  ],
})
export class PersonModule {}