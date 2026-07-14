import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeleteTransactionCommand } from '../delete-transaction.command';

@CommandHandler(DeleteTransactionCommand)
export class DeleteTransactionHandler implements ICommandHandler<
  DeleteTransactionCommand,
  void
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteTransactionCommand): Promise<void> {
    // deleteMany со скоупом по userId: проверка владения и удаление одним
    // запросом. Чужая транзакция даёт count = 0, то есть 404.
    const { count } = await this.prisma.transaction.deleteMany({
      where: { id: command.id, userId: command.userId },
    });
    if (count === 0) {
      throw new NotFoundException('Транзакция не найдена');
    }
  }
}
