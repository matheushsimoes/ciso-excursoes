import { Module, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './database/typeorm.config.js';
import { PersonModule } from './person/person.module.js';
import { APP_PIPE } from '@nestjs/core';
import { ExcursionModule } from './excursion/excursion.module.js';
import { ParticipationModule } from './participation/participation.module.js';
import { TransportModule } from './transport/transport.module.js';
import { AccommodationModule } from './accommodation/accommodation.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { FinanceModule } from './finance/finance.module.js';
import { ReportModule } from './report/report.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    PersonModule,
    ExcursionModule,
    ParticipationModule,
    TransportModule,
    AccommodationModule,
    ActivityModule,
    FinanceModule,
    ReportModule,
    HealthModule,
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
