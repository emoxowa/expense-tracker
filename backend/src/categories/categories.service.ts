import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  Category as PublicCategory,
  User as PublicUser,
} from '@expence-tracker/shared';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetUserByIdQuery } from '../users/queries/get-user-by-id.query';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async create(
    userId: string,
    dto: CreateCategoryDto,
  ): Promise<PublicCategory> {
    // Обращение к модулю-владельцу пользователей только через CQRS-шину.
    const user = await this.queryBus.execute<
      GetUserByIdQuery,
      PublicUser | null
    >(new GetUserByIdQuery(userId));
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    try {
      const category = await this.prisma.category.create({
        data: { ...dto, userId },
      });
      return this.toPublicCategory(category);
    } catch (error) {
      throw this.mapUniqueNameError(error);
    }
  }

  async findAll(userId: string): Promise<PublicCategory[]> {
    const categories = await this.prisma.category.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return categories.map((category) => this.toPublicCategory(category));
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<PublicCategory> {
    await this.getOwnedOrThrow(userId, id);

    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: dto,
      });
      return this.toPublicCategory(category);
    } catch (error) {
      throw this.mapUniqueNameError(error);
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.category.delete({ where: { id } });
  }

  /** Проверяет, что категория существует и принадлежит пользователю. */
  private async getOwnedOrThrow(userId: string, id: string): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }
    return category;
  }

  /**
   * Нарушение @@unique([userId, name]) → 409. Прочие ошибки пробрасываем.
   */
  private mapUniqueNameError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        'Категория с таким названием уже существует',
      );
    }
    return error;
  }

  private toPublicCategory(category: Category): PublicCategory {
    return {
      id: category.id,
      name: category.name,
      color: category.color ?? undefined,
      icon: category.icon ?? undefined,
    };
  }
}
