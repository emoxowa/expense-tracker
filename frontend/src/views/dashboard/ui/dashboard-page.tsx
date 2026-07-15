'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { clearSession, useSession } from '@/entities/session';
import { Button } from '@/shared/ui/button';
import { LatestTransactions } from '@/widgets/latest-transactions';

export function DashboardPage() {
  const router = useRouter();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login');
    }
  }, [isLoading, session, router]);

  function handleLogout() {
    clearSession();
    router.replace('/login');
  }

  // Пока читаем сессию из localStorage (или уже редиректим на /login).
  if (isLoading || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </main>
    );
  }

  const greetingName = session.user.name ?? session.user.email;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">С возвращением,</p>
          <h1 className="text-2xl font-bold tracking-tight">{greetingName}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Выйти
        </Button>
      </header>

      <LatestTransactions />
    </main>
  );
}
