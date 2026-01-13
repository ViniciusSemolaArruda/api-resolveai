// app/api/cases/route.ts
import { NextResponse } from "next/server"
import Decimal from "decimal.js"
import { prisma } from "lib/prisma"
import { verifyToken, type JwtRole, type EmployeeRole } from "lib/auth"

export const runtime = "nodejs"

/* =========================
   Categorias
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
========================= */
const EMPLOYEE_PERMS: Record<EmployeeRole, AllowedCategory[]> = {
  ILUMINACAO: ["ILUMINACAO_PUBLICA"],
  BURACOS: ["BURACO_NA_VIA"],
  LIXO: ["COLETA_DE_LIXO"],
  FISCALIZACAO: ["OBSTRUCAO_DE_CALCADA", "VAZAMENTO_DE_AGUA", "OUTROS"],
  ADMIN: [...ALLOWED_CATEGORIES],
}

/* =========================
   Helpers
========================= */
function toDecimal(v: unknown) {
  if (v === null || v === undefined || v === "") return undefined
  const n = typeof v === "string" ? Number(v.trim().replace(",", ".")) : Number(v)
  if (!Number.isFinite(n)) return undefined
  return new Decimal(n)
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() ?? null
}

type TokenDecoded = {
  userId?: string
  employeeId?: string
  role?: JwtRole
  employeeRole?: EmployeeRole | null
}

/**
 * ✅ Agora suporta token de USER/ADMIN (userId) e token de EMPLOYEE (employeeId)
 * Retorna um "actor" com infos suficientes sem quebrar o que já funciona.
 */
async function getAuthActor(req: Request) {
  const token = getBearerToken(req)
  if (!token) return null

  try {
    const decoded = (await verifyToken(token)) as TokenDecoded

    // ====== USER/ADMIN token ======
    if (decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, email: true, name: true },
      })
      if (!user) return null

      return {
        kind: "user" as const,
        id: user.id,
        role: (user.role as JwtRole) ?? (decoded.role as JwtRole),
        employeeRole: (decoded.employeeRole ?? null) as EmployeeRole | null,
        email: user.email,
        name: user.name,
      }
    }

    // ====== EMPLOYEE token ======
    if (decoded.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: decoded.employeeId },
        select: { id: true, isActive: true, role: true, name: true },
      })
      if (!employee || !employee.isActive) return null

      return {
        kind: "employee" as const,
        id: employee.id,
        role: "EMPLOYEE" as JwtRole,
        employeeRole: (employee.role as EmployeeRole) ?? (decoded.employeeRole ?? null),
        email: null as string | null,
        name: employee.name,
      }
    }

    return null
  } catch (err) {
    console.error("verifyToken failed:", err)
    return null
  }
}

function getErrorInfo(err: unknown): { message?: string; code?: string } {
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; code?: unknown }
    return {
      message: typeof e.message === "string" ? e.message : undefined,
      code: typeof e.code === "string" ? e.code : undefined,
    }
  }
  return {}
}

/* =========================
   GET /api/cases
   ADMIN: tudo
   EMPLOYEE: filtrado por cargo
   USER: 403 (como era)
========================= */
export async function GET(req: Request) {
  try {
    const actor = await getAuthActor(req)
    if (!actor) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    // ✅ ADMIN vê tudo
    if (actor.role === "ADMIN") {
      const items = await prisma.case.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          photos: { orderBy: { createdAt: "desc" }, take: 1 },
          user: { select: { id: true, name: true, email: true } },
        },
      })
      return NextResponse.json(items, { status: 200 })
    }

    // ✅ EMPLOYEE vê só o permitido pelo cargo
    if (actor.role === "EMPLOYEE") {
      const empRole = actor.employeeRole

      if (!empRole) {
        return NextResponse.json({ error: "Funcionário sem cargo definido" }, { status: 403 })
      }

      const allowed = EMPLOYEE_PERMS[empRole]
      if (!allowed || allowed.length === 0) {
        return NextResponse.json({ error: "Cargo sem permissões" }, { status: 403 })
      }

      const items = await prisma.case.findMany({
        where: { category: { in: allowed } },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          photos: { orderBy: { createdAt: "desc" }, take: 1 },
          user: { select: { id: true, name: true, email: true } },
        },
      })

      return NextResponse.json(items, { status: 200 })
    }

    // ✅ USER continua sem acesso (não quebra)
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  } catch (err) {
    console.error("GET /api/cases error:", err)
    return NextResponse.json({ error: "Erro ao listar ocorrências" }, { status: 500 })
  }
}

/* =========================
   POST /api/cases
   ✅ Mantém funcionando para USER/ADMIN
   ❌ EMPLOYEE não cria (evita quebrar: case.userId precisa de user)
========================= */
export async function POST(req: Request) {
  try {
    const actor = await getAuthActor(req)
    if (!actor) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    if (actor.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Funcionário não pode criar ocorrência" }, { status: 403 })
    }

    const body: unknown = await req.json()
    const b = (body ?? {}) as Record<string, unknown>

    const category = String(b.category ?? "").trim() as AllowedCategory
    const description = String(b.description ?? "").trim()
    const address = String(b.address ?? "").trim()
    const photoUrl = b.photoUrl ? String(b.photoUrl).trim() : null

    if (!category || !description || !address) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes (category, description, address)" },
        { status: 400 }
      )
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Categoria inválida" }, { status: 400 })
    }

    const protocol = `EPF-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const created = await prisma.case.create({
      data: {
        title: category,
        protocol,
        category,
        status: "RECEBIDA",
        description,
        address,
        latitude: toDecimal(b.latitude),
        longitude: toDecimal(b.longitude),
        userId: actor.id, // ✅ aqui é USER/ADMIN id
        ...(photoUrl ? { photos: { create: { url: photoUrl, kind: "REPORT" } } } : {}),
      },
      include: {
        photos: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err: unknown) {
    console.error("POST /api/cases error:", err)
    const info = getErrorInfo(err)
    return NextResponse.json({ error: "Erro ao criar ocorrência", ...info }, { status: 500 })
  }
}
