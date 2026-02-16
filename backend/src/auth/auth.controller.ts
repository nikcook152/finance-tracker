import { Controller, Post, Body, HttpCode, HttpStatus, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute for registration
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  register(@Body() dto: AuthDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for login
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: AuthDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refreshToken(req, res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }
}
