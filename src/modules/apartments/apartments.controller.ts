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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApartmentsService } from './apartments.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { UpdateApartmentStatusDto } from './dto/update-apartment-status.dto';
import { QueryApartmentDto } from './dto/query-apartment.dto';
import { ApartmentListResponseDto } from './dto/apartment-list-response.dto';
import { ApartmentDetailResponseDto } from './dto/apartment-detail-response.dto';
import { DeleteManyApartmentsDto } from './dto/delete-many-apartments.dto';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { RequireModule } from 'src/decorators/permission.decorator';
import { SystemModule } from '../permission/entities/role-permission.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@ApiTags('Apartments')
@RequireModule(SystemModule.RESIDENT_APARTMENT)
@ApiBearerAuth()
@Controller('apartments')
@UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new apartment with residents' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Apartment created successfully',
    type: ApartmentDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Apartment name already exists in this block',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Block or resident not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createApartmentDto: CreateApartmentDto) {
    return this.apartmentsService.create(createApartmentDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all apartments with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of apartments retrieved successfully',
    type: [ApartmentListResponseDto],
  })
  async findAll(@Query() queryApartmentDto: QueryApartmentDto) {
    return this.apartmentsService.findAll(queryApartmentDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get apartment details by ID' })
  @ApiParam({
    name: 'id',
    description: 'Apartment ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Apartment details retrieved successfully',
    type: ApartmentDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Apartment not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.apartmentsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an apartment by ID' })
  @ApiParam({
    name: 'id',
    description: 'Apartment ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Apartment updated successfully',
    type: ApartmentDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Apartment not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Apartment name already exists in this block',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateApartmentDto: UpdateApartmentDto,
  ) {
    return this.apartmentsService.update(id, updateApartmentDto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update apartment status' })
  @ApiParam({
    name: 'id',
    description: 'Apartment ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Apartment status updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Apartment not found',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateApartmentStatusDto,
  ) {
    return this.apartmentsService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an apartment by ID' })
  @ApiParam({
    name: 'id',
    description: 'Apartment ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Apartment deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Apartment not found',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.apartmentsService.remove(id);
  }

  @Post('delete-many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete multiple apartments' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Apartments deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No apartments found with provided IDs',
  })
  removeMany(@Body() deleteManyDto: DeleteManyApartmentsDto) {
    return this.apartmentsService.removeMany(deleteManyDto.ids);
  }
}
