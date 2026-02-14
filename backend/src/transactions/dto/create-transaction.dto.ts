import { IsString, IsNotEmpty, IsDateString, IsEnum } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  encryptedData: string; // Base64-encoded AES-GCM encrypted JSON

  @IsString()
  @IsNotEmpty()
  iv: string; // Base64-encoded initialization vector

  @IsDateString()
  date: string; // Kept unencrypted for sorting

  @IsEnum(TransactionType)
  type: TransactionType; // Kept unencrypted for filtering
}