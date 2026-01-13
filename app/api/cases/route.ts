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
   (ajuste como quiser)
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

async function getAuthUser(req: Request) {
  const token = getBearerToken(req)
  if (!token) return null

  try {
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
      email: user.email,
      name: user.name,
    }
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
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    // ✅ ADMIN vê tudo (igual antes)
    if (user.role === "ADMIN") {
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

    // ✅ EMPLOYEE vê só a categoria do cargo
    if (user.role === "EMPLOYEE") {
      const empRole = user.employeeRole

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

    // ✅ USER continua sem acesso (não quebra o fluxo atual)
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  } catch (err) {
    console.error("GET /api/cases error:", err)
    return NextResponse.json({ error: "Erro ao listar ocorrências" }, { status: 500 })
  }
}

/* =========================
   POST /api/cases
   (mantém como estava: qualquer logado cria)
========================= */
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

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
        userId: user.id,
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
