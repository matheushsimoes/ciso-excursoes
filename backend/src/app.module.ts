import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './database/typeorm.config.js';
import { PersonModule } from './person/person.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    PersonModule
  ]
})
export class AppModule {}
