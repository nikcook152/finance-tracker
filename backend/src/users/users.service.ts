import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SetSavingsGoalDto } from './dto/set-savings-goal.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async setSavingsGoal(user: User, dto: SetSavingsGoalDto) {
    return this.prisma.savingsGoal.create({
      data: {
        amount: dto.amount,
        userId: user.id,
      },
    });
  }
}