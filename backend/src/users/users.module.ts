import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { GetUserByEmailHandler } from './queries/handlers/get-user-by-email.handler';
import { GetUserByIdHandler } from './queries/handlers/get-user-by-id.handler';

const CommandHandlers = [CreateUserHandler];
const QueryHandlers = [GetUserByEmailHandler, GetUserByIdHandler];

/**
 * Модуль-владелец данных пользователя. Наружу не экспортирует сервисов —
 * доступ к пользователям только через CQRS-шину (CommandBus/QueryBus),
 * поэтому другие модули (Auth) не импортируют его напрямую.
 */
@Module({
  imports: [CqrsModule],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class UsersModule {}
