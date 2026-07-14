/**
 * Запрос пользователя по id. Возвращает публичное представление
 * (без passwordHash) — используется для GET /auth/me.
 */
export class GetUserByIdQuery {
  constructor(public readonly id: string) {}
}
