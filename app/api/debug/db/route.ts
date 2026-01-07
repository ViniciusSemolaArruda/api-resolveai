import { prisma } from "../../../../lib/prisma"

type DbResult = {
  db: string | null
}

export async function GET() {
  const result = await prisma.$queryRawUnsafe<DbResult[]>(
    "select current_database() as db"
  )

  return Response.json({ db: result?.[0]?.db ?? null })
}
