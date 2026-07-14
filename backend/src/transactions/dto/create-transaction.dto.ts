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
  CreateTransactionDto as ICreateTransactionDto,
  TransactionType,
} from '@expence-tracker/shared';
import { $Enums } from '@prisma/client';

/** Предел колонки Decimal(12, 2). */
const MAX_AMOUNT = 9_999_999_999.99;

export class CreateTransactionDto implements ICreateTransactionDto {
  // Сумма всегда положительная — направление задаёт type.
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_AMOUNT)
  amount!: number;

  @IsEnum($Enums.TransactionType)
  type!: TransactionType;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsISO8601()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
