import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import type { User } from '@prisma/client';

@Controller('users')
export class UsersController {
  @UseGuards(AuthGuard('jwt')) // This line protects the endpoint
  @Get('me')
  getMe(@GetUser() user: User) {
    // Thanks to our decorator, we can easily access the logged-in user
    return user;
  }
}