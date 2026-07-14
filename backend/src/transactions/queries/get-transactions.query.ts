import { TransactionsQueryDto } from '@expence-tracker/shared';

export class GetTransactionsQuery {
  constructor(
    public readonly userId: string,
    public readonly filter: TransactionsQueryDto,
  ) {}
}
