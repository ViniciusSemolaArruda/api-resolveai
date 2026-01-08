// lib/prisma.ts
import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"

// ✅ Prisma precisa rodar em runtime Node.js (não Edge)
// (isso é para lembrar: nas rotas use `export const runtime = "nodejs"` quando necessário)

// ✅ Vercel-friendly (evita websocket)
neonConfig.poolQueryViaFetch = true

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL não definido no ambiente")
}

// ✅ Adapter Neon: usa connectionString nesse setup
const adapter = new PrismaNeon({ connectionString: DATABASE_URL })

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log: ["warn", "error"],
  })

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma
