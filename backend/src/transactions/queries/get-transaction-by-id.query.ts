export class GetTransactionByIdQuery {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {}
}
