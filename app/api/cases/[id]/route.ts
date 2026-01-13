// app/api/cases/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { verifyToken } from "../../../../lib/auth"
import { CaseStatus } from "@prisma/client"

export const runtime = "nodejs"

/* ================= Types ================= */

type RouteContext = { params: Promise<{ id: string }> }

type JwtUserPayload = { userId: string }
type JwtEmployeePayload = { employeeId: string }
type JwtPayload = JwtUserPayload | JwtEmployeePayload

function isEmployeePayload(p: JwtPayload): p is JwtEmployeePayload {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return "employeeId" in p && typeof (p as any).employeeId === "string" && (p as any).employeeId.length > 0
}

function isUserPayload(p: JwtPayload): p is JwtUserPayload {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return "userId" in p && typeof (p as any).userId === "string" && (p as any).userId.length > 0
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() ?? null
}

async function getAuthUser(req: Request) {
  const token = getBearerToken(req)
  if (!token) return null

  try {
    const payload = (await verifyToken(token)) as JwtPayload
    if (!isUserPayload(payload)) return null

    return prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, email: true, name: true },
    })
  } catch (err) {
    console.error("verifyToken error:", err)
    return null
  }
}

/**
 * ✅ aceita status em:
 * - "RECEBIDA", "EM_ANDAMENTO", "AGUARDANDO_ATUALIZACAO", "CONCLUIDA"
 * - "received", "progress", "done" (do app)
 */
function parseStatus(input: unknown): CaseStatus | null {
  const s = String(input ?? "").trim().toUpperCase()

  // Do app (não quebra o que já funcionava)
  if (s === "RECEIVED") return CaseStatus.RECEBIDA
  if (s === "PROGRESS") return CaseStatus.EM_ANDAMENTO
  if (s === "DONE") return CaseStatus.CONCLUIDA

  // Do backend / Prisma
  if (s === "RECEBIDA") return CaseStatus.RECEBIDA
  if (s === "EM_ANDAMENTO") return CaseStatus.EM_ANDAMENTO
  if (s === "AGUARDANDO_ATUALIZACAO") return CaseStatus.AGUARDANDO_ATUALIZACAO
  if (s === "CONCLUIDA") return CaseStatus.CONCLUIDA

  return null
}

/**
 * ✅ GET /api/cases/[id]
 * - Dono do caso ou ADMIN
 */
export async function GET(req: Request, context: RouteContext) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
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

/**
 * ✅ PATCH /api/cases/[id]
 * - FUNCIONÁRIO (como já era) OU ADMIN
 * - Atualiza status + cria CaseEvent
 * - Regras (mantidas):
 *   - EM_ANDAMENTO: pode message, NÃO pode photoUrl
 *   - CONCLUIDA: photoUrl OBRIGATÓRIO
 */
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const token = getBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const payload = (await verifyToken(token)) as JwtPayload

    // ✅ mantém funcionário funcionando e adiciona admin
    const actor = {
      kind: "unknown" as "employee" | "admin" | "unknown",
      employeeId: null as string | null,
      userId: null as string | null,
    }

    if (isEmployeePayload(payload)) {
      const employee = await prisma.employee.findUnique({
        where: { id: payload.employeeId },
        select: { id: true, isActive: true },
      })

      if (!employee || !employee.isActive) {
        return NextResponse.json({ error: "Funcionário inválido/inativo" }, { status: 403 })
      }

      actor.kind = "employee"
      actor.employeeId = employee.id
    } else if (isUserPayload(payload)) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true },
      })

      if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Apenas ADMIN ou funcionário pode atualizar" }, { status: 403 })
      }

      actor.kind = "admin"
      actor.userId = user.id
    } else {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { id } = await context.params
    const caseId = id?.trim()
    if (!caseId) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    // ✅ seu handler lê JSON — mantém isso pra não quebrar
    const bodyUnknown: unknown = await req.json().catch(() => ({}))
    const body =
      (typeof bodyUnknown === "object" && bodyUnknown !== null ? bodyUnknown : {}) as Record<string, unknown>

    const nextStatus = parseStatus(body.status)
    const message = typeof body.message === "string" ? body.message.trim() : null
    const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl.trim() : null

    if (!nextStatus) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 })
    }

    // ✅ regras de imagem (mantidas)
    if (nextStatus === CaseStatus.EM_ANDAMENTO && photoUrl) {
      return NextResponse.json({ error: "Imagem não permitida em andamento" }, { status: 400 })
    }
    if (nextStatus === CaseStatus.CONCLUIDA && !photoUrl) {
      return NextResponse.json({ error: "Imagem obrigatória para concluir" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedCase = await tx.case.update({
        where: { id: caseId },
        data: { status: nextStatus },
      })

      // ✅ mantém employeeId como antes
      // (se você quiser rastrear admin também, depois a gente adiciona userId no CaseEvent)
      const event = await tx.caseEvent.create({
        data: {
          caseId,
          status: nextStatus,
          message,
          photoUrl,
          employeeId: actor.kind === "employee" ? actor.employeeId : null,
        },
      })

      if (nextStatus === CaseStatus.CONCLUIDA && photoUrl) {
        await tx.casePhoto.create({
          data: {
            caseId,
            url: photoUrl,
            kind: "UPDATE",
          },
        })
      }

      return { updatedCase, event }
    })

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error("PATCH /api/cases/[id] error:", err)
    return NextResponse.json({ error: "Erro ao atualizar ocorrência" }, { status: 500 })
  }
}
