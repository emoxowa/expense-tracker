import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { User as PublicUser } from '@expence-tracker/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetUserByIdQuery } from '../get-user-by-id.query';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<
  GetUserByIdQuery,
  PublicUser | null
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetUserByIdQuery): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: query.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
