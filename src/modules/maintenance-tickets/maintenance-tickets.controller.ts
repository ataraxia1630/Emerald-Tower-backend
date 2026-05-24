import { Multer } from 'multer';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MaintenanceTicketsService } from './maintenance-tickets.service';
import { CreateIncidentMaintenanceTicketDto } from './dtos/create-incident-maintenance-ticket.dto';
import { CreateScheduledMaintenanceTicketDto } from './dtos/create-scheduled-maintenance-ticket.dto';
import { UpdateIncidentMaintenanceTicketDto } from './dtos/update-incident-maintenance-ticket.dto';
import { UpdateScheduledMaintenanceTicketDto } from './dtos/update-scheduled-maintenance-ticket.dto';
import { CompleteIncidentMaintenanceTicketDto } from './dtos/complete-incident-maintenance-ticket.dto';
import { CompleteScheduledMaintenanceTicketDto } from './dtos/complete-scheduled-maintenance-ticket.dto';
import { DeleteManyMaintenanceTicketsDto } from './dto/delete-many-maintenance-tickets.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CancelTicketDto } from './dto/cancel-ticket.dto';
import { QueryMaintenanceTicketDto } from './dto/query-maintenance-ticket.dto';
import { MaintenanceTicketListItemDto } from './dto/maintenance-ticket-list.dto';
import { MaintenanceTicketDetailDto } from './dto/maintenance-ticket-detail.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from '../accounts/enums/user-role.enum';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { RequireModule } from 'src/decorators/permission.decorator';
import { SystemModule } from '../permission/entities/role-permission.entity';

@ApiTags('Maintenance Tickets')
@ApiBearerAuth()
@RequireModule(SystemModule.MAINTENANCE)
@Controller('maintenance-tickets')
@UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
//@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MaintenanceTicketsController {
  constructor(
    private readonly maintenanceTicketsService: MaintenanceTicketsService,
  ) {}

  @Post('incident')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Tạo phiếu sự cố (INCIDENT) từ phản ánh cư dân' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Phiếu sự cố được tạo thành công',
    type: MaintenanceTicketDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset hoặc Block không tồn tại',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu đầu vào không hợp lệ',
  })
  async createIncident(@Body() createDto: CreateIncidentMaintenanceTicketDto) {
    return this.maintenanceTicketsService.createIncident(createDto);
  }

  @Post('scheduled')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo phiếu bảo trì định kỳ (MAINTENANCE)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Phiếu bảo trì định kỳ được tạo thành công',
    type: MaintenanceTicketDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset hoặc Block không tồn tại',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu đầu vào không hợp lệ',
  })
  async createScheduledMaintenance(
    @Body() createDto: CreateScheduledMaintenanceTicketDto,
  ) {
    return this.maintenanceTicketsService.createScheduledMaintenance(createDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Lấy danh sách phiếu bảo trì' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách phiếu bảo trì',
    type: [MaintenanceTicketListItemDto],
  })
  async findAll(@Query() query: QueryMaintenanceTicketDto) {
    return this.maintenanceTicketsService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy chi tiết phiếu bảo trì' })
  @ApiParam({
    name: 'id',
    description: 'Maintenance Ticket ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chi tiết phiếu bảo trì',
    type: MaintenanceTicketDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket không tồn tại',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceTicketsService.findOne(id);
  }

  @Get('assets/:assetId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách phiếu bảo trì của một asset' })
  @ApiParam({
    name: 'assetId',
    description: 'Asset ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách phiếu bảo trì của asset',
    type: [MaintenanceTicketListItemDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset không tồn tại',
  })
  async findByAsset(
    @Param('assetId', ParseIntPipe) assetId: number,
    @Query() query?: QueryMaintenanceTicketDto,
  ) {
    return this.maintenanceTicketsService.findByAssetId(assetId, query);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Phân công kỹ thuật viên' })
  @ApiParam({
    name: 'id',
    description: 'Maintenance Ticket ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Kỹ thuật viên đã được phân công',
    type: MaintenanceTicketDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket hoặc Technician không tồn tại',
  })
  async assignTechnician(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignDto: AssignTechnicianDto,
  ) {
    return this.maintenanceTicketsService.assignTechnician(id, assignDto);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Bắt đầu công việc bảo trì' })
  @ApiParam({
    name: 'id',
    description: 'Maintenance Ticket ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Đã bắt đầu công việc',
    type: MaintenanceTicketDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket không tồn tại',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ticket phải ở trạng thái ASSIGNED',
  })
  async startWork(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceTicketsService.startWork(id);
  }

  @Post(':id/progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Cập nhật tiến độ công việc' })
  @ApiParam({
    name: 'id',
    description: 'Maintenance Ticket ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tiến độ đã được cập nhật',
    type: MaintenanceTicketDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket không tồn tại',
  })
  async updateProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProgressDto,
  ) {
    return this.maintenanceTicketsService.updateProgress(id, updateDto);
  }

  @Post('incident/:id/complete')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[ADMIN, OPERATIONS] Hoàn tất sự cố' })
  @ApiParam({
    name: 'id',
    description: 'Maintenance Ticket ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sự cố đã hoàn tất',
    type: MaintenanceTicketDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket không tồn tại',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ticket phải ở trạng thái IN_PROGRESS',
  })
  async completeIncident(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
    @Body() completeDto: CompleteIncidentMaintenanceTicketDto,
  ) {
    const imageFile = files?.image?.[0];
    const videoFile = files?.video?.[0];
    return this.maintenanceTicketsService.completeIncident(
      id,
      completeDto,
      imageFile,
      videoFile,
    );
  }

  @Post('scheduled/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN, OPERATIONS] Hoàn tất bảo trì định kỳ' })
  @ApiParam({
    name: 'id',
    description: 'Maintenance Ticket ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Phiếu bảo trì đã hoàn thành',
    type: MaintenanceTicketDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket không tồn tại',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ticket phải ở trạng thái IN_PROGRESS',
  })
  async completeScheduledMaintenance(
    @Param('id', ParseIntPipe) id: number,
    @Body() completeDto: CompleteScheduledMaintenanceTicketDto,
  ) {
    return this.maintenanceTicketsService.completeScheduledMaintenance(
      id,
      completeDto,
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Hủy phiếu bảo trì' })
  @ApiParam({
    name: 'id',
    description: 'Maintenance Ticket ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Phiếu bảo trì đã bị hủy',
    type: MaintenanceTicketDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket không tồn tại',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Không thể hủy ticket đã hoàn thành',
  })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelDto: CancelTicketDto,
  ) {
    return this.maintenanceTicketsService.cancel(id, cancelDto);
  }

  @Patch('incident/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN] Cập nhật thông tin phiếu bảo trì sự cố (INCIDENT)',
  })
  @ApiParam({
    name: 'id',
    description: 'Maintenance Ticket ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật thành công',
    type: MaintenanceTicketDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket không tồn tại',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Chỉ có thể cập nhật ticket ở trạng thái PENDING hoặc ASSIGNED',
  })
  async updateIncident(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateIncidentMaintenanceTicketDto,
  ) {
    return this.maintenanceTicketsService.updateIncident(id, updateDto);
  }

  @Patch('scheduled/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN] Cập nhật phiếu bảo trì định kỳ (MAINTENANCE)',
  })
  @ApiParam({
    name: 'id',
    description: 'Maintenance Ticket ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật thành công',
    type: MaintenanceTicketDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket hoặc Asset không tồn tại',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Chỉ có thể cập nhật ticket ở trạng thái PENDING hoặc ASSIGNED',
  })
  async updateScheduledMaintenance(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateScheduledMaintenanceTicketDto,
  ) {
    return this.maintenanceTicketsService.updateScheduledMaintenance(
      id,
      updateDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Xóa mềm phiếu bảo trì' })
  @ApiParam({
    name: 'id',
    description: 'Maintenance Ticket ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Xóa ticket thành công',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket không tồn tại',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceTicketsService.remove(id);
  }

  @Delete('batch/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Xóa mềm nhiều phiếu bảo trì' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Xóa tickets thành công',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Một số ticket không tồn tại',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Danh sách IDs không được rỗng',
  })
  async removeMany(@Body() deleteDto: DeleteManyMaintenanceTicketsDto) {
    return this.maintenanceTicketsService.removeMany(deleteDto);
  }
}
