// app/api/auth/me/route.ts
import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { prisma } from "../../../../lib/prisma"

export const runtime = "nodejs"

function getJwtSecret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error("JWT_SECRET ausente no ambiente")
  return new TextEncoder().encode(s)
}

function cleanToken(raw: string) {
  let t = (raw ?? "").trim()

  // remove aspas se veio stringificada
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim()
  }

  // se alguém mandou "Bearer xxx" por engano
  t = t.replace(/^Bearer\s+/i, "").trim()

  return t
}

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]?.trim()
  return token ? cleanToken(token) : null
}

export async function GET(req: Request) {
  try {
    const token = getBearer(req)
    if (!token) {
      return NextResponse.json(
        {
          error: "Sem token",
          hasAuthHeader: !!(req.headers.get("authorization") || req.headers.get("Authorization")),
        },
        { status: 401 }
      )
    }

    const { payload } = await jwtVerify(token, getJwtSecret())
    const userId = String(payload.sub || "").trim()

    if (!userId) {
      return NextResponse.json({ error: "Token sem sub (userId)" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) {
      return NextResponse.json(
        {
          error: "Usuário não existe (id do token não está no banco)",
          userIdFromToken: userId,
        },
        { status: 401 }
      )
    }

    return NextResponse.json({ ok: true, user }, { status: 200 })
    } catch (err: unknown) {
    console.error("ME verify failed:", err)

    let reason = "unknown"
    if (err instanceof Error) {
      reason = err.message
    } else if (typeof err === "string") {
      reason = err
    } else if (err && typeof err === "object") {
      const e = err as { code?: unknown; name?: unknown; message?: unknown }
      reason =
        (typeof e.code === "string" && e.code) ||
        (typeof e.name === "string" && e.name) ||
        (typeof e.message === "string" && e.message) ||
        "unknown"
    }

    return NextResponse.json(
      {
        error: "Token inválido",
        reason,
      },
      { status: 401 }
    )
  }
}