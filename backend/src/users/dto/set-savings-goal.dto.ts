// backend/src/users/dto/set-savings-goal.dto.ts
import { IsNumber, IsPositive } from 'class-validator';

export class SetSavingsGoalDto {
  @IsNumber()
  @IsPositive()
  amount: number;
}