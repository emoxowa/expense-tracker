import { CreateTransactionDto } from '@expence-tracker/shared';

export class CreateTransactionCommand {
  constructor(
    public readonly userId: string,
    public readonly data: CreateTransactionDto,
  ) {}
}
