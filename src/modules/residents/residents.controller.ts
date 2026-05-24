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
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { QueryResidentDto } from './dto/query-resident.dto';
import { ResidentResponseDto } from './dto/resident-response.dto';
import { ResidentProfileResponseDto } from './dto/resident-profile-response.dto';
import { ResidentInvoicesDetailResponseDto } from './dto/resident-invoices-detail-response.dto';
import { ResidentResidencesResponseDto } from './dto/resident-residences-response.dto';
import { DeleteManyResidentsDto } from './dto/delete-many-residents.dto';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from '../accounts/enums/user-role.enum';
import { CurrentUser } from 'src/decorators/user.decorator';
import { RequireModule } from 'src/decorators/permission.decorator';
import { SystemModule } from '../permission/entities/role-permission.entity';

@ApiTags('Residents')
@UseGuards(JwtAuthGuard)
@RequireModule(SystemModule.RESIDENT_APARTMENT)
@ApiBearerAuth()
@Controller('residents')
@UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new resident with account' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Resident and account created successfully',
    type: ResidentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Citizen ID or email already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or image upload failed',
  })
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createResidentDto: CreateResidentDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const resident = await this.residentsService.create(
      createResidentDto,
      image,
    );
    return plainToInstance(ResidentResponseDto, resident);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all residents with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of residents retrieved successfully',
    type: [ResidentResponseDto],
  })
  async findAll(@Query() queryResidentDto: QueryResidentDto) {
    const result = await this.residentsService.findAll(queryResidentDto);
    return plainToInstance(ResidentResponseDto, result);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get current resident profile with invoices, bookings, and payments',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resident profile retrieved successfully',
    type: ResidentProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resident not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async getMyProfile(@CurrentUser('id') accountId: number) {
    const profile = await this.residentsService.getMyProfile(accountId);
    return plainToInstance(ResidentProfileResponseDto, profile);
  }

  @Get('me/invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get invoices and payment transactions for current resident',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoices and payments retrieved successfully',
    type: ResidentInvoicesDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resident not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async getMyInvoices(@CurrentUser('id') accountId: number) {
    const result = await this.residentsService.getMyInvoices(accountId);
    return plainToInstance(ResidentInvoicesDetailResponseDto, result);
  }

  @Get(':id/apartments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get residence information (apartments) for a specific resident',
  })
  @ApiParam({
    name: 'id',
    description: 'Resident ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Residences retrieved successfully',
    type: ResidentResidencesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resident not found',
  })
  async getResidentResidences(@Param('id', ParseIntPipe) id: number) {
    const result = await this.residentsService.getResidentResidences(id);
    return plainToInstance(ResidentResidencesResponseDto, result);
  }

  @Get(':id/invoices')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get invoices and payment transactions for a specific resident',
  })
  @ApiParam({
    name: 'id',
    description: 'Resident ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoices and payments retrieved successfully',
    type: ResidentInvoicesDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resident not found',
  })
  async getResidentInvoices(@Param('id', ParseIntPipe) id: number) {
    const result = await this.residentsService.getResidentInvoices(id);
    return plainToInstance(ResidentInvoicesDetailResponseDto, result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a resident by ID' })
  @ApiParam({
    name: 'id',
    description: 'Resident ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resident retrieved successfully',
    type: ResidentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resident not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const resident = await this.residentsService.findOne(id);
    return plainToInstance(ResidentResponseDto, resident);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a resident by ID' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'Resident ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resident updated successfully',
    type: ResidentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resident not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Citizen ID already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or image upload failed',
  })
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateResidentDto: UpdateResidentDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const resident = await this.residentsService.update(
      id,
      updateResidentDto,
      image,
    );
    return plainToInstance(ResidentResponseDto, resident);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a resident by ID' })
  @ApiParam({
    name: 'id',
    description: 'Resident ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resident deleted successfully',
    type: ResidentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resident not found',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const resident = await this.residentsService.remove(id);
    return plainToInstance(ResidentResponseDto, resident);
  }

  @Post('delete-many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete multiple residents' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Residents deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No residents found with provided IDs',
  })
  async removeMany(@Body() deleteManyDto: DeleteManyResidentsDto) {
    return this.residentsService.removeMany(deleteManyDto.ids);
  }
}
