import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get savings goal for the user.
   * Note: With E2E encryption, the server cannot compute analytics from transaction data
   * as amounts are encrypted. Analytics are computed client-side.
   * This endpoint only returns the savings goal.
   */
  async getMonthlyAnalytics(user: User) {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Find the most recent savings goal that was active for the current month.
    const activeGoal = await this.prisma.savingsGoal.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          lte: endOfMonth,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const savingsGoal = activeGoal?.amount ?? 0;

    // Return only savings goal - other analytics computed client-side
    return {
      monthlyIncome: 0,
      monthlyExpenses: 0,
      currentBudget: 0,
      savingsGoal,
      savedAmount: 0,
      hasReachedGoal: false,
      fixCosts: 0,
    };
  }
}