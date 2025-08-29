import { Controller, Get, UseGuards, Post, Body } from '@nestjs/common'; // Add Post, Body
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import type { User } from '@prisma/client';
import { UsersService } from './users.service'; // Import UsersService
import { SetSavingsGoalDto } from './dto/set-savings-goal.dto'; // Import DTO


@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {} // Inject UsersService

  @Get('me')
  getMe(@GetUser() user: User) {
    return user;
  }

  // --- ADD THIS NEW ENDPOINT ---
  @Post('savings-goal')
  setSavingsGoal(@GetUser() user: User, @Body() dto: SetSavingsGoalDto) {
    return this.usersService.setSavingsGoal(user, dto);
  }
}