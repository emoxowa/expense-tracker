import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { GetCategoryByIdHandler } from './queries/handlers/get-category-by-id.handler';

const QueryHandlers = [GetCategoryByIdHandler];

/**
 * Модуль категорий трат. CRUD реализован обычным сервисом (PrismaService),
 * а к модулю пользователей обращается только через CQRS-шину (QueryBus),
 * поэтому импортирует CqrsModule. JwtAuthGuard/JwtStrategy регистрируются
 * в AuthModule, который уже загружен в AppModule.
 *
 * Наружу категории отдаются только через CQRS-запросы (GetCategoryByIdQuery) —
 * так модуль транзакций проверяет владение категорией, не импортируя сервис.
 */
@Module({
  imports: [CqrsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, ...QueryHandlers],
})
export class CategoriesModule {}
