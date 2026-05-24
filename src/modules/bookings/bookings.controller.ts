import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { PayBookingDto } from './dtos/pay-booking.dto';
import { BookingResponseDto } from './dtos/booking-response.dto';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { ApiDoc } from 'src/decorators/api-doc.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { CurrentUser } from 'src/decorators/user.decorator';
import { Resident } from '../residents/entities/resident.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpException, HttpStatus as Status } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { CreatePaymentDto } from '../payments/dto/create-payment.dto';
import { RequireModule } from 'src/decorators/permission.decorator';
import { SystemModule } from '../permission/entities/role-permission.entity';

@ApiTags('Bookings')
@Controller('bookings')
@UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly paymentsService: PaymentsService,
    @InjectRepository(Resident)
    private readonly residentRepository: Repository<Resident>,
  ) {}

  @Get('mine')
  @RequireModule(SystemModule.AMENITY_BOOKING)
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Lấy danh sách các booking của cư dân đó',
    description: 'Cư dân xem lịch sử đặt dịch vụ của mình',
    auth: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of bookings retrieved successfully',
    type: [BookingResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async findMine(
    @CurrentUser('id') accountId: number,
  ): Promise<BookingResponseDto[]> {
    const resident = await this.residentRepository.findOne({
      where: { accountId, isActive: true },
    });

    if (!resident) {
      throw new HttpException('Resident profile not found', Status.NOT_FOUND);
    }

    return this.bookingsService.findMyBookings(resident.id);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Xem chi tiết 1 booking',
    description: 'Cư dân xem chi tiết booking của mình',
    auth: true,
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking details retrieved successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.findOne(id);
  }

  @Post(':id/paid')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary:
      'Cư dân xác nhận thanh toán -> Booking cập nhật trạng thái Paid và tạo Payment tương ứng',
    description:
      'Thanh toán booking (giả lập - tự động thành công). Booking chuyển sang PAID.',
    auth: true,
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment successful, booking updated',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot pay for this booking',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  async payBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body() payBookingDto: PayBookingDto,
    @CurrentUser('id') accountId: number,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.payBooking(id, payBookingDto, accountId);
  }

  @Post(':id/payment')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Tạo yêu cầu thanh toán booking qua VNPay/MoMo',
    description:
      'Tạo transaction thanh toán cho booking. Trả về payment URL để redirect đến cổng thanh toán.',
    auth: true,
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot create payment for this booking',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  async createPaymentForBooking(
    @Param('id', ParseIntPipe) bookingId: number,
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser('id') accountId: number,
  ) {
    // Set booking as target for payment
    return this.paymentsService.createPayment(accountId, {
      ...createPaymentDto,
      targetType: 'BOOKING',
      targetId: bookingId,
    } as any);
  }
}
