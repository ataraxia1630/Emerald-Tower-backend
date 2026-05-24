import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermission } from './entities/role-permission.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RolePermission])],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
