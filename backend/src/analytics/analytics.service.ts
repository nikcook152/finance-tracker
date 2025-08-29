// backend/src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyAnalytics(user: User) {
    // --- For now, we'll use a fixed savings goal. ---
    // --- In a future step, we'll store this per-user in the database. ---
    const savingsGoal = 1000;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const monthlyIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentBudget = monthlyIncome - monthlyExpenses;
    const savedAmount = currentBudget; // For this month, what's left is what's saved.
    const hasReachedGoal = savedAmount >= savingsGoal;

    return {
      monthlyIncome,
      monthlyExpenses,
      currentBudget,
      savingsGoal,
      savedAmount,
      hasReachedGoal,
      // We will calculate fix costs (recurring transactions) in a later step.
      fixCosts: 0 
    };
  }
}