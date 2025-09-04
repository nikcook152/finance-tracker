import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyAnalytics(user: User) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Find the most recent savings goal that was active for the current month.
    const activeGoal = await this.prisma.savingsGoal.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          // Find goals created on or before the end of this month
          lte: endOfMonth,
        },
      },
      orderBy: {
        createdAt: 'desc', // Get the most recent one
      },
    });

    // Use the found goal's amount, or default to 0 if none has been set.
    const savingsGoal = activeGoal?.amount ?? 0;

    // Get all transactions for the current month.
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Calculate totals.
    const monthlyIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = transactions
      .filter((t) => t.type === 'EXPENSE')
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
      // We will implement fix costs (recurring transactions) in a later step.
      fixCosts: 0,
    };
  }

  async getMonthlySummary(user: User) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
    });

    if (transactions.length === 0) {
      return [];
    }

    const monthlySummaries: { [key: string]: { income: number; expense: number } } = {};

    for (const t of transactions) {
      const month = t.date.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlySummaries[month]) {
        monthlySummaries[month] = { income: 0, expense: 0 };
      }
      if (t.type === 'INCOME') {
        monthlySummaries[month].income += t.amount;
      } else {
        monthlySummaries[month].expense += t.amount;
      }
    }

    const result = Object.keys(monthlySummaries).map((month) => ({
      month,
      net: monthlySummaries[month].income - monthlySummaries[month].expense,
    }));

    return result;
  }

  async getHistoricalAnalytics(user: User) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
    });

    if (transactions.length === 0) {
      return [];
    }

    const monthlyData: { [key: string]: number } = {};

    for (const t of transactions) {
      const month = t.date.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = 0;
      }
      if (t.type === 'INCOME') {
        monthlyData[month] += t.amount;
      } else {
        monthlyData[month] -= t.amount;
      }
    }

    const oldestTransaction = transactions[0];
    const oldestDate = new Date(oldestTransaction.date);
    const currentDate = new Date();

    const historicalData: { month: string; balance: number }[] = [];
    let cumulativeBalance = 0;

    const startDate = new Date(
      oldestDate.getFullYear(),
      oldestDate.getMonth(),
      1,
    );
    const endDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );

    for (
      let d = startDate;
      d <= endDate;
      d.setMonth(d.getMonth() + 1)
    ) {
      const monthKey = d.toISOString().slice(0, 7);
      const monthlyNet = monthlyData[monthKey] || 0;
      cumulativeBalance += monthlyNet;
      historicalData.push({
        month: monthKey,
        balance: cumulativeBalance,
      });
    }

    return historicalData;
  }
}