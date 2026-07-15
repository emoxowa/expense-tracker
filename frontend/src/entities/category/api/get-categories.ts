import { Category } from '@expence-tracker/shared';
import { apiFetch } from '@/shared/api';

/**
 * Категории текущего пользователя. Нужны для джойна имён/иконок к транзакциям.
 * Токен передаёт вызывающий слой (виджет) — entity не тянет сессию.
 */
export function getCategories(accessToken: string): Promise<Category[]> {
  return apiFetch<Category[]>('/categories', { accessToken });
}
