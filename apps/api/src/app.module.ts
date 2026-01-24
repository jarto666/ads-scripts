import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { PersonasModule } from './personas/personas.module';
import { BatchesModule } from './batches/batches.module';
import { ExportsModule } from './exports/exports.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    PersonasModule,
    BatchesModule,
    ExportsModule,
    AdminModule,
  ],
})
export class AppModule {}
