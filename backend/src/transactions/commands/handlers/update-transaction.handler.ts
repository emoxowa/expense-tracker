import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Transaction as PublicTransaction } from '@expence-tracker/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ensureCategoryOwnedOrThrow,
  findOwnedTransactionOrThrow,
  mapPrismaError,
  toPublicTransaction,
} from '../../transactions.mapper';
import { UpdateTransactionCommand } from '../update-transaction.command';

@CommandHandler(UpdateTransactionCommand)
export class UpdateTransactionHandler implements ICommandHandler<
  UpdateTransactionCommand,
  PublicTransaction
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: UpdateTransactionCommand): Promise<PublicTransaction> {
    const { userId, id, data } = command;

    await findOwnedTransactionOrThrow(this.prisma, userId, id);

    if (data.categoryId !== undefined) {
      await ensureCategoryOwnedOrThrow(this.queryBus, userId, data.categoryId);
    }

    try {
      const transaction = await this.prisma.transaction.update({
        where: { id },
        data: {
          ...data,
          amount:
            data.amount !== undefined
              ? new Prisma.Decimal(data.amount)
              : undefined,
          date: data.date !== undefined ? new Date(data.date) : undefined,
        },
      });
      return toPublicTransaction(transaction);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
