import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { Service } from './entities/service.entity';
import { SlotAvailability } from './entities/slot-availability.entity';
import { Resident } from '../residents/entities/resident.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { BookingsModule } from '../bookings/bookings.module';
import { Booking } from '../bookings/entities/booking.entity';
import { PermissionsModule } from '../permission/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Service,
      SlotAvailability,
      Resident,
      Booking,
      PermissionsModule,
    ]),
    CloudinaryModule,
    forwardRef(() => BookingsModule),
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
