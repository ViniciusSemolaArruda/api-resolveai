// app/api/cases/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import type { CaseStatus, CaseCategory, EmployeeRole } from "@prisma/client"
import { getAuthActor, isAdminActor, allowedCategoriesForEmployee } from "../../../../lib/auth"

export const runtime = "nodejs"

function isAllowedToSeeCase(actor: Awaited<ReturnType<typeof getAuthActor>>, foundCategory: CaseCategory, ownerId: string | null) {
  if (!actor) return false

  // ADMIN vê tudo
  if (isAdminActor(actor)) return true

  // USER dono do caso
  if (actor.kind === "USER") return ownerId && actor.id === ownerId

  // EMPLOYEE só categoria do cargo
  const allowed = allowedCategoriesForEmployee(actor.employeeRole)
  return allowed.includes(foundCategory)
}

/**
 * ✅ GET /api/cases/[id]
 * - DONO (USER)
 * - ADMIN
 * - EMPLOYEE (categoria permitida)
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAuthActor(req)
    if (!actor) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const { id } = await context.params
    const caseId = String(id ?? "").trim()
    if (!caseId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    const found = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        photos: { orderBy: { createdAt: "desc" } },
        events: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!found) return NextResponse.json({ error: "Ocorrência não encontrada" }, { status: 404 })

    const ok = isAllowedToSeeCase(actor, found.category, found.userId ?? null)
    if (!ok) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    return NextResponse.json(found, { status: 200 })
  } catch (err) {
    console.error("GET /api/cases/[id] error:", err)
    return NextResponse.json({ error: "Erro ao buscar ocorrência" }, { status: 500 })
  }
}

/**
 * ✅ PATCH /api/cases/[id]
 * - ADMIN pode tudo
 * - EMPLOYEE pode atualizar casos da própria categoria
 * Atualiza:
 * - status (opcional)
 * - description (opcional)
 * Cria histórico:
 * - CaseEvent (sempre)
 * E se vier photoUrl:
 * - CasePhoto kind=UPDATE
 */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAuthActor(req)
    if (!actor) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const { id } = await context.params
    const caseId = String(id ?? "").trim()
    if (!caseId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    const body = (await req.json().catch(() => null)) as
      | {
          status?: CaseStatus | string
          description?: string
          message?: string
          photoUrl?: string | null
        }
      | null

    if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 })

    const found = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, category: true, userId: true, status: true, description: true },
    })

    if (!found) return NextResponse.json({ error: "Ocorrência não encontrada" }, { status: 404 })

    // permissão
    const can = isAllowedToSeeCase(actor, found.category, found.userId ?? null)
    if (!can) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    // normaliza status
    const rawStatus = String(body.status ?? "").trim().toUpperCase()
    const nextStatus =
      rawStatus === "RECEBIDA" ||
      rawStatus === "EM_ANDAMENTO" ||
      rawStatus === "AGUARDANDO_ATUALIZACAO" ||
      rawStatus === "CONCLUIDA"
        ? (rawStatus as CaseStatus)
        : undefined

    const nextDescription = typeof body.description === "string" ? body.description.trim() : undefined
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const photoUrl = body.photoUrl ? String(body.photoUrl).trim() : null

    if (!nextStatus && !nextDescription && !photoUrl && !message) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 })
    }

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: {
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(typeof nextDescription === "string" && nextDescription.length > 0
          ? { description: nextDescription }
          : {}),
        // cria foto UPDATE se veio photoUrl
        ...(photoUrl
          ? {
              photos: {
                create: { url: photoUrl, kind: "UPDATE" },
              },
            }
          : {}),
        // cria evento sempre que patch ocorrer
        events: {
          create: {
            status: (nextStatus ?? found.status) as CaseStatus,
            message: message || null,
            photoUrl: photoUrl || null,

            authorId: actor.kind === "USER" ? actor.id : null,
            employeeId: actor.kind === "EMPLOYEE" ? actor.id : null,
          },
        },
      },
      include: {
        photos: { orderBy: { createdAt: "desc" } },
        events: { orderBy: { createdAt: "asc" } },
      },
    })

    return NextResponse.json({ ok: true, case: updated }, { status: 200 })
  } catch (err) {
    console.error("PATCH /api/cases/[id] error:", err)
    return NextResponse.json({ error: "Erro ao atualizar ocorrência" }, { status: 500 })
  }
}
