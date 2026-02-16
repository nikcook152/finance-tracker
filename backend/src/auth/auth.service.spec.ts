import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { createPrismaMock, createMockUser } from '../test-utils/prisma-mock';
import type { Response } from 'express';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockResponse = () => {
    const res: Partial<Response> = {
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('test-access-token'),
            verifyAsync: jest.fn().mockResolvedValue({ sub: 'test-user-id', email: 'test@example.com' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      const mockUser = createMockUser();
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword123');

      const res = mockResponse();
      const result = await service.register(registerDto, res);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          passwordHash: 'hashedpassword123',
        },
      });
      expect(res.cookie).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Authentication successful' });
    });

    it('should throw ConflictException if email already exists', async () => {
      const existingUser = createMockUser();
      prismaMock.user.findUnique.mockResolvedValue(existingUser);

      const res = mockResponse();
      await expect(service.register(registerDto, res)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with correct credentials', async () => {
      const mockUser = createMockUser({ failedLoginAttempts: 0, lockedUntil: null });
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = mockResponse();
      const result = await service.login(loginDto, res);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
      expect(res.cookie).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Authentication successful' });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = mockResponse();
      await expect(service.login(loginDto, res)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const mockUser = createMockUser({ failedLoginAttempts: 0, lockedUntil: null });
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const res = mockResponse();
      await expect(service.login(loginDto, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if account is locked', async () => {
      const mockUser = createMockUser({
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes in the future
      });
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const res = mockResponse();
      await expect(service.login(loginDto, res)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockUser = createMockUser();
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

      const res = mockResponse();
      const req = { cookies: { refresh_token: 'valid-refresh-token' } } as any;

      const result = await service.refreshToken(req, res);

      expect(res.cookie).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Authentication successful' });
    });

    it('should throw UnauthorizedException if no refresh token', async () => {
      const res = mockResponse();
      const req = { cookies: {} } as any;

      await expect(service.refreshToken(req, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should clear cookies and return success message', () => {
      const res = mockResponse();
      const result = service.logout(res);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});