import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Transaction as PublicTransaction } from '@expence-tracker/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ensureCategoryOwnedOrThrow,
  mapPrismaError,
  toPublicTransaction,
} from '../../transactions.mapper';
import { CreateTransactionCommand } from '../create-transaction.command';

@CommandHandler(CreateTransactionCommand)
export class CreateTransactionHandler implements ICommandHandler<
  CreateTransactionCommand,
  PublicTransaction
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: CreateTransactionCommand): Promise<PublicTransaction> {
    const { userId, data } = command;

    // Успешная проверка категории попутно доказывает, что пользователь существует:
    // категория не может пережить своего владельца (FK с каскадом).
    await ensureCategoryOwnedOrThrow(this.queryBus, userId, data.categoryId);

    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          amount: new Prisma.Decimal(data.amount),
          type: data.type,
          description: data.description,
          date: new Date(data.date),
          categoryId: data.categoryId,
          userId,
        },
      });
      return toPublicTransaction(transaction);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
