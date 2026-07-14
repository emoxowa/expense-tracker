import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RegisterDto as IRegisterDto } from '@expence-tracker/shared';

export class RegisterDto implements IRegisterDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsBoolean()
  @Equals(true, {
    message: 'Требуется согласие на обработку персональных данных',
  })
  personalDataConsent!: boolean;

  @IsBoolean()
  @Equals(true, {
    message: 'Требуется согласие с Политикой конфиденциальности',
  })
  privacyPolicyAccepted!: boolean;
}
