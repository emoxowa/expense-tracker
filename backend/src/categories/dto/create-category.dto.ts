import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateCategoryDto as ICreateCategoryDto } from '@expence-tracker/shared';

export class CreateCategoryDto implements ICreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
