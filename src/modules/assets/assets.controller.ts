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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';
import { AssetListResponseDto } from './dto/asset-list-response.dto';
import { AssetDetailResponseDto } from './dto/asset-detail-response.dto';
import { DeleteManyAssetsDto } from './dto/delete-many-assets.dto';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { plainToInstance } from 'class-transformer';
import { RequireModule } from 'src/decorators/permission.decorator';
import { SystemModule } from '../permission/entities/role-permission.entity';

@ApiTags('Assets')
@RequireModule(SystemModule.ASSET_EQUIPMENT)
@Controller('assets')
@UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Asset created successfully',
    type: AssetDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset type or block not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createAssetDto: CreateAssetDto) {
    const asset = await this.assetsService.create(createAssetDto);
    return plainToInstance(AssetDetailResponseDto, asset);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all assets with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of assets retrieved successfully',
    type: [AssetListResponseDto],
  })
  async findAll(@Query() queryAssetDto: QueryAssetDto) {
    const assets = await this.assetsService.findAll(queryAssetDto);
    return plainToInstance(AssetListResponseDto, assets);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get detailed asset information by ID' })
  @ApiParam({
    name: 'id',
    description: 'Asset ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset details retrieved successfully',
    type: AssetDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const asset = await this.assetsService.findOne(id);
    return plainToInstance(AssetDetailResponseDto, asset);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an asset by ID' })
  @ApiParam({
    name: 'id',
    description: 'Asset ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset updated successfully',
    type: AssetDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset, asset type, or block not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAssetDto: UpdateAssetDto,
  ) {
    const asset = await this.assetsService.update(id, updateAssetDto);
    return plainToInstance(AssetDetailResponseDto, asset);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an asset by ID' })
  @ApiParam({
    name: 'id',
    description: 'Asset ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.remove(id);
  }

  @Post('delete-many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete multiple assets' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assets deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No assets found with provided IDs',
  })
  async removeMany(@Body() deleteManyDto: DeleteManyAssetsDto) {
    return this.assetsService.removeMany(deleteManyDto.ids);
  }
}
