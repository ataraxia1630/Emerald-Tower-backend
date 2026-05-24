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
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseIntPipe,
  UseGuards,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServicesService } from './services.service';
import { CheckSlotAvailabilityDto } from './dtos/check-slot-availability.dto';
import { ReserveSlotDto } from './dtos/reserve-slot.dto';
import { CreateServiceDto } from './dtos/create-service.dto';
import { UpdateServiceDto } from './dtos/update-service.dto';
import { DeleteManyServicesDto } from './dtos/delete-many-services.dto';
import {
  ServiceResponseDto,
  SlotAvailabilityResponseDto,
} from './dtos/service-response.dto';
import { ServiceDetailResponseDto } from './dtos/service-detail-response.dto';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { ApiDoc } from 'src/decorators/api-doc.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { CurrentUser } from 'src/decorators/user.decorator';
import { UserRole } from '../accounts/enums/user-role.enum';
import {
  RequireModule,
  RequireAction,
} from 'src/decorators/permission.decorator';
import { SystemModule } from '../permission/entities/role-permission.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@ApiTags('Services')
@RequireModule(SystemModule.AMENITY_BOOKING)
@Controller('services')
@UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Lấy danh sách các dịch vụ đang active',
    description: 'Lấy danh sách tất cả dịch vụ với bộ lọc',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of services retrieved successfully',
    type: [ServiceResponseDto],
  })
  async findAll(): Promise<ServiceResponseDto[]> {
    return this.servicesService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Lấy thông tin chi tiết của 1 dịch vụ (kèm lịch sử đặt)',
    description:
      'Lấy thông tin chi tiết dịch vụ theo ID và danh sách booking history',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service details with booking history retrieved successfully',
    type: ServiceDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service not found',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ServiceDetailResponseDto> {
    return this.servicesService.findOneWithBookingHistory(id);
  }

  @Get(':id/resident')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary:
      'Lấy thông tin chi tiết của 1 dịch vụ (view cư dân) - lấy luôn cả slot_availability theo ngày',
    description:
      'Lấy thông tin dịch vụ kèm slot có sẵn theo ngày để cư dân chọn',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service with availability retrieved successfully',
  })
  async findOneWithSlots(
    @Param('id', ParseIntPipe) id: number,
    @Query() checkSlotDto: CheckSlotAvailabilityDto,
  ): Promise<{
    service: ServiceResponseDto;
    slots: SlotAvailabilityResponseDto[];
  }> {
    const service = await this.servicesService.findOne(id);
    const slots = await this.servicesService.checkSlotAvailability(
      id,
      checkSlotDto,
    );

    return { service, slots };
  }

  @Post('slot/:id/reserve')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary:
      'Khi cư dân bấm đặt và còn chỗ thì reserve slot đấy và đồng thời tạo 1 booking mới',
    description:
      'Cư dân đặt slot, hệ thống giảm remaining_slot và tạo booking PENDING',
    auth: true,
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Slot reserved successfully, booking created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No available slots',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async reserveSlot(
    @Param('id', ParseIntPipe) serviceId: number,
    @Body() reserveSlotDto: ReserveSlotDto,
    @CurrentUser('id') accountId: number,
  ): Promise<any> {
    return this.servicesService.reserveSlot(
      serviceId,
      reserveSlotDto,
      accountId,
    );
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiDoc({
    summary: 'Tạo dịch vụ mới (Admin)',
    description: 'Tạo dịch vụ mới với thông tin chi tiết và hình ảnh',
    auth: true,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Service created successfully',
    type: ServiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or image upload failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  async create(
    @Body() createServiceDto: CreateServiceDto,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<ServiceResponseDto> {
    return this.servicesService.create(createServiceDto, image);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Cập nhật dịch vụ (Admin)',
    description: 'Cập nhật thông tin dịch vụ theo ID (có thể đổi hình ảnh)',
    auth: true,
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service updated successfully',
    type: ServiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or image upload failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServiceDto: UpdateServiceDto,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<ServiceResponseDto> {
    return this.servicesService.update(id, updateServiceDto, image);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Xóa mềm dịch vụ (Admin)',
    description: 'Xóa mềm 1 dịch vụ theo ID (không xóa dữ liệu trong DB)',
    auth: true,
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service soft deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  async softDelete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.servicesService.softDelete(id);
  }

  @Post('delete-many')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Xóa mềm nhiều dịch vụ (Admin)',
    description: 'Xóa mềm nhiều dịch vụ theo danh sách ID',
    auth: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Services soft deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or no services found to delete',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  async softDeleteMultiple(
    @Body() deleteManyDto: DeleteManyServicesDto,
  ): Promise<{ message: string; count: number }> {
    return this.servicesService.softDeleteMultiple(deleteManyDto.ids);
  }
}
