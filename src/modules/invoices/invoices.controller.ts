import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseIntPipe,
  UseGuards,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceAdminDto } from './dto/create-invoice-admin.dto';
import { CreateInvoiceClientDto } from './dto/create-invoice-client.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { VerifyMeterReadingDto } from './dto/verify-meter-reading.dto';
import { VerifyInvoiceReadingsDto } from './dto/verify-invoice-readings.dto';
import { DeleteManyInvoicesDto } from './dto/delete-many-invoices.dto';
import { InvoiceListResponseDto } from './dto/invoice-list-response.dto';
import { InvoiceDetailResponseDto } from './dto/invoice-detail-response.dto';
import { ClientCreatedInvoiceResponseDto } from './dto/client-created-invoice-response.dto';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from '../accounts/enums/user-role.enum';
import { CurrentUser } from 'src/decorators/user.decorator';
import { Invoice } from './entities/invoice.entity';
import { SystemModule } from '../permission/entities/role-permission.entity';
import { RequireModule } from 'src/decorators/permission.decorator';

@ApiTags('Invoices')
@RequireModule(SystemModule.INVOICE_DEBT)
@Controller('invoices')
@UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[ADMIN] Tạo hóa đơn mới',
    description:
      'Tạo hóa đơn cho căn hộ. Period sẽ được normalize về ngày 1st của tháng (vd: 2024-01-05 → 2024-01-01)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Hóa đơn được tạo thành công',
    type: InvoiceDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Hóa đơn cho kỳ này đã tồn tại',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy căn hộ hoặc cấu hình phí',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Kỳ thanh toán không được là ngày trong tương lai',
  })
  async createByAdmin(@Body() createInvoiceDto: CreateInvoiceAdminDto) {
    const invoice =
      await this.invoicesService.createInvoiceByAdmin(createInvoiceDto);
    return this.transformInvoiceDetail(invoice);
  }

  @Post('client')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.RESIDENT)
  @ApiOperation({
    summary: '[CLIENT] Tạo hóa đơn với ảnh chứng minh',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        apartmentId: {
          type: 'number',
          example: 1,
          description: 'ID của căn hộ cử dân muốn tạo hóa đơn',
        },
        waterIndex: {
          type: 'number',
          example: 100,
          description: 'Chỉ số nước mới',
        },
        electricityIndex: {
          type: 'number',
          example: 200,
          description: 'Chỉ số điện mới',
        },
        waterImage: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh chứng minh chỉ số nước',
        },
        electricityImage: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh chứng minh chỉ số điện',
        },
      },
      required: ['apartmentId', 'waterIndex', 'electricityIndex'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Hóa đơn được tạo thành công',
    type: InvoiceDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cư dân không sở hữu căn hộ này',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy cư dân hoặc căn hộ',
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'waterImage', maxCount: 1 },
      { name: 'electricityImage', maxCount: 1 },
    ]),
  )
  async createByClient(
    @CurrentUser('id') accountId: number,
    @Body() createInvoiceDto: CreateInvoiceClientDto,
    @UploadedFiles()
    files: {
      waterImage?: Express.Multer.File[];
      electricityImage?: Express.Multer.File[];
    },
  ) {
    const allFiles = [
      ...(files?.waterImage || []),
      ...(files?.electricityImage || []),
    ];
    const invoice = await this.invoicesService.createInvoiceByClient(
      accountId,
      createInvoiceDto,
      allFiles,
    );
    return this.transformInvoiceDetail(invoice);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách hóa đơn',
    type: [InvoiceListResponseDto],
  })
  async findAll(@Query() queryDto: QueryInvoiceDto) {
    const invoices = await this.invoicesService.findAll(queryDto);
    return plainToInstance(InvoiceListResponseDto, invoices, {
      excludeExtraneousValues: true,
    });
  }

  @Get('client-created/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      '[ADMIN] Lấy danh sách hóa đơn được tạo bởi khách hàng (kèm chỉ số meter)',
    description:
      'Lấy danh sách invoices được tạo từ meter readings có ảnh chứng minh. Bao gồm thông tin chỉ số cũ, chỉ số mới, lượng sử dụng cho mỗi loại phí.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách hóa đơn được tạo bởi khách hàng kèm meter readings',
    type: [ClientCreatedInvoiceResponseDto],
  })
  async findClientCreatedInvoices(@Query() queryDto: QueryInvoiceDto) {
    const invoices =
      await this.invoicesService.findClientCreatedInvoices(queryDto);
    return plainToInstance(ClientCreatedInvoiceResponseDto, invoices, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy chi tiết hóa đơn' })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chi tiết hóa đơn',
    type: InvoiceDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy hóa đơn',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoicesService.findOne(id);
    return this.transformInvoiceDetail(invoice);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Cập nhật hóa đơn' })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Hóa đơn được cập nhật thành công',
    type: InvoiceDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy hóa đơn',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    const invoice = await this.invoicesService.updateInvoice(
      id,
      updateInvoiceDto,
    );
    return this.transformInvoiceDetail(invoice);
  }

  @Post('verify-meter-reading')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Xác nhận chỉ số điện nước' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chỉ số đã được xác nhận',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy chỉ số meter',
  })
  async verifyMeterReading(@Body() dto: VerifyMeterReadingDto) {
    return this.invoicesService.verifyMeterReading(dto.meterReadingId);
  }

  @Post('verify-invoice-readings')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Xác nhận chỉ số và tính toán lại hóa đơn' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chỉ số đã được xác nhận và hóa đơn được tính toán lại',
    type: InvoiceDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy hóa đơn hoặc loại phí',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu không hợp lệ',
  })
  async verifyInvoiceReadings(@Body() dto: VerifyInvoiceReadingsDto) {
    const invoice = await this.invoicesService.verifyInvoiceReadings(
      dto.invoiceId,
      dto.meterReadings,
    );
    return this.transformInvoiceDetail(invoice);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Xóa mềm hóa đơn' })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Hóa đơn đã được xóa',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy hóa đơn',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.invoicesService.remove(id);
  }

  @Post('delete-many')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Xóa mềm nhiều hóa đơn' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Các hóa đơn đã được xóa thành công',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy hóa đơn với các ID đã cung cấp',
  })
  async removeMany(@Body() deleteManyDto: DeleteManyInvoicesDto) {
    return this.invoicesService.removeMany(deleteManyDto.ids);
  }

  /**
   * Helper method to transform invoice to detail response
   */
  private transformInvoiceDetail(invoice: any): InvoiceDetailResponseDto {
    const transformed = {
      ...invoice,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      invoiceDetails: invoice.invoiceDetails?.map((detail: any) => ({
        ...detail,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        feeTypeName: detail.feeType?.name,
      })),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      meterReadings: invoice.meterReadings || [],
    };

    return plainToInstance(InvoiceDetailResponseDto, transformed, {
      excludeExtraneousValues: true,
    });
  }
}
