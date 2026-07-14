import { NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  Category as PublicCategory,
  Transaction as PublicTransaction,
} from '@expence-tracker/shared';
import { Prisma, Transaction } from '@prisma/client';
import { GetCategoryByIdQuery } from '../categories/queries/get-category-by-id.query';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Decimal → number на границе ответа. Decimal(12, 2) укладывается в 2^53 без
 * потери точности, а Decimal.toJSON() отдал бы строку — поэтому маппер
 * обязателен на всех путях ответа. Арифметика над суммами делается в Decimal.
 */
export const decimalToNumber = (value: Prisma.Decimal | null): number =>
  value ? value.toNumber() : 0;

export const toPublicTransaction = (
  transaction: Transaction,
): PublicTransaction => ({
  id: transaction.id,
  amount: decimalToNumber(transaction.amount),
  type: transaction.type,
  currency: transaction.currency,
  description: transaction.description ?? undefined,
  categoryId: transaction.categoryId,
  date: transaction.date.toISOString(),
  createdAt: transaction.createdAt.toISOString(),
});

/**
 * Полуинтервал [gte, lt) в UTC. month без year отсекается валидацией DTO,
 * поэтому здесь достаточно проверить year.
 */
export const buildDateRange = (
  year?: number,
  month?: number,
): { gte: Date; lt: Date } | undefined => {
  if (year === undefined) {
    return undefined;
  }
  if (month === undefined) {
    return {
      gte: new Date(Date.UTC(year, 0, 1)),
      lt: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
};

/** Чужая транзакция маскируется под 404 — как и в категориях. */
export const findOwnedTransactionOrThrow = async (
  prisma: PrismaService,
  userId: string,
  id: string,
): Promise<Transaction> => {
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
  });
  if (!transaction) {
    throw new NotFoundException('Транзакция не найдена');
  }
  return transaction;
};

/**
 * Категория — чужой агрегат, поэтому спрашиваем её через шину. Запрос скоупится
 * по userId: чужая категория не найдётся и даст 404 наравне с несуществующей.
 * Внешний ключ такую проверку не заменяет — он пропустил бы категорию другого
 * пользователя.
 */
export const ensureCategoryOwnedOrThrow = async (
  queryBus: QueryBus,
  userId: string,
  categoryId: string,
): Promise<void> => {
  const category = await queryBus.execute<
    GetCategoryByIdQuery,
    PublicCategory | null
  >(new GetCategoryByIdQuery(userId, categoryId));
  if (!category) {
    throw new NotFoundException('Категория не найдена');
  }
};

/**
 * P2025 — запись исчезла между проверкой владения и записью;
 * P2003 — внешний ключ указывает в никуда (категорию удалили в гонке).
 * Прочие ошибки пробрасываем.
 */
export const mapPrismaError = (error: unknown): unknown => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return new NotFoundException('Транзакция не найдена');
    }
    if (error.code === 'P2003') {
      return new NotFoundException('Категория не найдена');
    }
  }
  return error;
};
