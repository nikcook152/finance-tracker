import { Controller, UseGuards, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto'; // Import this
import type { User } from '@prisma/client';

@UseGuards(AuthGuard('jwt')) // Protect all routes in this controller
@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  getTransactions(@GetUser() user: User) {
    return this.transactionsService.getTransactions(user);
  }

  @Post()
  createTransaction(@GetUser() user: User, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.createTransaction(user, dto);
  }

  @Patch(':id')
  updateTransaction(
    @GetUser() user: User,
    @Param('id') transactionId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.updateTransaction(user, transactionId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  deleteTransaction(
    @GetUser() user: User,
    @Param('id') transactionId: string,
  ) {
    return this.transactionsService.deleteTransaction(user, transactionId);
  }
}