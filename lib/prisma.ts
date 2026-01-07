// lib/prisma.ts
import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"

// ✅ Vercel-friendly (evita websocket)
neonConfig.poolQueryViaFetch = true

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL não definido no ambiente")
}

// ✅ Adapter espera PoolConfig (connectionString) nesse seu setup
const adapter = new PrismaNeon({ connectionString: DATABASE_URL })

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["warn", "error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
