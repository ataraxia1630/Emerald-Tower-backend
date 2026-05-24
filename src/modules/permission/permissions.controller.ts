import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { PermissionsService } from './permissions.service';
import {
  UpdatePermissionEntryDto,
  BulkUpdatePermissionsDto,
} from './dto/update-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from '../accounts/enums/user-role.enum';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { Public } from 'src/decorators/permission.decorator';

@ApiTags('Role-Permission Matrix')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseInterceptors(TransformInterceptor)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('matrix')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy toàn bộ Role-Permission Matrix (UC38)',
    description:
      'Trả về nested object: { role: { module: { canView, canCreate, ... } } }',
  })
  @ApiResponse({ status: 200, description: 'Matrix retrieved successfully' })
  getMatrix() {
    return this.permissionsService.getMatrix();
  }

  @Put('matrix/entry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật permissions cho 1 cặp role + module (UC38)',
    description: 'Chỉ field nào được gửi mới bị ghi đè.',
  })
  @ApiResponse({ status: 200, description: 'Permission entry updated' })
  updateOne(@Body() dto: UpdatePermissionEntryDto) {
    return this.permissionsService.updateOne(dto);
  }

  @Put('matrix/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk update toàn bộ matrix (UC38)',
    description: 'Upsert nhiều cặp role + module cùng lúc.',
  })
  @ApiResponse({ status: 200, description: 'Bulk update completed' })
  bulkUpdate(@Body() dto: BulkUpdatePermissionsDto) {
    return this.permissionsService.bulkUpdate(dto);
  }

  @Post('matrix/seed')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Seed default matrix theo BRD Security Matrix',
    description:
      'Safe to run nhiều lần (upsert). Dùng khi deploy lần đầu hoặc reset về mặc định.',
  })
  @ApiResponse({ status: 201, description: 'Default matrix seeded' })
  seedDefault() {
    return this.permissionsService.seedDefaultMatrix();
  }
}
