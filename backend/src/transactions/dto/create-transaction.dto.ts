import { IsString, IsNotEmpty, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  amount: number;

  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsEnum(TransactionType)
  type: TransactionType; // Must be 'INCOME' or 'EXPENSE'
}