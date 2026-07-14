-- Переименование Expense → Transaction с сохранением данных.
-- Prisma не распознаёт rename и сгенерировала бы DROP TABLE + CREATE TABLE,
-- поэтому SQL написан вручную.

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- RenameTable
ALTER TABLE "Expense" RENAME TO "Transaction";
ALTER TABLE "Transaction" RENAME COLUMN "spentAt" TO "date";

-- AddColumn: временный DEFAULT нужен только для бэкфилла существующих строк —
-- в схеме у type дефолта нет, иначе получим drift.
ALTER TABLE "Transaction" ADD COLUMN "type" "TransactionType" NOT NULL DEFAULT 'EXPENSE';
ALTER TABLE "Transaction" ALTER COLUMN "type" DROP DEFAULT;

-- RenameConstraint / RenameIndex — под именование Prisma
ALTER TABLE "Transaction" RENAME CONSTRAINT "Expense_pkey" TO "Transaction_pkey";
ALTER TABLE "Transaction" RENAME CONSTRAINT "Expense_userId_fkey" TO "Transaction_userId_fkey";
ALTER TABLE "Transaction" RENAME CONSTRAINT "Expense_categoryId_fkey" TO "Transaction_categoryId_fkey";
ALTER INDEX "Expense_categoryId_idx" RENAME TO "Transaction_categoryId_idx";

-- Индекс под фильтр по периоду вместо простого userId
DROP INDEX "Expense_userId_idx";
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
