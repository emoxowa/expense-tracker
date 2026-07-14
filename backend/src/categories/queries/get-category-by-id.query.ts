/**
 * Запрос категории по id в рамках владельца. Скоуп по userId — часть контракта:
 * чужая категория не находится, вызывающая сторона получает то же, что и для
 * несуществующей.
 */
export class GetCategoryByIdQuery {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {}
}
