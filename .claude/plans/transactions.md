# Модуль транзакций (доходы + расходы)

## Контекст

Задача из `.claude/prompts/transactions.md` — центральный модуль учёта доходов и
расходов: модель `Transaction` (amount, type income/expense, description, date,
categoryId, userId), CRUD-эндпоинты и агрегация по месяцу/году.

Два расхождения между формулировкой задачи и реальным кодом, разрешённые с пользователем:

1. **Модель уже частично есть.** В `schema.prisma` лежит модель `Expense`
   (amount, currency, description, spentAt, categoryId, userId), но модуля для неё
   нет — она нигде не используется в коде. Решение: **переименовать `Expense` →
   `Transaction`**, добавить `type`, переименовать `spentAt` → `date`. Одна доменная
   сущность вместо двух пересекающихся.
2. **`categories` — не CQRS.** Вопреки формулировке «следуй структуре categories +
   взаимодействие через CQRS», модуль категорий — это обычный сервис поверх Prisma;
   шина там используется только для обращения к чужому модулю `users`. Полный CQRS
   есть только в `users`. Решение: **делать полный CQRS** (как в `users`) —
   это явное требование задачи.

Объём: только backend + `packages/shared`. Фронтенд — отдельной задачей.
Новых зависимостей не добавляем (`@nestjs/cqrs`, `class-validator`,
`class-transformer` уже есть). Тестов в репозитории нет — тестовые команды не выдумываем.

## Архитектурные решения

| Вопрос | Решение | Обоснование |
|---|---|---|
| Сервис-обёртка | Нет. Контроллер тонкий, работает только с `CommandBus`/`QueryBus`; общие чистые функции — в `transactions.mapper.ts` | Сервис был бы прокси над шиной. Прецедент — `users/` (только хендлеры) |
| Владение категорией | Новый CQRS-запрос `GetCategoryByIdQuery(userId, id)` в модуле `categories/` | Category — чужой агрегат; конвенция репо — доступ к чужому модулю только через шину. FK `P2003` владение не проверяет — чужая категория прошла бы |
| Существование пользователя | Отдельный `GetUserByIdQuery` **не делаем** | Категория с `userId` не существует без пользователя (FK). Успешная проверка категории уже это доказывает |
| `amount` в API | `number` | `Decimal(12,2)` ⇒ максимум ~10¹⁰ — далеко внутри `2^53`, потерь нет. Внутри бэкенда считаем в `Prisma.Decimal`, в `number` конвертируем только на границе ответа |
| `currency` | Остаётся в модели (`@default("USD")`), **в DTO не включаем** | Мультивалютности нет; поле отдаём в ответе, чтобы фронт форматировал |
| Чужая запись | `NotFoundException` (404), не 403 | `ForbiddenException` в проекте не используется — `getOwnedOrThrow` в categories маскирует чужое под 404 |
| Summary при фильтрах | Считается по тому же `where`, что и `items` | Предсказуемо: `?type=EXPENSE` ⇒ `totalIncome = 0` |

## 1. Prisma-схема

`backend/prisma/schema.prisma` — заменить модель `Expense`:

```prisma
enum TransactionType {
  INCOME
  EXPENSE
}

model Transaction {
  id          String          @id @default(cuid())
  amount      Decimal         @db.Decimal(12, 2)
  type        TransactionType
  currency    String          @default("USD")
  description String?
  date        DateTime
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])

  @@index([userId, date])   // основной фильтр: свои транзакции за период
  @@index([categoryId])
}
```

Обратные связи: `User.expenses Expense[]` → `transactions Transaction[]`,
`Category.expenses Expense[]` → `transactions Transaction[]`.

Составной `[userId, date]` покрывает и запрос только по `userId` (левый префикс) —
отдельный `@@index([userId])` избыточен.

## 2. Миграция — SQL пишем вручную

Автогенерация здесь **опасна**: Prisma не распознаёт rename и сгенерирует
`DROP TABLE "Expense"` + `CREATE TABLE "Transaction"`. Таблица сейчас пустая, но
полагаться на это нельзя.

```bash
docker compose up -d
cd backend && npx prisma migrate dev --create-only --name rename_expense_to_transaction
```

Затем **полностью заменить** содержимое сгенерированного `migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- Rename table (данные сохраняются)
ALTER TABLE "Expense" RENAME TO "Transaction";
ALTER TABLE "Transaction" RENAME COLUMN "spentAt" TO "date";

-- Новая колонка: временный DEFAULT для бэкфилла существующих строк
ALTER TABLE "Transaction" ADD COLUMN "type" "TransactionType" NOT NULL DEFAULT 'EXPENSE';
ALTER TABLE "Transaction" ALTER COLUMN "type" DROP DEFAULT;

-- Переименование ограничений/индексов под именование Prisma
ALTER TABLE "Transaction" RENAME CONSTRAINT "Expense_pkey" TO "Transaction_pkey";
ALTER TABLE "Transaction" RENAME CONSTRAINT "Expense_userId_fkey" TO "Transaction_userId_fkey";
ALTER TABLE "Transaction" RENAME CONSTRAINT "Expense_categoryId_fkey" TO "Transaction_categoryId_fkey";
ALTER INDEX "Expense_categoryId_idx" RENAME TO "Transaction_categoryId_idx";

DROP INDEX "Expense_userId_idx";
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
```

`DROP DEFAULT` обязателен — в схеме у `type` дефолта нет, иначе drift.

Применить: `npm run prisma:migrate --workspace @expence-tracker/backend`, затем
`npm run prisma:generate --workspace @expence-tracker/backend`. Если `migrate dev`
после применения предлагает ещё одну миграцию — SQL разошёлся со схемой.

## 3. `packages/shared/src/index.ts`

Удалить `Expense` и `CreateExpenseDto` (нигде не используются), добавить:

```ts
export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  currency: string;
  description?: string;
  categoryId: string;
  date: string;      // ISO-дата
  createdAt: string; // ISO-дата
}

export interface CreateTransactionDto {
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string;
  description?: string;
}

export interface UpdateTransactionDto {
  amount?: number;
  type?: TransactionType;
  categoryId?: string;
  date?: string;
  description?: string;
}

/** Query-параметры GET /transactions. month требует year. */
export interface TransactionsQueryDto {
  month?: number; // 1..12
  year?: number;
  type?: TransactionType;
  categoryId?: string;
}

export interface TransactionsSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number; // totalIncome - totalExpense
}

export interface TransactionsResponse {
  items: Transaction[];
  summary: TransactionsSummary;
}
```

Union `TransactionType` структурно совпадает с enum'ом Prisma (`'INCOME' | 'EXPENSE'`) —
присваивание в обе стороны работает без каста.

## 4. Файлы

**Новые — `backend/src/transactions/`:**

| Файл | Назначение |
|---|---|
| `transactions.module.ts` | `imports: [CqrsModule]`, `controllers: [TransactionsController]`, `providers: [...CommandHandlers, ...QueryHandlers]` — по образцу `users/users.module.ts` |
| `transactions.controller.ts` | `@Controller('transactions') @UseGuards(JwtAuthGuard)`, 5 эндпоинтов, только шины |
| `transactions.mapper.ts` | `toPublicTransaction`, `decimalToNumber`, `buildDateRange`, `findOwnedTransactionOrThrow`, `mapPrismaError` |
| `dto/create-transaction.dto.ts`, `dto/update-transaction.dto.ts`, `dto/get-transactions.dto.ts` | class-validator, `implements` shared-интерфейс, без `PartialType` (конвенция categories) |
| `commands/{create,update,delete}-transaction.command.ts` + `commands/handlers/*.handler.ts` | |
| `queries/{get-transactions,get-transaction-by-id}.query.ts` + `queries/handlers/*.handler.ts` | |

**Новые — `backend/src/categories/`:** `queries/get-category-by-id.query.ts`
(`class GetCategoryByIdQuery { constructor(public readonly userId: string, public readonly id: string) {} }`)
и `queries/handlers/get-category-by-id.handler.ts` (`findFirst({ where: { id, userId } })` → `PublicCategory | null`).

**Изменяемые:**
- [categories.module.ts](backend/src/categories/categories.module.ts) — добавить `GetCategoryByIdHandler` в `providers`
- [app.module.ts](backend/src/app.module.ts) — `TransactionsModule` в `imports`
- [schema.prisma](backend/prisma/schema.prisma), [packages/shared/src/index.ts](packages/shared/src/index.ts)
- [CLAUDE.md](CLAUDE.md) — секции про Prisma-схему и shared-типы упоминают `Expense`/`CreateExpenseDto`

## 5. DTO

`dto/create-transaction.dto.ts`:

```ts
const MAX_AMOUNT = 9_999_999_999.99; // Decimal(12,2)

export class CreateTransactionDto implements ICreateTransactionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_AMOUNT)
  amount!: number;                // знак несёт type, сумма всегда > 0

  @IsEnum($Enums.TransactionType) // валидатор синхронен с БД-энумом
  type!: TransactionType;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsISO8601()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
```

`update-transaction.dto.ts` — те же поля, каждое с `@IsOptional()` (у `categoryId`
дополнительно `@IsNotEmpty()`, чтобы не прислали `""`).

`dto/get-transactions.dto.ts` — query-строка приходит строками; `transform: true` в
глобальном `ValidationPipe` уже включён, но нужен `@Type`:

```ts
export class GetTransactionsDto implements TransactionsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12)
  month?: number;

  // year обязателен, если задан любой параметр периода
  @ValidateIf((dto: GetTransactionsDto) => dto.month !== undefined || dto.year !== undefined)
  @Type(() => Number) @IsInt() @Min(1970) @Max(2100)
  year?: number;

  @IsOptional() @IsEnum($Enums.TransactionType)
  type?: TransactionType;

  @IsOptional() @IsString() @IsNotEmpty()
  categoryId?: string;
}
```

`@ValidateIf` (а не `@IsOptional`) на `year` даёт: без параметров — без фильтра по дате;
`?month=3` без года — 400; `?year=2026` — весь год.

## 6. Нетривиальные фрагменты

`transactions.mapper.ts`:

```ts
/** Decimal → number на границе ответа: Decimal(12,2) укладывается в 2^53 без потерь. */
export const decimalToNumber = (value: Prisma.Decimal | null): number =>
  value ? value.toNumber() : 0;

export const toPublicTransaction = (tx: Transaction): PublicTransaction => ({
  id: tx.id,
  amount: decimalToNumber(tx.amount),
  type: tx.type,
  currency: tx.currency,
  description: tx.description ?? undefined,
  categoryId: tx.categoryId,
  date: tx.date.toISOString(),
  createdAt: tx.createdAt.toISOString(),
});

/** [gte, lt) в UTC. month без year отсекается валидацией DTO. */
export const buildDateRange = (year?: number, month?: number): { gte: Date; lt: Date } | undefined => {
  if (year === undefined) return undefined;
  if (month === undefined) {
    return { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
  }
  return { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) };
};

export const findOwnedTransactionOrThrow = async (
  prisma: PrismaService, userId: string, id: string,
): Promise<Transaction> => {
  const tx = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!tx) throw new NotFoundException('Транзакция не найдена'); // чужая маскируется под 404
  return tx;
};

/** P2025 — запись исчезла между проверкой и записью; P2003 — битый внешний ключ. */
export const mapPrismaError = (error: unknown): unknown => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') return new NotFoundException('Транзакция не найдена');
    if (error.code === 'P2003') return new NotFoundException('Категория не найдена');
  }
  return error;
};
```

`commands/handlers/create-transaction.handler.ts` — ядро проверки владения:

```ts
async execute(command: CreateTransactionCommand): Promise<PublicTransaction> {
  const { userId, data } = command;

  // Категория — чужой агрегат: спрашиваем через шину. Запрос скоупится по userId,
  // поэтому чужая категория даёт 404 наравне с несуществующей.
  const category = await this.queryBus.execute<GetCategoryByIdQuery, PublicCategory | null>(
    new GetCategoryByIdQuery(userId, data.categoryId),
  );
  if (!category) throw new NotFoundException('Категория не найдена');

  try {
    const tx = await this.prisma.transaction.create({
      data: {
        amount: new Prisma.Decimal(data.amount), // number → Decimal, без float-дрейфа
        type: data.type,
        description: data.description,
        date: new Date(data.date),
        categoryId: data.categoryId,
        userId,
      },
    });
    return toPublicTransaction(tx);
  } catch (error) {
    throw mapPrismaError(error);
  }
}
```

`update` — сначала `findOwnedTransactionOrThrow`, затем, **если в dto есть `categoryId`**,
та же проверка через `GetCategoryByIdQuery`, потом `prisma.transaction.update` с
`amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined` и
`date: dto.date ? new Date(dto.date) : undefined`, в try/catch с `mapPrismaError`.

`delete` — одним запросом, без предварительного чтения:

```ts
const { count } = await this.prisma.transaction.deleteMany({ where: { id, userId } });
if (count === 0) throw new NotFoundException('Транзакция не найдена');
```

`queries/handlers/get-transactions.handler.ts` — сводка через `groupBy`, арифметика в Decimal:

```ts
async execute(query: GetTransactionsQuery): Promise<TransactionsResponse> {
  const { userId, filter } = query;

  // Summary считается по ТОМУ ЖЕ where, что и items: ?type=EXPENSE ⇒ totalIncome = 0.
  const date = buildDateRange(filter.year, filter.month);
  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    ...(date ? { date } : {}),
  };

  const [items, grouped] = await Promise.all([
    this.prisma.transaction.findMany({ where, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
    this.prisma.transaction.groupBy({ by: ['type'], where, _sum: { amount: true } }),
  ]);

  const sumOf = (type: $Enums.TransactionType): Prisma.Decimal =>
    grouped.find((row) => row.type === type)?._sum.amount ?? new Prisma.Decimal(0);

  const income = sumOf($Enums.TransactionType.INCOME);
  const expense = sumOf($Enums.TransactionType.EXPENSE);

  return {
    items: items.map(toPublicTransaction),
    summary: {
      totalIncome: income.toNumber(),
      totalExpense: expense.toNumber(),
      balance: income.minus(expense).toNumber(), // вычитаем в Decimal, не во float
    },
  };
}
```

Контроллер — по образцу `categories.controller.ts` (`@CurrentUser() user: AuthenticatedUser`,
`@Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)`), но вместо сервиса вызывает
`this.commandBus.execute(...)` / `this.queryBus.execute(...)`; `GET /transactions`
принимает `@Query() dto: GetTransactionsDto`.

## 7. Порядок работ

1. `schema.prisma` — enum + модель `Transaction` + обратные связи в `User`/`Category`.
2. `migrate dev --create-only` → переписать SQL вручную (раздел 2) → `prisma:migrate` → `prisma:generate`.
3. `packages/shared/src/index.ts` — заменить `Expense`/`CreateExpenseDto`.
4. `categories/queries/get-category-by-id.{query,handler}.ts` + регистрация в `categories.module.ts`.
5. `transactions/transactions.mapper.ts` + `dto/*`.
6. `commands/*` и `queries/*` с хендлерами.
7. `transactions.controller.ts`, `transactions.module.ts`, подключение в `app.module.ts`.
8. Обновить `CLAUDE.md`.
9. Верификация.

## 8. Верификация

```bash
npm run prisma:generate --workspace @expence-tracker/backend
npm run build          # обязательно по условию задачи
npm run lint
npm run format:check
npm run dev:backend
```

Ручная проверка через curl (`TOKEN` — из `POST /auth/login`, `CAT` — id своей категории):

```bash
API=http://localhost:3001
# 201 на создание расхода и дохода
curl -s $API/transactions -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"amount\":1500.50,\"type\":\"EXPENSE\",\"categoryId\":\"$CAT\",\"date\":\"2026-07-14T00:00:00.000Z\"}"

# items + summary {totalIncome:5000, totalExpense:1500.5, balance:3499.5}
curl -s "$API/transactions?month=7&year=2026"        -H "Authorization: Bearer $TOKEN"
curl -s "$API/transactions?month=7&year=2026&type=EXPENSE" -H "Authorization: Bearer $TOKEN"  # totalIncome: 0
curl -s "$API/transactions?month=7"                  -H "Authorization: Bearer $TOKEN"  # 400: year обязателен
curl -s "$API/transactions?month=13&year=2026"       -H "Authorization: Bearer $TOKEN"  # 400
curl -s $API/transactions/$ID                        -H "Authorization: Bearer $TOKEN"  # 200
curl -s -X PATCH $API/transactions/$ID -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"categoryId":"чужая-категория"}'             # 404
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE $API/transactions/$ID -H "Authorization: Bearer $TOKEN"  # 204
curl -s -o /dev/null -w '%{http_code}\n' $API/transactions                              # 401 без токена
```

Отдельно проверить сериализацию: `amount` в JSON должен быть числом `1500.5`, а не
строкой `"1500.5"` — `Decimal.toJSON()` вернул бы строку, поэтому маппер обязателен
на **всех** путях ответа.

Тестов в репозитории нет — jest-команды не выдумываем.
