# Expence Tracker

Трекер расходов. Монорепозиторий на npm workspaces.

## Стек

- **Монорепо:** npm workspaces
- **Фронтенд:** Next.js 16 (App Router, TypeScript) + Tailwind CSS
- **Бэкенд:** Nest.js (TypeScript)
- **БД:** PostgreSQL
- **ORM:** Prisma
- **Общий код:** `packages/shared` (общие типы/DTO)
- **Линт/формат:** ESLint + Prettier
- **Инфраструктура:** Docker Compose (PostgreSQL)

## Структура

```
frontend/   # Next.js 16
backend/    # Nest.js + Prisma
packages/
  shared/   # общие TypeScript-типы
```

## Начало работы

> На текущем этапе создан только каркас. Зависимости ещё не установлены.

```bash
# 1. Установить зависимости (следующий этап)
npm install

# 2. Поднять PostgreSQL
cp .env.example .env
docker compose up -d

# 3. Применить схему Prisma
cp backend/.env.example backend/.env
npm run prisma:migrate --workspace @expence-tracker/backend

# 4. Запустить приложения
npm run dev
```

## Полезные команды

| Команда                | Описание                            |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Запуск всех приложений в dev-режиме |
| `npm run dev:frontend` | Только фронтенд                     |
| `npm run dev:backend`  | Только бэкенд                       |
| `npm run build`        | Сборка всех пакетов                 |
| `npm run lint`         | ESLint по всему репозиторию         |
| `npm run format`       | Форматирование Prettier             |
