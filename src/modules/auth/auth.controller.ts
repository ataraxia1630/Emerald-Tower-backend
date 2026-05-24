import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  ClassSerializerInterceptor,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AccessTokenDto } from './dto/access-token.dto';
import { Account } from '../accounts/entities/account.entity';
import { TransformInterceptor } from 'src/interceptors/transform.interceptor';
import { Public } from 'src/decorators/permission.decorator';

@ApiTags('Authentication')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor, TransformInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description:
      'Login successful. Access token in response, refresh token in HttpOnly cookie.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Incorrect email or password' })
  login(
    @Body() loginDto: LoginDto,
    @Req() req: Request & { user: Account },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = this.authService.generateTokens(
      req.user,
    );

    // Set refresh token in HttpOnly cookie
    // httpOnly: true - prevents XSS attacks (JavaScript cannot access)
    // secure: true - only sent over HTTPS in production
    // sameSite: 'strict' - prevents CSRF attacks
    // maxAge: 7 days (604800000 ms)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user profile + access token only (no refresh token)
    return this.authService.login(req.user);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token using refresh token from cookie',
    description:
      'Refresh token is automatically read from HttpOnly cookie. Returns new access token (refresh token automatically renewed in cookie).',
  })
  @ApiResponse({
    status: 200,
    description:
      'Token refresh successful. New access token in response, new refresh token in cookie.',
    type: AccessTokenDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshTokens(
    @Req() req: Request & { user: { id: number; email: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(
      req.user.id,
      req.user.email,
    );

    // Update refresh token in HttpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return only access token (refresh token is in cookie)
    return {
      accessToken: tokens.accessToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout',
    description:
      'Client should delete the stored access token after calling this endpoint. Refresh token cookie is cleared automatically.',
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  logout(@Res({ passthrough: true }) res: Response) {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return { message: 'Logout successful' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req: Request & { user: { id: number } }) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Old password is incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Req() req: Request & { user: { id: number } },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }
}
