'use client';

import { useEffect, useState } from 'react';
import { getSession, type Session } from './session';

interface UseSessionResult {
  session: Session | null;
  /** true до чтения localStorage на клиенте — защищает от hydration mismatch. */
  isLoading: boolean;
}

/**
 * Читает сессию из localStorage на клиенте. На сервере и при первом рендере
 * возвращает null + isLoading=true, чтобы разметка совпадала с серверной.
 */
export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSession(getSession());
    setIsLoading(false);
  }, []);

  return { session, isLoading };
}
