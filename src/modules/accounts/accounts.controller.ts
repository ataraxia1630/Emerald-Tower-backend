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
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { QueryAccountDto } from './dto/query-account.dto';
import { AccountResponseDto } from './dto/account-response.dto';
import { DeleteManyAccountsDto } from './dto/delete-many-accounts.dto';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from './enums/user-role.enum';
import { RolesGuard } from 'src/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { ToggleActiveDto } from './dto/toggle-active.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard) //FIX 1: Bảo vệ TẤT CẢ các API bên dưới mặc định phải đăng nhập
@Roles(UserRole.ADMIN) // FIX 2: Ép buộc tất cả các API chỉ duy nhất ADMIN tối cao mới có quyền dùng
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Account created successfully',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createAccountDto: CreateAccountDto) {
    const account = await this.accountsService.create(createAccountDto);
    return plainToInstance(AccountResponseDto, account);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all accounts with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of accounts retrieved successfully',
  })
  async findAll(@Query() queryAccountDto: QueryAccountDto) {
    const result = await this.accountsService.findAll(queryAccountDto);
    return plainToInstance(AccountResponseDto, result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an account by ID' })
  @ApiParam({
    name: 'id',
    description: 'Account ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account retrieved successfully',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const account = await this.accountsService.findOne(id);
    return plainToInstance(AccountResponseDto, account);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an account by ID' })
  @ApiParam({
    name: 'id',
    description: 'Account ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account updated successfully',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    const account = await this.accountsService.update(id, updateAccountDto);
    return plainToInstance(AccountResponseDto, account);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an account by ID' })
  @ApiParam({
    name: 'id',
    description: 'Account ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account deleted successfully',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account not found',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const account = await this.accountsService.remove(id);
    return plainToInstance(AccountResponseDto, account);
  }

  @Post('delete-many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete multiple accounts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Accounts deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No accounts found with provided IDs',
  })
  removeMany(@Body() deleteManyDto: DeleteManyAccountsDto) {
    return this.accountsService.removeMany(deleteManyDto.ids);
  }

  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a deleted account by ID' })
  @ApiParam({
    name: 'id',
    description: 'Account ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account restored successfully',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deleted account not found',
  })
  async restore(@Param('id', ParseIntPipe) id: number) {
    const account = await this.accountsService.restore(id);
    return plainToInstance(AccountResponseDto, account);
  }

  // ADD
  @Patch(':id/active')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate or deactivate an account (UC31)',
    description:
      'Deactivating sets isActive=false. JWT is stateless — the account will receive 401 on their very next API request because JwtStrategy checks isActive on every call.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: AccountResponseDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleActiveDto,
  ) {
    const account = await this.accountsService.toggleActive(id, dto.isActive);
    return plainToInstance(AccountResponseDto, account);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign a new role to an account (UC31)',
    description:
      "Role change takes effect on the user's next login (new JWT will carry updated role).",
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: AccountResponseDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRoleDto,
  ) {
    const account = await this.accountsService.assignRole(id, dto.role);
    return plainToInstance(AccountResponseDto, account);
  }
}
