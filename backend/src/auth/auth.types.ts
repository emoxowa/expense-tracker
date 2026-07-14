/** Полезная нагрузка JWT: sub — id пользователя. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/** Что кладётся в req.user после успешной проверки токена. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
}
