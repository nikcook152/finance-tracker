import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { AuthDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: AuthDto, res: Response) {
    const { email, password } = dto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { email, passwordHash },
    });

    return this.setAuthCookies(user.id, user.email, res);
  }

  async login(dto: AuthDto, res: Response) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account is temporarily locked. Try again in ${remainingTime} minutes.`);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: failedAttempts };

      // Lock account after 5 failed attempts for 30 minutes
      if (failedAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return this.setAuthCookies(user.id, user.email, res);
  }

  async refreshToken(req: Request, res: Response) {
    const refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET') + '-refresh',
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.setAuthCookies(user.id, user.email, res);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  logout(res: Response) {
    // Clear both cookies
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return { message: 'Logged out successfully' };
  }

  private async setAuthCookies(userId: string, email: string, res: Response) {
    const payload = { sub: userId, email };

    // Access token - 15 minutes
    const accessToken = await this.jwtService.signAsync(payload);

    // Refresh token - 7 days
    const refreshPayload = { sub: userId, email };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      expiresIn: '7d',
      secret: this.configService.get<string>('JWT_SECRET') + '-refresh',
    });

    // Set access token cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Set refresh token cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return { message: 'Authentication successful' };
  }
}
