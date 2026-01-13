// app/api/cases/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { verifyToken, type EmployeeRole, type JwtRole } from "../../../../lib/auth"

export const runtime = "nodejs"

/* =========================
   Categorias permitidas
========================= */
const ALLOWED_CATEGORIES = [
  "ILUMINACAO_PUBLICA",
  "BURACO_NA_VIA",
  "COLETA_DE_LIXO",
  "OBSTRUCAO_DE_CALCADA",
  "VAZAMENTO_DE_AGUA",
  "OUTROS",
] as const

type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number]

/* =========================
   Mapa cargo -> categorias
   (igual ao /api/cases)
========================= */
const EMPLOYEE_PERMS: Record<EmployeeRole, AllowedCategory[]> = {
  ILUMINACAO: ["ILUMINACAO_PUBLICA"],
  BURACOS: ["BURACO_NA_VIA"],
  LIXO: ["COLETA_DE_LIXO"],

  // exemplo: fiscal pega várias
  FISCALIZACAO: ["OBSTRUCAO_DE_CALCADA", "VAZAMENTO_DE_AGUA", "OUTROS"],

  // se alguém tiver employeeRole ADMIN por algum motivo, deixa ver tudo
  ADMIN: [...ALLOWED_CATEGORIES],
}

/* =========================
   Helpers
========================= */
function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() ?? null
}

async function getAuthUser(req: Request) {
  const token = getBearerToken(req)
  if (!token) return null

  try {
    // ✅ pega role e employeeRole do token (como no /api/cases)
    const { userId, role, employeeRole } = await verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
      },
    })

    if (!user) return null

    return {
      id: user.id,
      role: (user.role as JwtRole) ?? (role as JwtRole),
      employeeRole: (employeeRole ?? null) as EmployeeRole | null,
    }
  } catch (err) {
    console.error("verifyToken error:", err)
    return null
  }
}

/**
 * ✅ GET /api/cases/[id]
 * - DONO do caso (USER)
 * - ADMIN (tudo)
 * - EMPLOYEE (somente se categoria do case estiver no cargo)
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    // 🔥 NEXT 16 → params é Promise
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

    // ✅ autorização: dono / admin / employee permitido
    const isOwner = found.userId === user.id
    const isAdmin = user.role === "ADMIN"

    const isEmployeeAllowed =
      user.role === "EMPLOYEE" &&
      !!user.employeeRole &&
      (EMPLOYEE_PERMS[user.employeeRole] ?? []).includes(found.category as AllowedCategory)

    if (!isOwner && !isAdmin && !isEmployeeAllowed) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    return NextResponse.json(found, { status: 200 })
  } catch (err) {
    console.error("GET /api/cases/[id] error:", err)
    return NextResponse.json({ error: "Erro ao buscar ocorrência" }, { status: 500 })
  }
}
