import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Category as PublicCategory } from '@expence-tracker/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetCategoryByIdQuery } from '../get-category-by-id.query';

@QueryHandler(GetCategoryByIdQuery)
export class GetCategoryByIdHandler implements IQueryHandler<
  GetCategoryByIdQuery,
  PublicCategory | null
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCategoryByIdQuery): Promise<PublicCategory | null> {
    const category = await this.prisma.category.findFirst({
      where: { id: query.id, userId: query.userId },
    });
    if (!category) {
      return null;
    }
    return {
      id: category.id,
      name: category.name,
      color: category.color ?? undefined,
      icon: category.icon ?? undefined,
    };
  }
}
