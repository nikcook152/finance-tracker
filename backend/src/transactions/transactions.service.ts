import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto'; // Import this
import { User } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  // Get all transactions for a specific user
  getTransactions(user: User) {
    return this.prisma.transaction.findMany({
      where: {
        userId: user.id,
      },
    });
  }

  // Create a new transaction for a specific user
  createTransaction(user: User, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        ...dto,
        date: new Date(dto.date), // Convert date string to Date object
        userId: user.id,
      },
    });
  }

  async updateTransaction(user: User, transactionId: string, dto: UpdateTransactionDto) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.userId !== user.id) {
      throw new ForbiddenException('Access to resource denied');
    }

    const { date, ...restOfDto } = dto;
    const dataToUpdate: any = { ...restOfDto };

    if (date) {
      dataToUpdate.date = new Date(date);
    }

    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: dataToUpdate, // Use the corrected data object
    });
  }

  async deleteTransaction(user: User, transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.userId !== user.id) {
      throw new ForbiddenException('Access to resource denied');
    }

    return this.prisma.transaction.delete({
      where: { id: transactionId },
    });
  }
}
