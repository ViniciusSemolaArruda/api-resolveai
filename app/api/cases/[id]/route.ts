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
    console.error("verifyToken error:", err)
    return null
  }
}

/**
 * ✅ GET /api/cases/[id]
 * - Dono do caso ou ADMIN
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    // 🔥 NEXT 16 → params É PROMISE
    const { id } = await context.params
    const caseId = id?.trim()

    if (!caseId) {
      console.log("ID NÃO RECEBIDO NO BACKEND")
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const found = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        photos: { orderBy: { createdAt: "desc" } },
        events: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!found) {
      return NextResponse.json({ error: "Ocorrência não encontrada" }, { status: 404 })
    }

    // ✅ autorização
    const isOwner = found.userId === user.id
    const isAdmin = user.role === "ADMIN"

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    return NextResponse.json(found, { status: 200 })
  } catch (err) {
    console.error("GET /api/cases/[id] error:", err)
    return NextResponse.json({ error: "Erro ao buscar ocorrência" }, { status: 500 })
  }
}
