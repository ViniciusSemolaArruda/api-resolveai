// lib/prisma.ts
import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"

// ✅ Neon Serverless: use fetch/HTTP (evita websocket)
neonConfig.poolQueryViaFetch = true

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL não definido no ambiente")
}

// ✅ Singleton no dev (evita várias conexões no hot-reload)
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const adapter = new PrismaNeon({ connectionString })

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // log: ["query", "info", "warn", "error"], // se quiser debug
    log: ["warn", "error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
