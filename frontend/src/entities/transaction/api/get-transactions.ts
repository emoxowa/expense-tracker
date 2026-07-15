import { TransactionsResponse } from '@expence-tracker/shared';
import { apiFetch } from '@/shared/api';

interface GetTransactionsParams {
  limit: number;
  offset: number;
}

/**
 * Страница транзакций текущего пользователя (сортировка — свежие первыми).
 * Токен передаёт вызывающий слой (виджет) — entity не тянет сессию.
 */
export function getTransactions(
  accessToken: string,
  { limit, offset }: GetTransactionsParams,
): Promise<TransactionsResponse> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiFetch<TransactionsResponse>(`/transactions?${query.toString()}`, {
    accessToken,
  });
}
