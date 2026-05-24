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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CreateFeeDto } from './dto/create-fee.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { QueryFeeDto } from './dto/query-fee.dto';
import { FeeListResponseDto } from './dto/fee-list-response.dto';
import { FeeDetailResponseDto } from './dto/fee-detail-response.dto';
import { DeleteManyFeesDto } from './dto/delete-many-fees.dto';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { plainToInstance } from 'class-transformer';
import { SystemModule } from '../permission/entities/role-permission.entity';
import { RequireModule } from 'src/decorators/permission.decorator';

@ApiTags('Fees')
@RequireModule(SystemModule.INVOICE_DEBT)
@Controller('fees')
@UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new fee with tiers' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Fee created successfully',
    type: FeeDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Fee name already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or tier validation failed',
  })
  async create(@Body() createFeeDto: CreateFeeDto) {
    const fee = await this.feesService.create(createFeeDto);
    return plainToInstance(FeeDetailResponseDto, fee);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all fees with tier count' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of fees retrieved successfully',
    type: [FeeListResponseDto],
  })
  async findAll(@Query() queryFeeDto: QueryFeeDto) {
    const fees = await this.feesService.findAll(queryFeeDto);
    return plainToInstance(FeeListResponseDto, fees);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get fee details with all tiers by ID' })
  @ApiParam({
    name: 'id',
    description: 'Fee ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee details retrieved successfully',
    type: FeeDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Fee not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const fee = await this.feesService.findOne(id);
    return plainToInstance(FeeDetailResponseDto, fee);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a fee and its tiers by ID' })
  @ApiParam({
    name: 'id',
    description: 'Fee ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee updated successfully',
    type: FeeDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Fee not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Fee name already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or tier validation failed',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFeeDto: UpdateFeeDto,
  ) {
    const fee = await this.feesService.update(id, updateFeeDto);
    return plainToInstance(FeeDetailResponseDto, fee);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a fee by ID' })
  @ApiParam({
    name: 'id',
    description: 'Fee ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Fee not found',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.feesService.remove(id);
  }

  @Post('delete-many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete multiple fees' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fees deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No fees found with provided IDs',
  })
  async removeMany(@Body() deleteManyDto: DeleteManyFeesDto) {
    return this.feesService.removeMany(deleteManyDto.ids);
  }
}
