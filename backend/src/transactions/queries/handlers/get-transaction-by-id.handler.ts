import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Transaction as PublicTransaction } from '@expence-tracker/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  findOwnedTransactionOrThrow,
  toPublicTransaction,
} from '../../transactions.mapper';
import { GetTransactionByIdQuery } from '../get-transaction-by-id.query';

@QueryHandler(GetTransactionByIdQuery)
export class GetTransactionByIdHandler implements IQueryHandler<
  GetTransactionByIdQuery,
  PublicTransaction
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTransactionByIdQuery): Promise<PublicTransaction> {
    const transaction = await findOwnedTransactionOrThrow(
      this.prisma,
      query.userId,
      query.id,
    );
    return toPublicTransaction(transaction);
  }
}
