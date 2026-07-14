import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UpdateCategoryDto as IUpdateCategoryDto } from '@expence-tracker/shared';

export class UpdateCategoryDto implements IUpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
