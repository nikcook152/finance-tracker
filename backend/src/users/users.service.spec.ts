import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createPrismaMock,
  createMockUser,
  createMockSavingsGoal,
} from '../test-utils/prisma-mock';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('setSavingsGoal', () => {
    it('should create a new savings goal for user', async () => {
      const mockUser = createMockUser();
      const setGoalDto = { amount: 500.0 };
      const mockGoal = createMockSavingsGoal({
        amount: setGoalDto.amount,
        userId: mockUser.id,
      });

      prismaMock.savingsGoal.create.mockResolvedValue(mockGoal);

      const result = await service.setSavingsGoal(mockUser as any, setGoalDto);

      expect(prismaMock.savingsGoal.create).toHaveBeenCalledWith({
        data: {
          amount: setGoalDto.amount,
          userId: mockUser.id,
        },
      });
      expect(result.amount).toBe(500.0);
      expect(result.userId).toBe(mockUser.id);
    });

    it('should allow setting a zero savings goal', async () => {
      const mockUser = createMockUser();
      const setGoalDto = { amount: 0 };
      const mockGoal = createMockSavingsGoal({
        amount: 0,
        userId: mockUser.id,
      });

      prismaMock.savingsGoal.create.mockResolvedValue(mockGoal);

      const result = await service.setSavingsGoal(mockUser as any, setGoalDto);

      expect(result.amount).toBe(0);
    });

    it('should allow setting a large savings goal', async () => {
      const mockUser = createMockUser();
      const setGoalDto = { amount: 1000000.0 };
      const mockGoal = createMockSavingsGoal({
        amount: 1000000.0,
        userId: mockUser.id,
      });

      prismaMock.savingsGoal.create.mockResolvedValue(mockGoal);

      const result = await service.setSavingsGoal(mockUser as any, setGoalDto);

      expect(result.amount).toBe(1000000.0);
    });
  });
});