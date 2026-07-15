import type { Category, Transaction } from '@expence-tracker/shared';
import { cn } from '@/shared/lib/utils';
import { TableCell, TableRow } from '@/shared/ui/table';

interface TransactionItemProps {
  transaction: Transaction;
  /** Категория, сджойненная по categoryId; может отсутствовать. */
  category?: Category;
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function TransactionItem({
  transaction,
  category,
}: TransactionItemProps) {
  const isIncome = transaction.type === 'INCOME';
  const amount = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: transaction.currency,
  }).format(transaction.amount);

  return (
    <TableRow>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {dateFormatter.format(new Date(transaction.date))}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5">
          {category?.icon && <span aria-hidden>{category.icon}</span>}
          <span>{category?.name ?? 'Без категории'}</span>
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {transaction.description ?? '—'}
      </TableCell>
      <TableCell
        className={cn(
          'text-right font-medium whitespace-nowrap tabular-nums',
          isIncome ? 'text-emerald-600' : 'text-foreground',
        )}
      >
        {isIncome ? '+' : '−'}
        {amount}
      </TableCell>
    </TableRow>
  );
}
