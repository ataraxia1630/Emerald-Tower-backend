import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { QueryMetricsDto } from './dto/query-metrics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from '../accounts/enums/user-role.enum';

@ApiTags('Admin — System Metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get time-series metrics for charts (default: last 24h)',
  })
  getTimeSeries(@Query() dto: QueryMetricsDto) {
    return this.metricsService.getTimeSeries(dto);
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Get the most recent snapshot for each metric (for summary cards)',
  })
  getLatest() {
    return this.metricsService.getLatest();
  }
}
