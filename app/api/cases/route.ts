// app/api/cases/route.ts
import { NextResponse } from "next/server"
import Decimal from "decimal.js"
import { prisma } from "../../../lib/prisma"
import { getAuthActor, allowedCategoriesForEmployee, type AllowedCategory } from "../../../lib/auth"

export const runtime = "nodejs"

/* =========================
   Categorias
========================= */
const ALLOWED_CATEGORIES: AllowedCategory[] = [
  "ILUMINACAO_PUBLICA",
  "BURACO_NA_VIA",
  "COLETA_DE_LIXO",
  "OBSTRUCAO_DE_CALCADA",
  "VAZAMENTO_DE_AGUA",
  "OUTROS",
]

/* =========================
   Helpers
========================= */
function toDecimal(v: unknown) {
  if (v === null || v === undefined || v === "") return undefined
  const n = typeof v === "string" ? Number(v.trim().replace(",", ".")) : Number(v)
  if (!Number.isFinite(n)) return undefined
  return new Decimal(n)
}

/* =========================
   GET /api/cases
   ADMIN (user ADMIN): tudo
   EMPLOYEE: filtrado por cargo
   USER: 403 (mantém)
========================= */
export async function GET(req: Request) {
  try {
    const actor = await getAuthActor(req)
    if (!actor) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const baseInclude = {
      // ✅ aqui está a correção:
      // Sempre trazer a foto ORIGINAL do usuário (REPORT) para a coluna "Foto"
      photos: {
        where: { kind: "REPORT" as const },
        orderBy: { createdAt: "desc" as const },
        take: 1,
      },

      user: { select: { id: true, name: true, email: true } },

      // ✅ atualizações (inclui foto do funcionário via events.photoUrl)
      events: {
        orderBy: { createdAt: "desc" as const },
        take: 10,
        include: {
          employee: { select: { id: true, employeeCode: true, name: true, role: true } },
          author: { select: { id: true, name: true, email: true } },
        },
      },
    }

    // ✅ ADMIN (user ADMIN) vê tudo
    if (actor.kind === "USER" && actor.role === "ADMIN") {
      const items = await prisma.case.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: baseInclude,
      })

      return NextResponse.json(items, { status: 200 })
    }

    // ✅ EMPLOYEE vê só categorias permitidas
    if (actor.kind === "EMPLOYEE") {
      const allowed = allowedCategoriesForEmployee(actor.employeeRole)
      if (!allowed.length) {
        return NextResponse.json({ error: "Cargo sem permissões" }, { status: 403 })
      }

      const items = await prisma.case.findMany({
        where: { category: { in: allowed } },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: baseInclude,
      })

      return NextResponse.json(items, { status: 200 })
    }

    // ✅ USER continua sem acesso
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  } catch (err) {
    console.error("GET /api/cases error:", err)
    return NextResponse.json({ error: "Erro ao listar ocorrências" }, { status: 500 })
  }
}

/* =========================
   POST /api/cases
========================= */
export async function POST(req: Request) {
  try {
    const actor = await getAuthActor(req)
    if (!actor) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    if (actor.kind === "EMPLOYEE") {
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
        userId: actor.id,
        ...(photoUrl ? { photos: { create: { url: photoUrl, kind: "REPORT" } } } : {}),
      },
      include: {
        // ✅ mantém só a foto do REPORT aqui também (fica consistente)
        photos: {
          where: { kind: "REPORT" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error("POST /api/cases error:", err)
    return NextResponse.json({ error: "Erro ao criar ocorrência" }, { status: 500 })
  }
}
