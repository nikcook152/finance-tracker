import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createPrismaMock,
  createMockUser,
  createMockTransaction,
  createMockSavingsGoal,
} from '../test-utils/prisma-mock';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getMonthlyAnalytics', () => {
    it('should return monthly analytics with savings goal', async () => {
      const mockUser = createMockUser();
      const mockGoal = createMockSavingsGoal({ amount: 500 });
      const mockTransactions = [
        createMockTransaction({
          userId: mockUser.id,
          amount: 3000,
          type: 'INCOME',
          date: new Date(), // Current month
        }),
        createMockTransaction({
          id: 'txn-2',
          userId: mockUser.id,
          amount: 1000,
          type: 'EXPENSE',
          date: new Date(),
        }),
      ];

      prismaMock.savingsGoal.findFirst.mockResolvedValue(mockGoal);
      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getMonthlyAnalytics(mockUser as any);

      expect(result.monthlyIncome).toBe(3000);
      expect(result.monthlyExpenses).toBe(1000);
      expect(result.currentBudget).toBe(2000);
      expect(result.savingsGoal).toBe(500);
      expect(result.savedAmount).toBe(2000);
      expect(result.hasReachedGoal).toBe(true);
    });

    it('should return zero savings goal if none set', async () => {
      const mockUser = createMockUser();
      prismaMock.savingsGoal.findFirst.mockResolvedValue(null);
      prismaMock.transaction.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyAnalytics(mockUser as any);

      expect(result.savingsGoal).toBe(0);
      expect(result.hasReachedGoal).toBe(true); // 0 >= 0
    });

    it('should calculate correctly when goal not reached', async () => {
      const mockUser = createMockUser();
      const mockGoal = createMockSavingsGoal({ amount: 1000 });
      const mockTransactions = [
        createMockTransaction({
          userId: mockUser.id,
          amount: 2000,
          type: 'INCOME',
          date: new Date(),
        }),
        createMockTransaction({
          id: 'txn-2',
          userId: mockUser.id,
          amount: 1500,
          type: 'EXPENSE',
          date: new Date(),
        }),
      ];

      prismaMock.savingsGoal.findFirst.mockResolvedValue(mockGoal);
      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getMonthlyAnalytics(mockUser as any);

      expect(result.savedAmount).toBe(500);
      expect(result.hasReachedGoal).toBe(false);
    });

    it('should return zero values when no transactions exist', async () => {
      const mockUser = createMockUser();
      prismaMock.savingsGoal.findFirst.mockResolvedValue(null);
      prismaMock.transaction.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyAnalytics(mockUser as any);

      expect(result.monthlyIncome).toBe(0);
      expect(result.monthlyExpenses).toBe(0);
      expect(result.currentBudget).toBe(0);
    });
  });

  describe('getMonthlySummary', () => {
    it('should return monthly summary of net balances', async () => {
      const mockUser = createMockUser();
      const mockTransactions = [
        createMockTransaction({
          userId: mockUser.id,
          amount: 3000,
          type: 'INCOME',
          date: new Date('2025-01-15'),
        }),
        createMockTransaction({
          id: 'txn-2',
          userId: mockUser.id,
          amount: 1000,
          type: 'EXPENSE',
          date: new Date('2025-01-20'),
        }),
        createMockTransaction({
          id: 'txn-3',
          userId: mockUser.id,
          amount: 2000,
          type: 'INCOME',
          date: new Date('2025-02-10'),
        }),
      ];

      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getMonthlySummary(mockUser as any);

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.month === '2025-01')?.net).toBe(2000);
      expect(result.find((r) => r.month === '2025-02')?.net).toBe(2000);
    });

    it('should return empty array when no transactions exist', async () => {
      const mockUser = createMockUser();
      prismaMock.transaction.findMany.mockResolvedValue([]);

      const result = await service.getMonthlySummary(mockUser as any);

      expect(result).toEqual([]);
    });
  });

  describe('getHistoricalExpensesByCategory', () => {
    it('should return expenses grouped by category and month', async () => {
      const mockUser = createMockUser();
      // Only mock EXPENSE transactions - the service filters for type: 'EXPENSE'
      const mockExpenseTransactions = [
        createMockTransaction({
          userId: mockUser.id,
          amount: 100,
          type: 'EXPENSE',
          category: 'Food',
          date: new Date('2025-01-15'),
        }),
        createMockTransaction({
          id: 'txn-2',
          userId: mockUser.id,
          amount: 200,
          type: 'EXPENSE',
          category: 'Food',
          date: new Date('2025-01-20'),
        }),
        createMockTransaction({
          id: 'txn-3',
          userId: mockUser.id,
          amount: 150,
          type: 'EXPENSE',
          category: 'Transport',
          date: new Date('2025-01-10'),
        }),
      ];

      prismaMock.transaction.findMany.mockResolvedValue(mockExpenseTransactions);

      const result = await service.getHistoricalExpensesByCategory(mockUser as any);

      expect(result.labels).toContain('2025-01');
      expect(result.datasets).toHaveLength(2); // Food and Transport
      expect(result.datasets.find((d) => d.label === 'Food')?.data).toEqual([300]);
      expect(result.datasets.find((d) => d.label === 'Transport')?.data).toEqual([150]);
    });

    it('should return empty datasets when no expense transactions exist', async () => {
      const mockUser = createMockUser();
      prismaMock.transaction.findMany.mockResolvedValue([]);

      const result = await service.getHistoricalExpensesByCategory(mockUser as any);

      expect(result.labels).toEqual([]);
      expect(result.datasets).toEqual([]);
    });
  });

  describe('getHistoricalAnalytics', () => {
    it('should return cumulative balance over time', async () => {
      const mockUser = createMockUser();
      const mockTransactions = [
        createMockTransaction({
          userId: mockUser.id,
          amount: 1000,
          type: 'INCOME',
          date: new Date('2025-01-01'),
        }),
        createMockTransaction({
          id: 'txn-2',
          userId: mockUser.id,
          amount: 500,
          type: 'EXPENSE',
          date: new Date('2025-01-15'),
        }),
        createMockTransaction({
          id: 'txn-3',
          userId: mockUser.id,
          amount: 2000,
          type: 'INCOME',
          date: new Date('2025-02-01'),
        }),
      ];

      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getHistoricalAnalytics(mockUser as any);

      expect(result.length).toBeGreaterThan(0);
      // First month should have net +500
      const january = result.find((r) => r.month === '2025-01');
      expect(january?.balance).toBe(500);
      // Second month should have cumulative 500 + 2000 = 2500
      const february = result.find((r) => r.month === '2025-02');
      expect(february?.balance).toBe(2500);
    });

    it('should return empty array when no transactions exist', async () => {
      const mockUser = createMockUser();
      prismaMock.transaction.findMany.mockResolvedValue([]);

      const result = await service.getHistoricalAnalytics(mockUser as any);

      expect(result).toEqual([]);
    });
  });
});