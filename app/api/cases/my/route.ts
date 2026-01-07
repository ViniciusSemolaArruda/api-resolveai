// app/api/cases/my/route.ts
import { NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { verifyToken } from "../../../../lib/auth"

export const runtime = "nodejs"

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() ?? null
}

async function getAuthUser(req: Request) {
  const token = getBearerToken(req)
  if (!token) return null

  try {
    const { userId } = await verifyToken(token)

    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true, name: true },
    })
  } catch (err) {
    console.error("verifyToken error (GET /api/cases/my):", err)
    return null
  }
}

/**
 * ✅ GET /api/cases/my
 * - Lista somente ocorrências do usuário logado
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const items = await prisma.case.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        photos: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    return NextResponse.json(items, { status: 200 })
  } catch (err) {
    console.error("GET /api/cases/my error:", err)
    return NextResponse.json({ error: "Erro ao listar minhas ocorrências" }, { status: 500 })
  }
}
