// app/api/cases/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { getAuthActor, allowedCategoriesForEmployee, type AllowedCategory } from "../../../../lib/auth"

export const runtime = "nodejs"

/**
 * ✅ GET /api/cases/[id]
 * - ADMIN (user ADMIN): tudo
 * - EMPLOYEE: somente se categoria do case estiver no cargo
 * - USER: dono do case (opcional) -> aqui eu deixei habilitado, é seguro.
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAuthActor(req)
    if (!actor) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { id } = await context.params
    const caseId = id?.trim()

    if (!caseId) {
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

    // ✅ ADMIN vê tudo
    const isAdmin = actor.kind === "USER" && actor.role === "ADMIN"
    if (isAdmin) return NextResponse.json(found, { status: 200 })

    // ✅ EMPLOYEE: checa categoria permitida
    if (actor.kind === "EMPLOYEE") {
      const allowed = allowedCategoriesForEmployee(actor.employeeRole)
      const ok = allowed.includes(found.category as AllowedCategory)
      if (!ok) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
      return NextResponse.json(found, { status: 200 })
    }

    // ✅ USER: permite ver só se for dono
    const isOwner = actor.kind === "USER" && found.userId === actor.id
    if (!isOwner) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    return NextResponse.json(found, { status: 200 })
  } catch (err) {
    console.error("GET /api/cases/[id] error:", err)
    return NextResponse.json({ error: "Erro ao buscar ocorrência" }, { status: 500 })
  }
}
