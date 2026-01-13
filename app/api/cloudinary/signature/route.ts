// app/api/cloudinary/signature/route.ts
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
  role?: string
}

/** type guard */
function isTokenPayload(v: unknown): v is TokenPayload {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>

  const okUserId = o.userId === undefined || typeof o.userId === "string"
  const okEmpId = o.employeeId === undefined || typeof o.employeeId === "string"
  const okRole = o.role === undefined || typeof o.role === "string"

  return okUserId && okEmpId && okRole
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
    const role = (raw.role ?? "").toUpperCase()

    // ✅ valida ator (User ou Employee)
    let actorFolder: string

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      })
      if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 })
      actorFolder = `user-${user.id}`
    } else if (employeeId) {
      // ✅ opcional: trava por role (se você tiver isso no token)
      // if (role && role !== "EMPLOYEE" && role !== "ADMIN") {
      //   return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
      // }

      // ⚠️ ajuste o model caso não seja "employee"
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true },
      })
      if (!employee)
        return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 401 })
      actorFolder = `employee-${employee.id}`
    } else {
      return NextResponse.json({ error: "Token sem identidade (userId/employeeId)" }, { status: 401 })
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

    // ⚠️ deve bater com o upload no app
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`

    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + apiSecret)
      .digest("hex")

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    })
  } catch (e) {
    console.error("GET /api/cloudinary/signature error:", e)
    return NextResponse.json({ error: "Erro ao gerar assinatura" }, { status: 500 })
  }
}
