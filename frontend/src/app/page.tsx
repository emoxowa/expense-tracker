import Link from 'next/link';
import { Button } from '@/shared/ui/button';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Expence Tracker</h1>
      <p className="text-lg text-muted-foreground">
        Каркас приложения готов. Начнём добавлять расходы.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/login">Войти</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/register">Зарегистрироваться</Link>
        </Button>
      </div>
    </main>
  );
}
