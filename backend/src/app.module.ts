import { Module, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './database/typeorm.config.js';
import { PersonModule } from './person/person.module.js';
import { APP_PIPE } from '@nestjs/core';
import { ExcursionModule } from './excursion/excursion.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    PersonModule,
    ExcursionModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
  ],
})
export class AppModule {}
