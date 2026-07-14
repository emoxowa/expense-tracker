# План: авторизация в API (Users + Auth через CQRS)

## Context

Бэкенд ([backend/](../../backend/)) был чистым Nest.js 11 scaffold: в `backend/src/` только `main.ts`, `app.module.ts`, `app.controller.ts`. Не было ни `PrismaModule`/`PrismaService`, ни CQRS, ни JWT, ни хэширования; у модели `User` в `schema.prisma` не было поля пароля. Задача — добавить авторизацию: модуль пользователей (имя, email, хэш пароля) и модуль авторизации через JWT с методами `login`/`register`. Ключевое требование — **модули не импортируют сервисы друг друга напрямую**, взаимодействие идёт через CQRS (`CommandBus`/`QueryBus`).

Согласованные решения:

- Хэширование — **bcrypt**.
- Токены — **только access-токен** (без refresh).
- **JwtAuthGuard + защищённый `GET /auth/me`** для end-to-end проверки.
- Общие типы User/Auth — **в `packages/shared`**, backend-DTO с `class-validator` их реализуют.

## Чек-лист задач

- [x] Установить зависимости (точно закреплённые версии): `@nestjs/cqrs`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/config`, `bcrypt`, `class-validator`, `class-transformer`, `@prisma/adapter-pg`; dev: `@types/passport-jwt`, `@types/bcrypt`
- [x] Адаптировать под Prisma 7: поле `passwordHash` в `User`, `prisma.config.ts`, driver adapter `@prisma/adapter-pg`
- [x] Добавить общие типы `User`/`RegisterDto`/`LoginDto`/`AuthResponse` в `packages/shared`
- [x] Создать `PrismaModule`/`PrismaService` (глобальный модуль, adapter-pg)
- [x] Создать модуль Users с CQRS-обработчиками (владелец данных, без экспорта сервисов)
- [x] Создать модуль Auth (JWT, guard, `@CurrentUser`, DTO, `/auth/me`)
- [x] Подключить модули в `AppModule`, добавить `ValidationPipe`, JWT-переменные в `.env.example`
- [x] Верификация: миграция, запуск, curl-сценарий, lint/format/typecheck

## Изменения схемы БД

`backend/prisma/schema.prisma` — в модель `User` добавлено поле `passwordHash String`.

**Prisma 7:** `url` в блоке `datasource` больше не поддерживается — строка подключения задаётся в `backend/prisma.config.ts` (CLI) и через driver adapter в `PrismaService` (рантайм). Миграция: `npm run prisma:migrate --workspace @expence-tracker/backend`.

## Общие типы — `packages/shared/src/index.ts`

- `User { id; email; name?; createdAt }` (без хэша)
- `RegisterDto { email; name?; password }`
- `LoginDto { email; password }`
- `AuthResponse { accessToken; user }`

## Prisma-обвязка — `backend/src/prisma/`

- `prisma.service.ts` — `PrismaService extends PrismaClient`, подключение через `new PrismaPg({ connectionString })`, `$connect()`/`$disconnect()`.
- `prisma.module.ts` — `@Global()`-модуль, экспортирует `PrismaService`.

## Модуль Users — `backend/src/users/` (владелец данных)

Регистрирует CQRS-обработчики; наружу сервисы не экспортирует — доступ только через шину.

- `commands/create-user.command.ts` + `commands/handlers/create-user.handler.ts` — создание через Prisma.
- `queries/get-user-by-email.query.ts` + handler — полная запись (включая `passwordHash`) или `null`.
- `queries/get-user-by-id.query.ts` + handler — публичное представление без `passwordHash`.
- `users.module.ts` — `imports: [CqrsModule]`, `providers: [...CommandHandlers, ...QueryHandlers]`.

## Модуль Auth — `backend/src/auth/` (JWT, без прямого импорта сервисов Users)

- `dto/register.dto.ts`, `dto/login.dto.ts` — `class-validator`, `implements` shared-интерфейсы.
- `auth.service.ts` — инъекция `CommandBus`, `QueryBus`, `JwtService`. **Никакого `UsersService`.**
  - `register`: `GetUserByEmailQuery` → при наличии `ConflictException`; `bcrypt.hash`; `CreateUserCommand`; токен.
  - `login`: `GetUserByEmailQuery` → `bcrypt.compare`, иначе `UnauthorizedException`; токен.
  - `getProfile`: `GetUserByIdQuery`.
- `strategies/jwt.strategy.ts`, `guards/jwt-auth.guard.ts`, `decorators/current-user.decorator.ts`, `auth.types.ts`.
- `auth.controller.ts` — `POST /auth/register`, `POST /auth/login`, `GET /auth/me` (под `JwtAuthGuard`).
- `auth.module.ts` — `imports: [CqrsModule, PassportModule, JwtModule.registerAsync(...)]`, `providers: [AuthService, JwtStrategy]`.

> Auth импортирует **классы команд/запросов** Users — это сообщения шины (контракт), их нельзя диспатчить без ссылки на класс. Прямой связи сервис↔сервис нет.

## Обвязка приложения

- `app.module.ts` — `imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, UsersModule, AuthModule]`.
- `main.ts` — глобальный `ValidationPipe({ whitelist: true, transform: true })`.
- `backend/.env.example` — `JWT_SECRET`, `JWT_EXPIRES_IN=15m`.

## Verification (end-to-end)

1. `npm install` из корня.
2. `cp .env.example .env` (корень и `backend/`); поднять Postgres (`docker compose up -d`; локально — через `colima start`).
3. `npm run prisma:generate` и `npm run prisma:migrate --workspace @expence-tracker/backend`.
4. `npm run dev:backend` (или `npm run build && node backend/dist/main.js`).
5. curl-сценарий:
   - `POST /auth/register` → `201`, `accessToken` + `user` без `passwordHash`.
   - повторный register → `409`.
   - `POST /auth/login` верный/неверный пароль → `200` / `401`.
   - `GET /auth/me` с токеном / без → `200` / `401`.
   - короткий пароль → `400` (валидация).
6. `npm run lint`, `npm run format:check` — чисто.

**Статус:** реализовано и проверено end-to-end на реальном Postgres — все сценарии проходят.
