import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from '../accounts/enums/user-role.enum';
import { RequireModule } from 'src/decorators/permission.decorator';
import { SystemModule } from '../permission/entities/role-permission.entity';

@ApiTags('Admin — Audit Log')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN)
@RequireModule(SystemModule.SYSTEM_ADMIN)
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Query audit log with filters and pagination' })
  async findAll(@Query() dto: QueryAuditLogDto) {
    return this.auditService.findAll(dto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit log as CSV' })
  async export(@Query() dto: QueryAuditLogDto, @Res() res: Response) {
    const csv = await this.auditService.exportCsv(dto);
    const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
