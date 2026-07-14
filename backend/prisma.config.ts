import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 больше не читает `url` из schema.prisma — строка подключения
// для CLI-команд (migrate/studio) задаётся здесь. В рантайме приложение
// подключается через driver adapter (@prisma/adapter-pg), см. PrismaService.
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
  },
});
