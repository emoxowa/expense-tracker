import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { TransactionsQueryDto, TransactionType } from '@expence-tracker/shared';
import { $Enums } from '@prisma/client';

export class GetTransactionsDto implements TransactionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  // ValidateIf вместо IsOptional: без обоих параметров фильтра по дате нет,
  // но month в одиночку бессмыслен — год обязателен.
  @ValidateIf(
    (dto: GetTransactionsDto) =>
      dto.month !== undefined || dto.year !== undefined,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsEnum($Enums.TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
