//app\api\auth\me\route.ts
import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { prisma } from "../../../../lib/prisma"

export const runtime = "nodejs"

function getJwtSecret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error("JWT_SECRET ausente no .env.local")
  return new TextEncoder().encode(s)
}

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1] ?? null
}

export async function GET(req: Request) {
  try {
    const token = getBearer(req)
    if (!token) return NextResponse.json({ error: "Sem token" }, { status: 401 })

    const { payload } = await jwtVerify(token, getJwtSecret())
    const userId = String(payload.sub || "")

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) return NextResponse.json({ error: "Usuário não existe" }, { status: 401 })

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 })
  }
}
