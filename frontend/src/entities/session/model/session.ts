import { User } from '@expence-tracker/shared';

/**
 * Модель сессии: хранение JWT и данных пользователя в localStorage.
 * Функции безопасны для SSR — на сервере просто возвращают null.
 */

const TOKEN_KEY = 'expence-tracker:accessToken';
const USER_KEY = 'expence-tracker:user';

export interface Session {
  accessToken: string;
  user: User;
}

export function saveSession(session: Session): void {
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!accessToken || !rawUser) return null;
  try {
    return { accessToken, user: JSON.parse(rawUser) as User };
  } catch {
    clearSession();
    return null;
  }
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
