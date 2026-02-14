import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createPrismaMock,
  createMockUser,
  createMockTransaction,
} from '../test-utils/prisma-mock';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('getTransactions', () => {
    it('should return all transactions for a user', async () => {
      const mockUser = createMockUser();
      const mockTransactions = [
        createMockTransaction({ userId: mockUser.id }),
        createMockTransaction({
          id: 'transaction-2',
          type: 'INCOME',
          userId: mockUser.id,
        }),
      ];

      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getTransactions(mockUser as any);

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockTransactions);
    });

    it('should return empty array if no transactions exist', async () => {
      const mockUser = createMockUser();
      prismaMock.transaction.findMany.mockResolvedValue([]);

      const result = await service.getTransactions(mockUser as any);

      expect(result).toEqual([]);
    });
  });

  describe('createTransaction', () => {
    it('should create a new transaction successfully', async () => {
      const mockUser = createMockUser();
      const createDto = {
        encryptedData: 'encrypted-payload-base64',
        iv: 'iv-base64',
        date: '2025-01-15T00:00:00.000Z',
        type: 'EXPENSE' as const,
      };

      const mockTransaction = createMockTransaction({
        ...createDto,
        date: new Date(createDto.date),
        userId: mockUser.id,
      });

      prismaMock.transaction.create.mockResolvedValue(mockTransaction);

      const result = await service.createTransaction(mockUser as any, createDto);

      expect(prismaMock.transaction.create).toHaveBeenCalledWith({
        data: {
          encryptedData: createDto.encryptedData,
          iv: createDto.iv,
          date: new Date(createDto.date),
          type: createDto.type,
          userId: mockUser.id,
        },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should create an INCOME transaction', async () => {
      const mockUser = createMockUser();
      const createDto = {
        encryptedData: 'encrypted-salary-data',
        iv: 'iv-salary',
        date: '2025-01-01T00:00:00.000Z',
        type: 'INCOME' as const,
      };

      const mockTransaction = createMockTransaction({
        ...createDto,
        date: new Date(createDto.date),
        userId: mockUser.id,
        type: 'INCOME',
      });

      prismaMock.transaction.create.mockResolvedValue(mockTransaction);

      const result = await service.createTransaction(mockUser as any, createDto);

      expect(result.type).toBe('INCOME');
    });
  });

  describe('updateTransaction', () => {
    it('should update a transaction successfully', async () => {
      const mockUser = createMockUser();
      const existingTransaction = createMockTransaction({ userId: mockUser.id });
      const updateDto = {
        encryptedData: 'updated-encrypted-data',
        iv: 'updated-iv',
      };

      const updatedTransaction = {
        ...existingTransaction,
        ...updateDto,
      };

      prismaMock.transaction.findUnique.mockResolvedValue(existingTransaction);
      prismaMock.transaction.update.mockResolvedValue(updatedTransaction);

      const result = await service.updateTransaction(
        mockUser as any,
        'test-transaction-id',
        updateDto,
      );

      expect(prismaMock.transaction.update).toHaveBeenCalledWith({
        where: { id: 'test-transaction-id' },
        data: updateDto,
      });
      expect(result.encryptedData).toBe('updated-encrypted-data');
    });

    it('should update date correctly', async () => {
      const mockUser = createMockUser();
      const existingTransaction = createMockTransaction({ userId: mockUser.id });
      const updateDto = {
        date: '2025-02-01T00:00:00.000Z',
      };

      prismaMock.transaction.findUnique.mockResolvedValue(existingTransaction);
      prismaMock.transaction.update.mockResolvedValue({
        ...existingTransaction,
        date: new Date(updateDto.date),
      });

      await service.updateTransaction(
        mockUser as any,
        'test-transaction-id',
        updateDto,
      );

      expect(prismaMock.transaction.update).toHaveBeenCalledWith({
        where: { id: 'test-transaction-id' },
        data: { date: new Date(updateDto.date) },
      });
    });

    it('should throw ForbiddenException if transaction not found', async () => {
      const mockUser = createMockUser();
      prismaMock.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTransaction(mockUser as any, 'non-existent-id', {
          encryptedData: 'test',
          iv: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if transaction belongs to another user', async () => {
      const mockUser = createMockUser();
      const otherUserTransaction = createMockTransaction({
        userId: 'other-user-id',
      });

      prismaMock.transaction.findUnique.mockResolvedValue(otherUserTransaction);

      await expect(
        service.updateTransaction(mockUser as any, 'test-transaction-id', {
          encryptedData: 'test',
          iv: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction successfully', async () => {
      const mockUser = createMockUser();
      const existingTransaction = createMockTransaction({ userId: mockUser.id });

      prismaMock.transaction.findUnique.mockResolvedValue(existingTransaction);
      prismaMock.transaction.delete.mockResolvedValue(existingTransaction);

      await service.deleteTransaction(mockUser as any, 'test-transaction-id');

      expect(prismaMock.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'test-transaction-id' },
      });
    });

    it('should throw ForbiddenException if transaction not found', async () => {
      const mockUser = createMockUser();
      prismaMock.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteTransaction(mockUser as any, 'non-existent-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if transaction belongs to another user', async () => {
      const mockUser = createMockUser();
      const otherUserTransaction = createMockTransaction({
        userId: 'other-user-id',
      });

      prismaMock.transaction.findUnique.mockResolvedValue(otherUserTransaction);

      await expect(
        service.deleteTransaction(mockUser as any, 'test-transaction-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});