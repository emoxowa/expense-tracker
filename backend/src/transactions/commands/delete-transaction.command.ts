export class DeleteTransactionCommand {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {}
}
