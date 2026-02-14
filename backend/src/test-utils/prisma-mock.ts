import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

export type PrismaMock = DeepMockProxy<PrismaClient>;

export const createPrismaMock = (): PrismaMock => {
  return mockDeep<PrismaClient>();
};

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  passwordHash: 'hashedpassword123',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

export const createMockTransaction = (overrides = {}) => ({
  id: 'test-transaction-id',
  title: 'Test Transaction',
  amount: 100.0,
  date: new Date('2025-01-15'),
  category: 'Food',
  type: 'EXPENSE' as const,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  userId: 'test-user-id',
  ...overrides,
});

export const createMockSavingsGoal = (overrides = {}) => ({
  id: 'test-goal-id',
  amount: 500.0,
  createdAt: new Date('2025-01-01'),
  userId: 'test-user-id',
  ...overrides,
});