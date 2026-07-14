import { UpdateTransactionDto } from '@expence-tracker/shared';

export class UpdateTransactionCommand {
  constructor(
    public readonly userId: string,
    public readonly id: string,
    public readonly data: UpdateTransactionDto,
  ) {}
}
