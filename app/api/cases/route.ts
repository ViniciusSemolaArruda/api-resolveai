// app/api/cases/route.ts
import { NextResponse } from "next/server"
import Decimal from "decimal.js"

import { prisma } from "lib/prisma"
import { getAuthPrincipal, ALLOWED_CATEGORIES } from "lib/auth"

export const runtime = "nodejs"

const ALLOWED = ALLOWED_CATEGORIES
type AllowedCategory = (typeof ALLOWED)[number]

function toDecimal(v: unknown) {
  if (v === null || v === undefined || v === "") return undefined
  const n = typeof v === "string" ? Number(v.trim().replace(",", ".")) : Number(v)
  if (!Number.isFinite(n)) return undefined
  return new Decimal(n)
}

export async function GET(req: Request) {
  try {
    const principal = await getAuthPrincipal(req)
    if (!principal) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    // ✅ ADMIN vê tudo
    // ✅ EMPLOYEE vê somente a categoria do cargo dele
    const where =
      principal.kind === "employee"
        ? { category: principal.employeeRole }
        : principal.role === "ADMIN"
          ? {}
          : // se quiser, USER não pode listar tudo
            null

    if (where === null) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const items = await prisma.case.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        photos: { orderBy: { createdAt: "desc" }, take: 1 },
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(items, { status: 200 })
  } catch (err) {
    console.error("GET /api/cases error:", err)
    return NextResponse.json({ error: "Erro ao listar ocorrências" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const principal = await getAuthPrincipal(req)
    if (!principal) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    // ✅ somente usuário (cidadão) cria caso
    if (principal.kind === "employee") {
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

    if (!ALLOWED.includes(category)) {
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
        userId: principal.id,
        ...(photoUrl ? { photos: { create: { url: photoUrl, kind: "REPORT" } } } : {}),
      },
      include: {
        photos: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err: unknown) {
    console.error("POST /api/cases error:", err)
    return NextResponse.json({ error: "Erro ao criar ocorrência" }, { status: 500 })
  }
}
