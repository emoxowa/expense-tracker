# План: модуль категорий трат (Category)

## Context

Авторизация уже реализована (`AuthModule`, `UsersModule`, `PrismaModule`).
Нужно добавить пользовательские **категории трат** с полным CRUD. Категория
принадлежит пользователю (`userId`), защищена JWT-гардом, валидируется через
class-validator. Взаимодействие с User-модулем идёт **через CQRS** (не прямой
импорт сервисов) — так же, как это делает `AuthService`.

Требование добавляет поле `icon`, которого сейчас нет в схеме, и просит
проверять существование пользователя при создании категории через существующий
`GetUserByIdQuery`. Архитектура: у Category — **обычный сервис с методами** +
контроллер (как `Auth`), а CQRS используется только для обращения к чужому
(User) модулю.

## Чек-лист задач

### 1. Схема и shared-типы

- [ ] `backend/prisma/schema.prisma` — в модель `Category` добавить `icon String?`
      (рядом с `color String?`). `@@unique([userId, name])` и `onDelete: Cascade`
      уже есть.
- [ ] `packages/shared/src/index.ts` — в `interface Category` добавить `icon?: string;`
- [ ] `packages/shared/src/index.ts` — добавить интерфейсы:
      `ts
  export interface CreateCategoryDto { name: string; color?: string; icon?: string; }
  export interface UpdateCategoryDto { name?: string; color?: string; icon?: string; }
  `
- [ ] Сгенерировать клиент и применить миграцию (нужен поднятый Postgres —
      colima/docker):
      `bash
  npm run prisma:generate --workspace @expence-tracker/backend
  npm run prisma:migrate  --workspace @expence-tracker/backend   # name: add_category_icon
  `

### 2. DTO (`backend/src/categories/dto/`)

Паттерн — `backend/src/auth/dto/register.dto.ts` (класс `implements` shared-интерфейс + декораторы).

- [ ] `create-category.dto.ts` → `class CreateCategoryDto implements ICreateCategoryDto`:
      `@IsString() @IsNotEmpty() name!`, `@IsOptional() @IsString() color?`,
      `@IsOptional() @IsString() icon?`.
- [ ] `update-category.dto.ts` → `class UpdateCategoryDto implements IUpdateCategoryDto`:
      все поля `@IsOptional()` (name/color/icon).
- Глобальный `ValidationPipe({ whitelist, transform })` уже в `main.ts` — доп. пайпы не нужны.

### 3. `backend/src/categories/categories.service.ts` (`@Injectable`)

Инжектит `PrismaService` + `QueryBus`. Импорт `GetUserByIdQuery` из
`../users/queries/get-user-by-id.query` (как в `auth.service.ts`). Все операции
скоупятся по `userId`.

- [ ] `create(userId, dto)` — сначала `queryBus.execute(new GetUserByIdQuery(userId))`;
      `null` → `NotFoundException`. Затем `prisma.category.create({ data: { ...dto, userId } })`.
      Конфликт `@@unique([userId, name])` (Prisma `P2002`) → `ConflictException`
      (по образцу `auth.service.ts:33`).
- [ ] `findAll(userId)` → `prisma.category.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })`.
- [ ] `update(userId, id, dto)` — проверка владения (`findFirst({ where: { id, userId } })`,
      нет → `NotFoundException`), затем `prisma.category.update`; `P2002` → `ConflictException`.
- [ ] `remove(userId, id)` — проверка владения, затем `prisma.category.delete`.
- Возвращаемые типы — shared `Category` (маппинг `null → undefined` где нужно).

### 4. `backend/src/categories/categories.controller.ts`

Паттерн — `auth.controller.ts`. `@Controller('categories')`,
`@UseGuards(JwtAuthGuard)` на классе, везде `@CurrentUser() user` → `user.userId`.

- [ ] `POST /categories` → `create(user, dto)`
- [ ] `GET /categories` → `findAll(user)`
- [ ] `PATCH /categories/:id` → `update(user, id, dto)`
- [ ] `DELETE /categories/:id` (`@HttpCode(204)`) → `remove(user, id)`

### 5. `backend/src/categories/categories.module.ts`

- [ ] `ts
  @Module({
    imports: [CqrsModule],            // QueryBus для обращения к Users
    controllers: [CategoriesController],
    providers: [CategoriesService],
  })
  export class CategoriesModule {}
  `
      `PrismaModule` глобальный — импорт не нужен. `JwtAuthGuard`/`JwtStrategy`
      регистрируются в `AuthModule` (уже загружен) — `@UseGuards(JwtAuthGuard)`
      работает без доп. импортов.

### 6. Регистрация

- [ ] `backend/src/app.module.ts` — добавить `CategoriesModule` в `imports`
      (рядом с `AuthModule`).

## Проверка (end-to-end)

Предусловие: `npm install`, поднят Postgres, применена миграция.

- [ ] `npm run lint` и `npm run build` — чисто.
- [ ] `npm run dev:backend`, затем curl:
  - `POST /auth/register` → получить `accessToken`.
  - `POST /categories` (Bearer) `{ "name": "Еда", "color": "#f00", "icon": "🍔" }` → 201.
  - Повтор того же `name` → 409.
  - Запрос без токена → 401.
  - `GET /categories` → массив из одной категории.
  - `PATCH /categories/:id` `{ "name": "Продукты" }` → обновлено.
  - `PATCH`/`DELETE` чужого/несуществующего `id` → 404.
  - `DELETE /categories/:id` → 204; повторный `GET` → пустой массив.
