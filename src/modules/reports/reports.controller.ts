import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpCode,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../decorators/user.decorator';
import { ReportsService } from './reports.service';
import { DashboardStatisticsDto } from './dto/dashboard-statistics.dto';
import { MonthlyReportsResponseDto } from './dto/monthly-reports.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/role.decorator';
import { UserRole } from '../accounts/enums/user-role.enum';
import { ApiDoc } from '../../decorators/api-doc.decorator';
import { TransformInterceptor } from '../../interceptors/transform.interceptor';
import { RequireModule } from 'src/decorators/permission.decorator';
import { SystemModule } from '../permission/entities/role-permission.entity';

@ApiTags('Reports')
@RequireModule(SystemModule.REPORTING)
@Controller('reports')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly-reports')
  @UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Lấy báo cáo doanh thu 6 tháng gần nhất của cư dân',
    description:
      'Cư dân xem báo cáo doanh thu chi tiết theo tháng (6 tháng gần nhất có dữ liệu) với thông tin về điện, nước, phí quản lý, tổng doanh thu, số hóa đơn, hóa đơn đã thanh toán, công nợ của các căn hộ mà cư dân quản lý',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Báo cáo doanh thu 6 tháng',
    type: MonthlyReportsResponseDto,
  })
  async getMonthlyReports(@CurrentUser('id') accountId: number) {
    const reports =
      await this.reportsService.getMonthlyReportsByResident(accountId);
    return plainToInstance(MonthlyReportsResponseDto, reports, {
      excludeExtraneousValues: true,
    });
  }

  @Get('monthly-reports/export')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Xuất báo cáo doanh thu 6 tháng sang Excel',
    description:
      'Cư dân xuất báo cáo doanh thu 6 tháng gần nhất sang file XLSX',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File XLSX đã được tạo',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async exportMonthlyReportsToExcel(
    @CurrentUser('id') accountId: number,
  ): Promise<StreamableFile> {
    const buffer =
      await this.reportsService.exportMonthlyReportsToExcelByResident(
        accountId,
      );
    const filename = `monthly-reports-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new StreamableFile(buffer as Uint8Array, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get('dashboard/export')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: '[ADMIN] Xuất thống kê dashboard sang Excel',
    description:
      'Admin xuất dữ liệu thống kê dashboard sang file XLSX với đầy đủ các thông tin',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File XLSX đã được tạo',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async exportDashboardToExcel(
    @Query() queryDto: QueryReportDto,
  ): Promise<StreamableFile> {
    const buffer = await this.reportsService.exportDashboardToExcel(queryDto);
    const filename = `dashboard-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new StreamableFile(buffer as Uint8Array, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get('dashboard')
  @UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: '[ADMIN] Lấy thống kê tổng hợp dashboard',
    description:
      'Admin xem tổng hợp thống kê doanh thu, công nợ, bảo trì, biểu đồ doanh thu & chi phí, dịch vụ, tài sản',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thống kê tổng hợp',
    type: DashboardStatisticsDto,
  })
  async getDashboardStatistics(@Query() queryDto: QueryReportDto) {
    const statistics =
      await this.reportsService.getDashboardStatistics(queryDto);
    return plainToInstance(DashboardStatisticsDto, statistics);
  }
}
