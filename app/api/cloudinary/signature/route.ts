import crypto from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { verifyToken } from "../../../../lib/auth"

export const runtime = "nodejs"

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() ?? null
}

type TokenPayload = {
  userId?: string
  employeeId?: string
  employeeCode?: number
  role?: string
}

function isTokenPayload(v: unknown): v is TokenPayload {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>

  const okUserId = o.userId === undefined || typeof o.userId === "string"
  const okEmpId = o.employeeId === undefined || typeof o.employeeId === "string"
  const okRole = o.role === undefined || typeof o.role === "string"
  const okEmpCode = o.employeeCode === undefined || typeof o.employeeCode === "number"

  return okUserId && okEmpId && okRole && okEmpCode
}

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const raw = (await verifyToken(token)) as unknown
    if (!isTokenPayload(raw)) {
      return NextResponse.json({ error: "Token inválido (payload inesperado)" }, { status: 401 })
    }

    const userId = raw.userId ?? null
    const employeeId = raw.employeeId ?? null
    const employeeCode = raw.employeeCode ?? null

    // ✅ resolve ator (User ou Employee)
    let actorFolder: string | null = null

    // 1) se veio employeeId, usa direto
    if (employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true },
      })
      if (!emp) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 401 })
      actorFolder = `employee-${emp.id}`
    }

    // 2) se veio userId, tenta User; se não existir, tenta Employee pelo mesmo id
    if (!actorFolder && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      })

      if (user) {
        actorFolder = `user-${user.id}`
      } else {
        const empById = await prisma.employee.findUnique({
          where: { id: userId },
          select: { id: true },
        })
        if (empById) actorFolder = `employee-${empById.id}`
      }
    }

    // 3) fallback por employeeCode (sem exigir unique no schema)
    if (!actorFolder && typeof employeeCode === "number") {
      const empByCode = await prisma.employee.findFirst({
        where: { employeeCode },
        select: { id: true },
      })
      if (empByCode) actorFolder = `employee-${empByCode.id}`
    }

    if (!actorFolder) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    const baseFolder = process.env.CLOUDINARY_FOLDER || "resolve-ai/cases"
    const folder = `${baseFolder}/${actorFolder}`

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          error: "Cloudinary env missing",
          cloudName: !!cloudName,
          apiKey: !!apiKey,
          apiSecret: !!apiSecret,
        },
        { status: 500 }
      )
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`

    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + apiSecret)
      .digest("hex")

    return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature })
  } catch (e) {
    console.error("GET /api/cloudinary/signature error:", e)
    return NextResponse.json({ error: "Erro ao gerar assinatura" }, { status: 500 })
  }
}
