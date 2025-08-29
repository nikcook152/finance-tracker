import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
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
}
