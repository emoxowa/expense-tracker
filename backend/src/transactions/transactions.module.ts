import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateTransactionHandler } from './commands/handlers/create-transaction.handler';
import { DeleteTransactionHandler } from './commands/handlers/delete-transaction.handler';
import { UpdateTransactionHandler } from './commands/handlers/update-transaction.handler';
import { GetTransactionByIdHandler } from './queries/handlers/get-transaction-by-id.handler';
import { GetTransactionsHandler } from './queries/handlers/get-transactions.handler';
import { TransactionsController } from './transactions.controller';

const CommandHandlers = [
  CreateTransactionHandler,
  UpdateTransactionHandler,
  DeleteTransactionHandler,
];
const QueryHandlers = [GetTransactionsHandler, GetTransactionByIdHandler];

/**
 * Модуль учёта доходов и расходов. Вся логика живёт в CQRS-хендлерах,
 * контроллер только раскладывает запросы по шинам — сервиса-прослойки нет.
 * Владение категорией проверяется через GetCategoryByIdQuery (CategoriesModule).
 */
@Module({
  imports: [CqrsModule],
  controllers: [TransactionsController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class TransactionsModule {}
