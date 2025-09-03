import {
  Controller,
  Get,
  Body,
  // Patch, // Remove unused
  // Param, // Remove unused
  // Delete, // Remove unused
  UseGuards,
  // Request, // Remove unused
  // ForbiddenException, // Remove unused
  Post,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import type { User } from '@prisma/client';
import { UsersService } from './users.service';
import { SetSavingsGoalDto } from './dto/set-savings-goal.dto';
// import { UpdateUserDto } from './dto/update-user.dto'; // This file does not exist
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // This file does not exist

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@GetUser() user: User) {
    return user;
  }

  @Post('savings-goal')
  setSavingsGoal(@GetUser() user: User, @Body() dto: SetSavingsGoalDto) {
    return this.usersService.setSavingsGoal(user, dto);
  }

  // The following routes are commented out because they are not implemented in the UsersService
  /*
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    if (req.user.id !== +id) {
      throw new ForbiddenException();
    }
    return this.usersService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    if (req.user.id !== +id) {
      throw new ForbiddenException();
    }
    return this.usersService.update(+id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    if (req.user.id !== +id) {
      throw new ForbiddenException();
    }
    return this.usersService.remove(+id);
  }
  */
}