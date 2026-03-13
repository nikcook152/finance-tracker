// backend/src/auth/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import type { Request } from 'express';

// Custom JWT extractor that reads from the access_token cookie
const extractJwtFromCookie = (req: Request): string | null => {
  if (req && req.cookies && req.cookies['access_token']) {
    return req.cookies['access_token'];
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }
    super({
      jwtFromRequest: (req: Request) => {
        // First try to extract from cookie
        const tokenFromCookie = extractJwtFromCookie(req);
        if (tokenFromCookie) {
          return tokenFromCookie;
        }
        // Fallback to Authorization header (for backwards compatibility)
        return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      },
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
    });

    if (!user) {
        throw new UnauthorizedException();
    }

    // This is the corrected part
    const { passwordHash, ...result } = user;
    return result;
    }
}