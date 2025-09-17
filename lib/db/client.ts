// lib/db/client.ts
import { PrismaClient } from "@prisma/client"

declare global { // 熱重載避免重複實例
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma ?? new PrismaClient({ log: ["error", "warn"] })
if (process.env.NODE_ENV !== "production") global.prisma = prisma
