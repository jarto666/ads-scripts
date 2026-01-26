import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { PersonasModule } from './personas/personas.module';
import { BatchesModule } from './batches/batches.module';
import { ExportsModule } from './exports/exports.module';
import { AdminModule } from './admin/admin.module';
import { SettingsModule } from './settings/settings.module';
import { CreditsModule } from './credits/credits.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    PersonasModule,
    BatchesModule,
    ExportsModule,
    AdminModule,
    SettingsModule,
    CreditsModule,
    BillingModule,
  ],
})
export class AppModule {}
