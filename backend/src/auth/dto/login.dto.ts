import { IsEmail, IsString, MinLength } from 'class-validator';
import { LoginDto as ILoginDto } from '@expence-tracker/shared';

export class LoginDto implements ILoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
