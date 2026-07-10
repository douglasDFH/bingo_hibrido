import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BannersModule } from './banners/banners.module';
import { CartonesModule } from './cartones/cartones.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GruposModule } from './grupos/grupos.module';
import { HealthController } from './health.controller';
import { PermisosModule } from './permisos/permisos.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    PrismaModule,
    StorageModule,
    PermisosModule,
    AuthModule,
    UsersModule,
    GruposModule,
    BannersModule,
    CartonesModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
