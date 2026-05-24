import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsModule } from '../permission/permissions.module';
import { PermissionsService } from '../permission/permissions.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from 'src/guards/auth.guard';
@Module({
  imports: [PermissionsModule, AuthModule],
  providers: [
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new AuthGuard(reflector),
      inject: [Reflector], // ← truyền Reflector vào
    },
    {
      provide: APP_GUARD,
      useFactory: (
        permissionsService: PermissionsService,
        reflector: Reflector,
      ) => new RolesGuard(reflector, permissionsService),
      inject: [PermissionsService, Reflector],
    },
  ],
  exports: [PermissionsModule],
})
export class SharedModule {}
