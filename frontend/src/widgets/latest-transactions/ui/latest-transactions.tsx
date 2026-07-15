'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Category } from '@/entities/category';
import { getCategories } from '@/entities/category';
import { getAccessToken } from '@/entities/session';
import type { Transaction, TransactionsSummary } from '@/entities/transaction';
import { getTransactions, TransactionItem } from '@/entities/transaction';
import { ApiError } from '@/shared/api';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

const PAGE_SIZE = 10;

// Сводка приходит без валюты (бэкенд суммирует amount по всем записям),
// поэтому форматируем как обычное число, без символа валюты.
const amountFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
});

export function LatestTransactions() {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<TransactionsSummary | null>(null);
  const [categories, setCategories] = useState<Map<string, Category>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Категории грузим один раз — джойним к транзакциям по categoryId на клиенте.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;
    getCategories(token)
      .then((list) => {
        if (cancelled) return;
        setCategories(new Map(list.map((category) => [category.id, category])));
      })
      .catch(() => {
        // Имена категорий не критичны — при ошибке покажем «Без категории».
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError('Требуется авторизация.');
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getTransactions(token, { limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setTotal(response.total);
        setSummary(response.summary);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Не удалось загрузить транзакции.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const hasPrev = page > 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Последние транзакции</CardTitle>
        <CardDescription>
          {total > 0
            ? `${rangeStart}–${rangeEnd} из ${total}`
            : 'Записей пока нет'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summary && !error && (
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Доходы</dt>
              <dd className="font-medium text-emerald-600 tabular-nums">
                {amountFormatter.format(summary.totalIncome)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Расходы</dt>
              <dd className="font-medium tabular-nums">
                {amountFormatter.format(summary.totalExpense)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Баланс</dt>
              <dd
                className={cn(
                  'font-medium tabular-nums',
                  summary.balance < 0 ? 'text-destructive' : 'text-foreground',
                )}
              >
                {amountFormatter.format(summary.balance)}
              </dd>
            </div>
          </dl>
        )}
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Загрузка…
          </div>
        ) : error ? (
          <p className="text-destructive py-10 text-center text-sm">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Здесь появятся ваши доходы и расходы.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  category={categories.get(transaction.categoryId)}
                />
              ))}
            </TableBody>
          </Table>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev || isLoading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext || isLoading}
              onClick={() => setPage((current) => current + 1)}
            >
              Вперёд
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
