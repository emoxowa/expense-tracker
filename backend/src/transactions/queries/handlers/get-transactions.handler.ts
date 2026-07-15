import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionsResponse } from '@expence-tracker/shared';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildDateRange, toPublicTransaction } from '../../transactions.mapper';
import { GetTransactionsQuery } from '../get-transactions.query';

@QueryHandler(GetTransactionsQuery)
export class GetTransactionsHandler implements IQueryHandler<
  GetTransactionsQuery,
  TransactionsResponse
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTransactionsQuery): Promise<TransactionsResponse> {
    const { userId, filter } = query;

    // Сводка считается по тому же where, что и список: ?type=EXPENSE даёт
    // totalIncome = 0, а не сумму доходов за период.
    const date = buildDateRange(filter.year, filter.month);
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(date ? { date } : {}),
    };

    const [transactions, grouped, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        // take/skip добавляем только когда заданы: без них возвращаем весь список.
        ...(filter.limit !== undefined ? { take: filter.limit } : {}),
        ...(filter.offset !== undefined ? { skip: filter.offset } : {}),
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
      }),
      // total — по тому же where, без limit/offset, для расчёта числа страниц.
      this.prisma.transaction.count({ where }),
    ]);

    const sumOf = (type: $Enums.TransactionType): Prisma.Decimal =>
      grouped.find((row) => row.type === type)?._sum.amount ??
      new Prisma.Decimal(0);

    const totalIncome = sumOf($Enums.TransactionType.INCOME);
    const totalExpense = sumOf($Enums.TransactionType.EXPENSE);

    return {
      items: transactions.map(toPublicTransaction),
      summary: {
        totalIncome: totalIncome.toNumber(),
        totalExpense: totalExpense.toNumber(),
        // Вычитаем в Decimal, а не во float.
        balance: totalIncome.minus(totalExpense).toNumber(),
      },
      total,
    };
  }
}
