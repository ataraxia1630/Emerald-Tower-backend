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
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { QueryBlockDto } from './dto/query-block.dto';
import { BlockListResponseDto } from './dto/block-list-response.dto';
import { BlockDetailResponseDto } from './dto/block-detail-response.dto';
import { BlockHasResidentsResponseDto } from './dto/block-has-residents-response.dto';
import { DeleteManyBlocksDto } from './dto/delete-many-blocks.dto';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { RequireModule } from 'src/decorators/permission.decorator';
import { SystemModule } from '../permission/entities/role-permission.entity';

@ApiTags('Blocks')
@UseGuards(JwtAuthGuard)
@RequireModule(SystemModule.RESIDENT_APARTMENT)
@ApiBearerAuth()
@Controller('blocks')
@UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new block with apartments' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Block created successfully',
    type: BlockDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Block name already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createBlockDto: CreateBlockDto) {
    return this.blocksService.create(createBlockDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all blocks with apartment statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of blocks retrieved successfully',
    type: [BlockListResponseDto],
  })
  async findAll(@Query() queryBlockDto: QueryBlockDto) {
    return this.blocksService.findAll(queryBlockDto);
  }

  @Get(':id/has-residents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if a block has any residents' })
  @ApiParam({
    name: 'id',
    description: 'Block ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Block resident status retrieved successfully',
    type: BlockHasResidentsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Block not found',
  })
  async hasResidents(@Param('id', ParseIntPipe) id: number) {
    const result = await this.blocksService.hasResidents(id);
    return plainToInstance(BlockHasResidentsResponseDto, result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get block details with apartments by ID' })
  @ApiParam({
    name: 'id',
    description: 'Block ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Block details retrieved successfully',
    type: BlockDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Block not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.blocksService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a block and its apartments by ID' })
  @ApiParam({
    name: 'id',
    description: 'Block ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Block updated successfully',
    type: BlockDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Block not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Block name already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBlockDto: UpdateBlockDto,
  ) {
    return this.blocksService.update(id, updateBlockDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a block by ID' })
  @ApiParam({
    name: 'id',
    description: 'Block ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Block deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Block not found',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.blocksService.remove(id);
  }

  @Post('delete-many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete multiple blocks' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Blocks deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No blocks found with provided IDs',
  })
  async removeMany(@Body() deleteManyDto: DeleteManyBlocksDto) {
    return this.blocksService.removeMany(deleteManyDto.ids);
  }
}
