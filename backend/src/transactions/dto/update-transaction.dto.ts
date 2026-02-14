// backend/src/transactions/dto/update-transaction.dto.ts
import { IsString, IsNotEmpty, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class UpdateTransactionDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  encryptedData?: string; // Base64-encoded AES-GCM encrypted JSON

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  iv?: string; // Base64-encoded initialization vector

  @IsDateString()
  @IsOptional()
  date?: string; // Kept unencrypted for sorting

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType; // Kept unencrypted for filtering
}