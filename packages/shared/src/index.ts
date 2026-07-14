/**
 * Общие типы и DTO, разделяемые фронтендом и бэкендом.
 * Это стартовый задел — расширяется по мере развития доменной модели.
 */

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface CreateCategoryDto {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  color?: string;
  icon?: string;
}

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface Transaction {
  id: string;
  /** Всегда положительная — направление задаёт type. */
  amount: number;
  type: TransactionType;
  currency: string;
  description?: string;
  categoryId: string;
  date: string; // ISO-дата
  createdAt: string; // ISO-дата
}

export interface CreateTransactionDto {
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string; // ISO-дата
  description?: string;
}

export interface UpdateTransactionDto {
  amount?: number;
  type?: TransactionType;
  categoryId?: string;
  date?: string;
  description?: string;
}

/** Query-параметры GET /transactions. month можно указать только вместе с year. */
export interface TransactionsQueryDto {
  month?: number; // 1..12
  year?: number;
  type?: TransactionType;
  categoryId?: string;
}

/** Сводка считается по тем же фильтрам, что и список. */
export interface TransactionsSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number; // totalIncome - totalExpense
}

export interface TransactionsResponse {
  items: Transaction[];
  summary: TransactionsSummary;
}

/** Публичное представление пользователя — без хэша пароля. */
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string; // ISO-дата
}

/**
 * Редакция Политики конфиденциальности и Согласия на обработку ПД.
 * Меняется вместе с текстом документов — по ней видно, с какой версией
 * согласился пользователь.
 */
export const CONSENT_DOCS_VERSION = '2026-07-13';

export interface RegisterDto {
  email: string;
  name?: string;
  password: string;
  /** Согласие на обработку персональных данных — обязательно true. */
  personalDataConsent: boolean;
  /** Ознакомление с Политикой конфиденциальности — обязательно true. */
  privacyPolicyAccepted: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
