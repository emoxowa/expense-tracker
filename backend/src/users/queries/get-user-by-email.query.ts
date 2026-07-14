/**
 * Запрос пользователя по email. Возвращает полную запись (включая
 * passwordHash) — нужна Auth для проверки пароля и уникальности email.
 */
export class GetUserByEmailQuery {
  constructor(public readonly email: string) {}
}
