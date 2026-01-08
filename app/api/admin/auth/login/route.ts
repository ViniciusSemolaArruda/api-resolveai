// app/api/admin/auth/login/route.ts
import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { prisma } from "lib/prisma"
import { signToken } from "lib/jwt/admin"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const email = String(body?.email ?? "").trim().toLowerCase()
    const password = String(body?.password ?? "")

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha obrigatórios" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, passwordHash: true, name: true },
    })

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    if (!user.passwordHash) {
      return NextResponse.json({ error: "Usuário sem senha cadastrada" }, { status: 401 })
    }

    const ok = await compare(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    // ✅ token assinado (seu helper)
    const token = await signToken({ userId: user.id })

    // ✅ Retorna token + user (pra salvar no localStorage e usar Bearer quando precisar)
    const res = NextResponse.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name ?? "Administrador",
        email: user.email,
        role: user.role,
      },
    })

    // ✅ Cookie pro middleware proteger /admin
    res.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    })

    return res
  } catch {
    return NextResponse.json({ error: "Erro ao logar" }, { status: 500 })
  }
}
