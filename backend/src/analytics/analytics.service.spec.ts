import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createPrismaMock,
  createMockUser,
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
    it('should return savings goal for the user', async () => {
      const mockUser = createMockUser();
      const mockGoal = createMockSavingsGoal({ userId: mockUser.id, amount: 1000 });

      prismaMock.savingsGoal.findFirst.mockResolvedValue(mockGoal);

      const result = await service.getMonthlyAnalytics(mockUser as any);

      expect(result.savingsGoal).toBe(1000);
    });

    it('should return 0 savings goal if none exists', async () => {
      const mockUser = createMockUser();
      prismaMock.savingsGoal.findFirst.mockResolvedValue(null);

      const result = await service.getMonthlyAnalytics(mockUser as any);

      expect(result.savingsGoal).toBe(0);
    });

    it('should return analytics with zeros for computed fields (computed client-side)', async () => {
      const mockUser = createMockUser();
      prismaMock.savingsGoal.findFirst.mockResolvedValue(null);

      const result = await service.getMonthlyAnalytics(mockUser as any);

      // With E2E encryption, server cannot compute these - returned for client compatibility
      expect(result.monthlyIncome).toBe(0);
      expect(result.monthlyExpenses).toBe(0);
      expect(result.currentBudget).toBe(0);
      expect(result.savedAmount).toBe(0);
      expect(result.hasReachedGoal).toBe(false);
      expect(result.fixCosts).toBe(0);
    });
  });
});