import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import {
  TransactionType,
  UpdateTransactionDto as IUpdateTransactionDto,
} from '@expence-tracker/shared';
import { $Enums } from '@prisma/client';

/** Предел колонки Decimal(12, 2). */
const MAX_AMOUNT = 9_999_999_999.99;

export class UpdateTransactionDto implements IUpdateTransactionDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_AMOUNT)
  amount?: number;

  @IsOptional()
  @IsEnum($Enums.TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
