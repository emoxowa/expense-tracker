import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import {
  AuthResponse,
  CONSENT_DOCS_VERSION,
  User as PublicUser,
} from '@expence-tracker/shared';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserCommand } from '../users/commands/create-user.command';
import { GetUserByEmailQuery } from '../users/queries/get-user-by-email.query';
import { GetUserByIdQuery } from '../users/queries/get-user-by-id.query';
import { JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.queryBus.execute<
      GetUserByEmailQuery,
      User | null
    >(new GetUserByEmailQuery(dto.email));
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    // Отметки времени ставим на сервере: клиентским датам доверять нельзя.
    const consentedAt = new Date();
    const user = await this.commandBus.execute<CreateUserCommand, User>(
      new CreateUserCommand({
        email: dto.email,
        passwordHash,
        name: dto.name,
        personalDataConsentAt: consentedAt,
        privacyPolicyAcceptedAt: consentedAt,
        consentDocsVersion: CONSENT_DOCS_VERSION,
      }),
    );

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.queryBus.execute<GetUserByEmailQuery, User | null>(
      new GetUserByEmailQuery(dto.email),
    );
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.queryBus.execute<
      GetUserByIdQuery,
      PublicUser | null
    >(new GetUserByIdQuery(userId));
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  private buildAuthResponse(user: User): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwt.sign(payload),
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
